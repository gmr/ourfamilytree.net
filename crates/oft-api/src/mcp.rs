//! MCP server: the administrators' only way to change research (PRD §4 through MCP).
//! Every write runs in a transaction, writes the audit log and refreshes the public data.js.

use http::request::Parts;
use oft_db::sqlx::PgConnection;
use oft_domain::research::{FamilyGroup, Member, Profile};
use oft_domain::{Confidence, cut, living_person_risk, words};
use rmcp::{
    ErrorData, ServerHandler,
    handler::server::{tool::Extension, wrapper::Parameters},
    model::*,
    schemars::{self, JsonSchema},
    service::RequestContext,
    tool, tool_handler, tool_router,
};
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::{AppState, auth::AuthUser};

const PREVIEW_URI: &str = "ui://ourfamilytree/preview.html";
const APP_MIME: &str = "text/html;profile=mcp-app";

#[derive(Clone)]
pub struct Mcp {
    st: AppState,
}

type R = Result<CallToolResult, ErrorData>;

fn fail(msg: impl Into<String>) -> R {
    Ok(CallToolResult::error(vec![ContentBlock::text(msg.into())]))
}

fn ok(v: Value) -> R {
    Ok(CallToolResult::structured(v))
}

fn internal(e: impl std::fmt::Display) -> ErrorData {
    tracing::error!("mcp: {e}");
    ErrorData::internal_error(e.to_string(), None)
}

fn who(parts: &Parts) -> Result<oft_db::User, ErrorData> {
    parts
        .extensions
        .get::<AuthUser>()
        .map(|u| u.0.clone())
        .ok_or_else(|| ErrorData::invalid_request("not signed in", None))
}

fn parse_id(s: &str, what: &str) -> Result<Uuid, String> {
    Uuid::parse_str(s.trim()).map_err(|_| format!("{what} must be a UUID (got {s:?})"))
}

// ---------- parameters ----------

#[derive(Deserialize, JsonSchema)]
pub struct SearchReq {
    /// Words that must all appear (any order, punctuation ignored), e.g. "elias caldwell".
    #[serde(default)]
    query: String,
    year_from: Option<i32>,
    year_to: Option<i32>,
    /// Record types: Land, Tax, Census, Military, Court, B/M/D, Misc.
    #[serde(default)]
    types: Vec<String>,
    /// Text in the place or the municipality section, e.g. "Caldwell".
    place: Option<String>,
    /// "assigned", "unassigned" or "all" (default).
    assignment: Option<String>,
    /// Default 50, at most 200.
    limit: Option<i64>,
    offset: Option<i64>,
}

#[derive(Deserialize, JsonSchema)]
pub struct IdReq {
    /// UUID (records also accept the page's legacy id such as "rdb3e7b5b7c1972af").
    id: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct ProfileReq {
    /// Omit to create a new profile.
    id: Option<String>,
    full_name: Option<String>,
    spelling_variants: Option<Vec<String>>,
    /// Free text, e.g. "b. c1757; d. c1833".
    birth_death_dates: Option<String>,
    locations: Option<Vec<String>>,
    bio_summary: Option<String>,
    /// "general" (default), "project" or "own_line".
    research_scope: Option<String>,
    /// Set true only after the user confirms the person is not living (dates after 1900).
    #[serde(default)]
    confirm_not_living: bool,
}

#[derive(Deserialize, JsonSchema)]
pub struct DeleteReq {
    id: String,
    /// Must be true. Ask the user first, stating what will be deleted.
    #[serde(default)]
    confirm: bool,
}

#[derive(Deserialize, JsonSchema)]
pub struct AssignItem {
    /// Record UUID or legacy id.
    record_id: String,
    /// "Proven" or "Probable".
    confidence: Confidence,
    /// One sentence saying why this record is this person (required, at most 600 characters).
    explanation: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct AssignReq {
    /// Existing profile. Give this or new_profile_name.
    profile_id: Option<String>,
    /// Creates a draft profile with this full name.
    new_profile_name: Option<String>,
    records: Vec<AssignItem>,
}

#[derive(Deserialize, JsonSchema)]
pub struct UnassignReq {
    profile_id: String,
    record_ids: Vec<String>,
}

#[derive(Deserialize, JsonSchema)]
pub struct ReassignReq {
    from_profile_id: String,
    to_profile_id: String,
    record_ids: Vec<String>,
}

#[derive(Deserialize, JsonSchema)]
pub struct MemberReq {
    /// Profile UUID, if the person has a profile.
    profile_id: Option<String>,
    /// Name as written; required when there is no profile.
    name: Option<String>,
    /// The documented relationship, e.g. "son of Jacob Kent".
    relationship: String,
    confidence: Confidence,
    /// The citation that documents the relationship.
    citation: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct GroupReq {
    /// Omit to create a new family group.
    id: Option<String>,
    title: Option<String>,
    dates: Option<String>,
    locations: Option<Vec<String>>,
    summary: Option<String>,
    research_scope: Option<String>,
    /// When given, replaces all members.
    members: Option<Vec<MemberReq>>,
}

#[derive(Deserialize, JsonSchema)]
pub struct VisibilityReq {
    /// "profile" or "family_group".
    kind: String,
    id: String,
    /// "published" (visitors see it) or "draft" (administrators only).
    visibility: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct ImportReq {
    /// A research export (version 1 from the old page, or version 2 from export_research).
    data: Value,
    /// "merge" (default; keeps existing items with the same id) or "replace" (deletes all research first).
    mode: Option<String>,
    /// Default true: report what would happen without writing. Run again with false to apply.
    dry_run: Option<bool>,
}

#[derive(Deserialize, JsonSchema)]
pub struct RestoreReq {
    id: String,
    /// Must be true. Restoring replaces all current research (a backup is taken first).
    #[serde(default)]
    confirm: bool,
}

#[derive(Deserialize, JsonSchema)]
pub struct AuditReq {
    limit: Option<i64>,
    /// Only events for this profile, group or record id.
    entity_id: Option<String>,
}

#[derive(Deserialize, JsonSchema)]
pub struct PreviewReq {
    /// Profile UUID. Give this or family_group_id.
    profile_id: Option<String>,
    family_group_id: Option<String>,
}

// ---------- helpers ----------

fn profile_json(p: &Profile) -> Value {
    json!({
        "id": p.id, "full_name": p.full_name, "spelling_variants": p.spelling_variants,
        "birth_death_dates": p.birth_death_dates, "locations": p.locations, "bio_summary": p.bio_summary,
        "visibility": p.visibility, "research_scope": p.research_scope,
        "assignments": p.assignments.iter().map(|a| json!({
            "record_id": a.record_id, "legacy_id": a.legacy_hash, "confidence": a.confidence.as_str(),
            "explanation": a.explanation, "record": a.snapshot, "marker_keys": a.marker_keys,
        })).collect::<Vec<_>>(),
    })
}

fn group_json(g: &FamilyGroup) -> Value {
    json!({
        "id": g.id, "title": g.title, "dates": g.dates, "locations": g.locations, "summary": g.summary,
        "visibility": g.visibility, "research_scope": g.research_scope,
        "members": g.members.iter().map(|m| json!({
            "profile_id": m.profile_id, "name": m.name, "relationship": m.relationship,
            "confidence": m.confidence.as_str(), "citation": m.citation,
        })).collect::<Vec<_>>(),
    })
}

async fn load_profile(c: &mut PgConnection, id: Uuid) -> Result<Option<Profile>, ErrorData> {
    Ok(oft_db::research(c)
        .await
        .map_err(internal)?
        .profiles
        .into_iter()
        .find(|p| p.id == id))
}

async fn load_group(c: &mut PgConnection, id: Uuid) -> Result<Option<FamilyGroup>, ErrorData> {
    Ok(oft_db::research(c)
        .await
        .map_err(internal)?
        .family_groups
        .into_iter()
        .find(|g| g.id == id))
}

fn scope(s: Option<String>, current: &str) -> Result<String, String> {
    match s.as_deref() {
        None => Ok(current.to_string()),
        Some(v @ ("general" | "project" | "own_line")) => Ok(v.to_string()),
        Some(v) => Err(format!(
            "research_scope must be general, project or own_line (got {v:?})"
        )),
    }
}

fn clean_list(v: Vec<String>) -> Vec<String> {
    v.iter()
        .map(|s| cut(s, 200))
        .filter(|s| !s.is_empty())
        .collect()
}

#[tool_router]
impl Mcp {
    pub fn new(st: AppState) -> Self {
        Self { st }
    }

    async fn conn(
        &self,
    ) -> Result<oft_db::sqlx::pool::PoolConnection<oft_db::sqlx::Postgres>, ErrorData> {
        self.st.pool.acquire().await.map_err(internal)
    }

    #[tool(
        description = "Search the historical records. Every word must appear. Returns records with their id, \
        year, type, citation, details, place and current assignments. Use the ids with assign_records.",
        annotations(read_only_hint = true)
    )]
    async fn search_records(&self, Parameters(q): Parameters<SearchReq>) -> R {
        let mut c = self.conn().await?;
        let f = oft_db::RecordFilter {
            words: words(&q.query),
            year_from: q.year_from,
            year_to: q.year_to,
            types: q.types,
            place: q.place.filter(|p| !p.trim().is_empty()),
            assignment: q.assignment,
            limit: q.limit.unwrap_or(50).clamp(1, 200),
            offset: q.offset.unwrap_or(0).max(0),
        };
        let (rows, total) = oft_db::search_records(&mut c, &f).await.map_err(internal)?;
        let research = oft_db::research(&mut c).await.map_err(internal)?;
        let recs: Vec<Value> = rows
            .iter()
            .map(|r| {
                let assigned: Vec<Value> = research
                    .profiles
                    .iter()
                    .flat_map(|p| p.assignments.iter().filter(|a| a.record_id == r.id).map(move |a| {
                        json!({"profile_id": p.id, "profile": p.full_name, "confidence": a.confidence.as_str()})
                    }))
                    .collect();
                json!({"id": r.id, "legacy_id": r.legacy_hash, "year": r.year_text, "type": r.type_label,
                       "citation": r.citation, "details": r.details, "place": r.place,
                       "sections": r.sections, "assigned_to": assigned})
            })
            .collect();
        ok(
            json!({"total": total, "returned": recs.len(), "offset": f.offset, "records": recs,
                  "note": "Records are AI-assisted transcriptions; names are as written and one name may be several people."}),
        )
    }

    #[tool(
        description = "Get one record by UUID or legacy id, with every profile it is assigned to.",
        annotations(read_only_hint = true)
    )]
    async fn get_record(&self, Parameters(q): Parameters<IdReq>) -> R {
        let mut c = self.conn().await?;
        let Some(r) = oft_db::record(&mut c, q.id.trim())
            .await
            .map_err(internal)?
        else {
            return fail("no record with that id");
        };
        let research = oft_db::research(&mut c).await.map_err(internal)?;
        let assigned: Vec<Value> = research
            .profiles
            .iter()
            .flat_map(|p| p.assignments.iter().filter(|a| a.record_id == r.id).map(move |a| {
                json!({"profile_id": p.id, "profile": p.full_name, "confidence": a.confidence.as_str(), "explanation": a.explanation})
            }))
            .collect();
        ok(json!({"record": r, "assigned_to": assigned}))
    }

    #[tool(
        description = "List all profiles and family groups (drafts included) with counts.",
        annotations(read_only_hint = true)
    )]
    async fn list_research(&self) -> R {
        let mut c = self.conn().await?;
        let r = oft_db::research(&mut c).await.map_err(internal)?;
        ok(json!({
            "profiles": r.profiles.iter().map(|p| json!({
                "id": p.id, "full_name": p.full_name, "birth_death_dates": p.birth_death_dates,
                "visibility": p.visibility, "research_scope": p.research_scope,
                "records": p.assignments.len(),
                "proven": p.assignments.iter().filter(|a| a.confidence == Confidence::Proven).count(),
            })).collect::<Vec<_>>(),
            "family_groups": r.family_groups.iter().map(|g| json!({
                "id": g.id, "title": g.title, "dates": g.dates, "visibility": g.visibility,
                "research_scope": g.research_scope, "members": g.members.len(),
            })).collect::<Vec<_>>(),
        }))
    }

    #[tool(
        description = "Get a profile with all of its assigned records and the family groups it is in.",
        annotations(read_only_hint = true)
    )]
    async fn get_profile(&self, Parameters(q): Parameters<IdReq>) -> R {
        let id = match parse_id(&q.id, "id") {
            Ok(i) => i,
            Err(e) => return fail(e),
        };
        let mut c = self.conn().await?;
        let r = oft_db::research(&mut c).await.map_err(internal)?;
        let Some(p) = r.profiles.iter().find(|p| p.id == id) else {
            return fail("no profile with that id");
        };
        let groups: Vec<Value> = r
            .family_groups
            .iter()
            .filter(|g| g.members.iter().any(|m| m.profile_id == Some(id)))
            .map(|g| json!({"id": g.id, "title": g.title}))
            .collect();
        let mut v = profile_json(p);
        v["family_groups"] = json!(groups);
        ok(v)
    }

    #[tool(
        description = "Get a family group with its members.",
        annotations(read_only_hint = true)
    )]
    async fn get_family_group(&self, Parameters(q): Parameters<IdReq>) -> R {
        let id = match parse_id(&q.id, "id") {
            Ok(i) => i,
            Err(e) => return fail(e),
        };
        let mut c = self.conn().await?;
        match load_group(&mut c, id).await? {
            Some(g) => ok(group_json(&g)),
            None => fail("no family group with that id"),
        }
    }

    #[tool(
        description = "Create a profile (omit id) or update one (only the fields given change). \
        New profiles are drafts. Never infer a person from a name alone; profiles are the researcher's conclusions."
    )]
    async fn save_profile(
        &self,
        Parameters(q): Parameters<ProfileReq>,
        Extension(parts): Extension<Parts>,
    ) -> R {
        let user = who(&parts)?;
        let mut tx = self.st.pool.begin().await.map_err(internal)?;
        let (mut p, before) = match q.id.as_deref() {
            Some(s) => {
                let id = match parse_id(s, "id") {
                    Ok(i) => i,
                    Err(e) => return fail(e),
                };
                match load_profile(&mut tx, id).await? {
                    Some(p) => {
                        let b = profile_json(&p);
                        (p, Some(b))
                    }
                    None => return fail("no profile with that id"),
                }
            }
            None => (
                Profile {
                    id: Uuid::new_v4(),
                    full_name: String::new(),
                    spelling_variants: vec![],
                    birth_death_dates: String::new(),
                    locations: vec![],
                    bio_summary: String::new(),
                    visibility: "draft".into(),
                    research_scope: "general".into(),
                    assignments: vec![],
                },
                None,
            ),
        };
        if let Some(v) = q.full_name {
            p.full_name = cut(&v, 200);
        }
        if let Some(v) = q.spelling_variants {
            p.spelling_variants = clean_list(v);
        }
        if let Some(v) = q.birth_death_dates {
            p.birth_death_dates = cut(&v, 200);
        }
        if let Some(v) = q.locations {
            p.locations = clean_list(v);
        }
        if let Some(v) = q.bio_summary {
            p.bio_summary = cut(&v, 4000);
        }
        p.research_scope = match scope(q.research_scope, &p.research_scope) {
            Ok(s) => s,
            Err(e) => return fail(e),
        };
        if p.full_name.is_empty() {
            return fail("full_name is required");
        }
        if living_person_risk(&p.birth_death_dates) && !q.confirm_not_living {
            return fail(
                "The dates include a year after 1900. This site must not hold living people (PRD §11 #11). \
                Ask the user to confirm the person is not living, then call again with confirm_not_living: true.",
            );
        }
        oft_db::save_profile(&mut tx, &p, None, Some(user.id))
            .await
            .map_err(internal)?;
        let after = profile_json(&p);
        let action = if before.is_some() { "update" } else { "create" };
        oft_db::audit(
            &mut tx,
            Some(user.id),
            action,
            "profile",
            Some(&p.id.to_string()),
            before.as_ref(),
            Some(&after),
        )
        .await
        .map_err(internal)?;
        tx.commit().await.map_err(internal)?;
        self.st.invalidate().await;
        ok(json!({"saved": action, "profile": after}))
    }

    #[tool(
        description = "Delete a profile and its record assignments. The records themselves are never changed; \
        family groups keep the member's name. Ask the user first and pass confirm: true.",
        annotations(destructive_hint = true)
    )]
    async fn delete_profile(
        &self,
        Parameters(q): Parameters<DeleteReq>,
        Extension(parts): Extension<Parts>,
    ) -> R {
        let user = who(&parts)?;
        let id = match parse_id(&q.id, "id") {
            Ok(i) => i,
            Err(e) => return fail(e),
        };
        let mut tx = self.st.pool.begin().await.map_err(internal)?;
        let r = oft_db::research(&mut tx).await.map_err(internal)?;
        let Some(p) = r.profiles.iter().find(|p| p.id == id) else {
            return fail("no profile with that id");
        };
        let groups = r
            .family_groups
            .iter()
            .filter(|g| g.members.iter().any(|m| m.profile_id == Some(id)))
            .count();
        if !q.confirm {
            return fail(format!(
                "Not deleted. Deleting \"{}\" removes {} record assignment(s) and unlinks it from {} family group(s) \
                 (their member names stay). Ask the user, then call again with confirm: true.",
                p.full_name,
                p.assignments.len(),
                groups
            ));
        }
        let before = profile_json(p);
        oft_db::delete_profile(&mut tx, id)
            .await
            .map_err(internal)?;
        oft_db::audit(
            &mut tx,
            Some(user.id),
            "delete",
            "profile",
            Some(&id.to_string()),
            Some(&before),
            None,
        )
        .await
        .map_err(internal)?;
        tx.commit().await.map_err(internal)?;
        self.st.invalidate().await;
        ok(
            json!({"deleted": p.full_name, "assignments_removed": p.assignments.len(), "groups_unlinked": groups}),
        )
    }

    #[tool(
        description = "Assign records to a profile (or to a new draft profile), each with a confidence \
        (Proven or Probable) and a one-sentence explanation. Assigning a record to the same profile again replaces \
        the earlier assignment. The record itself is never changed."
    )]
    async fn assign_records(
        &self,
        Parameters(q): Parameters<AssignReq>,
        Extension(parts): Extension<Parts>,
    ) -> R {
        let user = who(&parts)?;
        if q.records.is_empty() {
            return fail("records is empty");
        }
        if let Some(bad) = q
            .records
            .iter()
            .position(|r| r.explanation.trim().is_empty())
        {
            return fail(format!(
                "record {} has no explanation; each needs one sentence saying why",
                bad + 1
            ));
        }
        let mut tx = self.st.pool.begin().await.map_err(internal)?;
        let profile = match (
            q.profile_id.as_deref(),
            q.new_profile_name.as_deref().map(str::trim),
        ) {
            (Some(id), _) => match parse_id(id, "profile_id") {
                Ok(id) => match load_profile(&mut tx, id).await? {
                    Some(p) => p,
                    None => return fail("no profile with that profile_id"),
                },
                Err(e) => return fail(e),
            },
            (None, Some(name)) if !name.is_empty() => {
                let p = Profile {
                    id: Uuid::new_v4(),
                    full_name: cut(name, 200),
                    spelling_variants: vec![],
                    birth_death_dates: String::new(),
                    locations: vec![],
                    bio_summary: String::new(),
                    visibility: "draft".into(),
                    research_scope: "general".into(),
                    assignments: vec![],
                };
                oft_db::save_profile(&mut tx, &p, None, Some(user.id))
                    .await
                    .map_err(internal)?;
                let after = profile_json(&p);
                oft_db::audit(
                    &mut tx,
                    Some(user.id),
                    "create",
                    "profile",
                    Some(&p.id.to_string()),
                    None,
                    Some(&after),
                )
                .await
                .map_err(internal)?;
                p
            }
            _ => return fail("give profile_id or new_profile_name"),
        };
        let mut done = vec![];
        for item in &q.records {
            let Some(rec) = oft_db::record(&mut tx, item.record_id.trim())
                .await
                .map_err(internal)?
            else {
                return fail(format!(
                    "no record with id {:?}; nothing was saved",
                    item.record_id
                ));
            };
            if rec.status != "active" {
                return fail(format!(
                    "record {:?} was removed from the map; nothing was saved",
                    item.record_id
                ));
            }
            let before = profile
                .assignments
                .iter()
                .find(|a| a.record_id == rec.id)
                .map(
                    |a| json!({"confidence": a.confidence.as_str(), "explanation": a.explanation}),
                );
            let explanation = cut(&item.explanation, 600);
            oft_db::upsert_assignment(
                &mut tx,
                profile.id,
                &rec,
                item.confidence,
                &explanation,
                Some(user.id),
            )
            .await
            .map_err(internal)?;
            let after = json!({"profile_id": profile.id, "record_id": rec.id, "confidence": item.confidence.as_str(), "explanation": explanation});
            let action = if before.is_some() { "update" } else { "create" };
            oft_db::audit(
                &mut tx,
                Some(user.id),
                action,
                "assignment",
                Some(&profile.id.to_string()),
                before.as_ref(),
                Some(&after),
            )
            .await
            .map_err(internal)?;
            done.push(json!({"record_id": rec.id, "year": rec.year_text, "citation": rec.citation, "confidence": item.confidence.as_str(), "replaced": before.is_some()}));
        }
        tx.commit().await.map_err(internal)?;
        self.st.invalidate().await;
        ok(
            json!({"profile_id": profile.id, "profile": profile.full_name, "visibility": profile.visibility, "assigned": done}),
        )
    }

    #[tool(description = "Remove record assignments from a profile. The records are not changed.")]
    async fn unassign_records(
        &self,
        Parameters(q): Parameters<UnassignReq>,
        Extension(parts): Extension<Parts>,
    ) -> R {
        let user = who(&parts)?;
        let pid = match parse_id(&q.profile_id, "profile_id") {
            Ok(i) => i,
            Err(e) => return fail(e),
        };
        let mut tx = self.st.pool.begin().await.map_err(internal)?;
        let ids = match self.record_ids(&mut tx, &q.record_ids).await? {
            Ok(v) => v,
            Err(e) => return fail(e),
        };
        let n = oft_db::delete_assignments(&mut tx, pid, &ids)
            .await
            .map_err(internal)?;
        let b = json!({"profile_id": pid, "record_ids": ids});
        oft_db::audit(
            &mut tx,
            Some(user.id),
            "delete",
            "assignment",
            Some(&pid.to_string()),
            Some(&b),
            None,
        )
        .await
        .map_err(internal)?;
        tx.commit().await.map_err(internal)?;
        self.st.invalidate().await;
        ok(json!({"removed": n}))
    }

    #[tool(
        description = "Move record assignments from one profile to another, keeping confidence and explanation."
    )]
    async fn reassign_records(
        &self,
        Parameters(q): Parameters<ReassignReq>,
        Extension(parts): Extension<Parts>,
    ) -> R {
        let user = who(&parts)?;
        let (from, to) = match (
            parse_id(&q.from_profile_id, "from_profile_id"),
            parse_id(&q.to_profile_id, "to_profile_id"),
        ) {
            (Ok(a), Ok(b)) => (a, b),
            (Err(e), _) | (_, Err(e)) => return fail(e),
        };
        let mut tx = self.st.pool.begin().await.map_err(internal)?;
        if load_profile(&mut tx, to).await?.is_none() {
            return fail("no profile with to_profile_id");
        }
        let ids = match self.record_ids(&mut tx, &q.record_ids).await? {
            Ok(v) => v,
            Err(e) => return fail(e),
        };
        let n = oft_db::reassign(&mut tx, from, to, &ids)
            .await
            .map_err(internal)?;
        let after = json!({"from": from, "to": to, "record_ids": ids});
        oft_db::audit(
            &mut tx,
            Some(user.id),
            "update",
            "assignment",
            Some(&from.to_string()),
            None,
            Some(&after),
        )
        .await
        .map_err(internal)?;
        tx.commit().await.map_err(internal)?;
        self.st.invalidate().await;
        ok(json!({"moved": n}))
    }

    #[tool(
        description = "Create a family group (omit id) or update one. Members, when given, replace all members; \
        each needs the documented relationship, its confidence and a supporting citation. Never infer relationships."
    )]
    async fn save_family_group(
        &self,
        Parameters(q): Parameters<GroupReq>,
        Extension(parts): Extension<Parts>,
    ) -> R {
        let user = who(&parts)?;
        let mut tx = self.st.pool.begin().await.map_err(internal)?;
        let research = oft_db::research(&mut tx).await.map_err(internal)?;
        let (mut g, before) = match q.id.as_deref() {
            Some(s) => {
                let id = match parse_id(s, "id") {
                    Ok(i) => i,
                    Err(e) => return fail(e),
                };
                match research.family_groups.iter().find(|g| g.id == id) {
                    Some(g) => (g.clone(), Some(group_json(g))),
                    None => return fail("no family group with that id"),
                }
            }
            None => (
                FamilyGroup {
                    id: Uuid::new_v4(),
                    title: String::new(),
                    dates: String::new(),
                    locations: vec![],
                    summary: String::new(),
                    visibility: "draft".into(),
                    research_scope: "general".into(),
                    members: vec![],
                },
                None,
            ),
        };
        if let Some(v) = q.title {
            g.title = cut(&v, 200);
        }
        if let Some(v) = q.dates {
            g.dates = cut(&v, 200);
        }
        if let Some(v) = q.locations {
            g.locations = clean_list(v);
        }
        if let Some(v) = q.summary {
            g.summary = cut(&v, 4000);
        }
        g.research_scope = match scope(q.research_scope, &g.research_scope) {
            Ok(s) => s,
            Err(e) => return fail(e),
        };
        if g.title.is_empty() {
            return fail("title is required");
        }
        if let Some(ms) = q.members {
            let mut members = vec![];
            for (i, m) in ms.into_iter().enumerate() {
                let pid = match m
                    .profile_id
                    .as_deref()
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| parse_id(s, "profile_id"))
                {
                    Some(Ok(id)) => Some(id),
                    Some(Err(e)) => return fail(format!("member {}: {e}", i + 1)),
                    None => None,
                };
                let pname = pid.and_then(|id| {
                    research
                        .profiles
                        .iter()
                        .find(|p| p.id == id)
                        .map(|p| p.full_name.clone())
                });
                if pid.is_some() && pname.is_none() {
                    return fail(format!("member {}: no profile with that profile_id", i + 1));
                }
                let name = m
                    .name
                    .map(|n| cut(&n, 200))
                    .filter(|n| !n.is_empty())
                    .or(pname)
                    .unwrap_or_default();
                let (relationship, citation) = (cut(&m.relationship, 300), cut(&m.citation, 600));
                if name.is_empty() || relationship.is_empty() || citation.is_empty() {
                    return fail(format!(
                        "member {}: give a person (profile_id or name), the documented relationship and a supporting citation",
                        i + 1
                    ));
                }
                members.push(Member {
                    profile_id: pid,
                    name,
                    relationship,
                    confidence: m.confidence,
                    citation,
                });
            }
            g.members = members;
        }
        oft_db::save_group(&mut tx, &g, None, Some(user.id))
            .await
            .map_err(internal)?;
        let after = group_json(&g);
        let action = if before.is_some() { "update" } else { "create" };
        oft_db::audit(
            &mut tx,
            Some(user.id),
            action,
            "family_group",
            Some(&g.id.to_string()),
            before.as_ref(),
            Some(&after),
        )
        .await
        .map_err(internal)?;
        tx.commit().await.map_err(internal)?;
        self.st.invalidate().await;
        ok(json!({"saved": action, "family_group": after}))
    }

    #[tool(
        description = "Delete a family group. Profiles and records are not changed. Ask the user first and pass confirm: true.",
        annotations(destructive_hint = true)
    )]
    async fn delete_family_group(
        &self,
        Parameters(q): Parameters<DeleteReq>,
        Extension(parts): Extension<Parts>,
    ) -> R {
        let user = who(&parts)?;
        let id = match parse_id(&q.id, "id") {
            Ok(i) => i,
            Err(e) => return fail(e),
        };
        let mut tx = self.st.pool.begin().await.map_err(internal)?;
        let Some(g) = load_group(&mut tx, id).await? else {
            return fail("no family group with that id");
        };
        if !q.confirm {
            return fail(format!(
                "Not deleted. Ask the user to confirm deleting \"{}\" ({} members), then call again with confirm: true.",
                g.title,
                g.members.len()
            ));
        }
        let before = group_json(&g);
        oft_db::delete_group(&mut tx, id).await.map_err(internal)?;
        oft_db::audit(
            &mut tx,
            Some(user.id),
            "delete",
            "family_group",
            Some(&id.to_string()),
            Some(&before),
            None,
        )
        .await
        .map_err(internal)?;
        tx.commit().await.map_err(internal)?;
        self.st.invalidate().await;
        ok(json!({"deleted": g.title}))
    }

    #[tool(
        description = "Publish a profile or family group (visitors see it) or move it back to draft."
    )]
    async fn set_visibility(
        &self,
        Parameters(q): Parameters<VisibilityReq>,
        Extension(parts): Extension<Parts>,
    ) -> R {
        let user = who(&parts)?;
        let id = match parse_id(&q.id, "id") {
            Ok(i) => i,
            Err(e) => return fail(e),
        };
        if !matches!(q.visibility.as_str(), "published" | "draft")
            || !matches!(q.kind.as_str(), "profile" | "family_group")
        {
            return fail(
                "kind must be profile or family_group; visibility must be published or draft",
            );
        }
        let mut tx = self.st.pool.begin().await.map_err(internal)?;
        let n = oft_db::set_visibility(&mut tx, &q.kind, id, &q.visibility, user.id)
            .await
            .map_err(internal)?;
        if n == 0 {
            return fail(format!("no {} with that id", q.kind));
        }
        let after = json!({"visibility": q.visibility});
        oft_db::audit(
            &mut tx,
            Some(user.id),
            "update",
            &q.kind,
            Some(&id.to_string()),
            None,
            Some(&after),
        )
        .await
        .map_err(internal)?;
        tx.commit().await.map_err(internal)?;
        self.st.invalidate().await;
        ok(json!({"id": id, "visibility": q.visibility}))
    }

    #[tool(description = "Export all research as version 2 JSON (also stored as a manual backup).")]
    async fn export_research(&self, Extension(parts): Extension<Parts>) -> R {
        let user = who(&parts)?;
        let (payload, id) = crate::ops::export(&self.st.pool, Some(user.id))
            .await
            .map_err(internal)?;
        ok(json!({"backup_id": id, "export": payload}))
    }

    #[tool(
        description = "Import a research JSON file. Runs as a dry run by default and reports counts and \
        unmatched assignments; call again with dry_run: false to apply. A pre_import backup is taken first."
    )]
    async fn import_research(
        &self,
        Parameters(q): Parameters<ImportReq>,
        Extension(parts): Extension<Parts>,
    ) -> R {
        let user = who(&parts)?;
        let replace = match q.mode.as_deref().unwrap_or("merge") {
            "merge" => false,
            "replace" => true,
            m => return fail(format!("mode must be merge or replace (got {m:?})")),
        };
        let dry = q.dry_run.unwrap_or(true);
        match crate::ops::import(&self.st.pool, q.data, replace, dry, Some(user.id)).await {
            Ok(rep) => {
                if !dry {
                    self.st.invalidate().await;
                }
                ok(serde_json::to_value(rep).map_err(internal)?)
            }
            Err(e) => fail(e.to_string()),
        }
    }

    #[tool(
        description = "List research backups (nightly, manual, pre_import, pre_restore), newest first.",
        annotations(read_only_hint = true)
    )]
    async fn list_backups(&self) -> R {
        let mut c = self.conn().await?;
        ok(json!({"backups": oft_db::backups(&mut c, 100).await.map_err(internal)?}))
    }

    #[tool(
        description = "Replace all research with a backup. A pre_restore backup is taken first. \
        Ask the user first and pass confirm: true.",
        annotations(destructive_hint = true)
    )]
    async fn restore_backup(
        &self,
        Parameters(q): Parameters<RestoreReq>,
        Extension(parts): Extension<Parts>,
    ) -> R {
        let user = who(&parts)?;
        let id = match parse_id(&q.id, "id") {
            Ok(i) => i,
            Err(e) => return fail(e),
        };
        if !q.confirm {
            return fail(
                "Not restored. Restoring replaces all current research. Ask the user, then call again with confirm: true.",
            );
        }
        match crate::ops::restore(&self.st.pool, id, Some(user.id)).await {
            Ok(rep) => {
                self.st.invalidate().await;
                ok(serde_json::to_value(rep).map_err(internal)?)
            }
            Err(e) => fail(e.to_string()),
        }
    }

    #[tool(
        description = "Read the audit log of research changes (who, when, before and after), newest first.",
        annotations(read_only_hint = true)
    )]
    async fn get_audit_log(&self, Parameters(q): Parameters<AuditReq>) -> R {
        let mut c = self.conn().await?;
        let rows = oft_db::audit_log(
            &mut c,
            q.limit.unwrap_or(50).clamp(1, 500),
            q.entity_id.as_deref(),
        )
        .await
        .map_err(internal)?;
        ok(json!({"events": rows}))
    }

    #[tool(description = "Show a profile or family group on the interactive map, drafts included: rings on its \
        locations (solid = at least one Proven record, dashed = Probable only), the summary card and its records.",
        meta = MetaObject(rmcp::object!({"ui": {"resourceUri": PREVIEW_URI}})),
        annotations(read_only_hint = true))]
    async fn preview(&self, Parameters(q): Parameters<PreviewReq>) -> R {
        let (key, id) = match (q.profile_id.as_deref(), q.family_group_id.as_deref()) {
            (Some(p), _) => ("p", p),
            (None, Some(g)) => ("g", g),
            _ => return fail("give profile_id or family_group_id"),
        };
        let id = match parse_id(id, "id") {
            Ok(i) => i,
            Err(e) => return fail(e),
        };
        let mut c = self.conn().await?;
        let r = oft_db::research(&mut c).await.map_err(internal)?;
        let name = if key == "p" {
            r.profiles
                .iter()
                .find(|p| p.id == id)
                .map(|p| p.full_name.clone())
        } else {
            r.family_groups
                .iter()
                .find(|g| g.id == id)
                .map(|g| g.title.clone())
        };
        let Some(name) = name else {
            return fail("no profile or family group with that id");
        };
        let mut res = CallToolResult::structured(
            json!({"research": r.to_page(), "select": format!("{key}:{id}")}),
        );
        res.content = vec![ContentBlock::text(format!(
            "Showing \"{name}\" on the map (drafts included). If the map does not appear, this client does not support MCP Apps."
        ))];
        Ok(res)
    }
}

impl Mcp {
    async fn record_ids(
        &self,
        c: &mut PgConnection,
        ids: &[String],
    ) -> Result<Result<Vec<Uuid>, String>, ErrorData> {
        let mut out = vec![];
        for s in ids {
            match oft_db::record(c, s.trim()).await.map_err(internal)? {
                Some(r) => out.push(r.id),
                None => return Ok(Err(format!("no record with id {s:?}; nothing was changed"))),
            }
        }
        Ok(Ok(out))
    }
}

#[tool_handler]
impl ServerHandler for Mcp {
    fn get_info(&self) -> ServerConfig {
        let mut ext = ExtensionCapabilities::new();
        ext.insert(
            "io.modelcontextprotocol/ui".into(),
            rmcp::object!({"mimeTypes": [APP_MIME]}),
        );
        ServerConfig::new(ServerCapabilities::builder().enable_tools().enable_resources().enable_extensions_with(ext).build())
            .with_instructions(
                "Research tools for the Kent and Kint Records Map (ourfamilytree.net). Records are historical \
                 transcriptions and are never changed; profiles, family groups and assignments are the researcher's \
                 conclusions. Every assignment needs Proven or Probable and a one-sentence explanation. Never infer \
                 that two records are one person, or any kinship, without the user saying so. New items are drafts; \
                 publish only when the user asks. Ask before any delete, replace import or restore.",
            )
    }

    async fn list_resources(
        &self,
        _r: Option<PaginatedRequestParams>,
        _c: RequestContext<rmcp::RoleServer>,
    ) -> Result<ListResourcesResult, ErrorData> {
        let mut res = Resource::new(PREVIEW_URI, "map-preview").with_title("Records map preview");
        res.mime_type = Some(APP_MIME.into());
        Ok(ListResourcesResult::with_all_items(vec![res]))
    }

    async fn read_resource(
        &self,
        r: ReadResourceRequestParams,
        _c: RequestContext<rmcp::RoleServer>,
    ) -> Result<ReadResourceResponse, ErrorData> {
        if r.uri != PREVIEW_URI {
            return Err(ErrorData::resource_not_found("unknown resource", None));
        }
        let html = crate::site::preview_html(&self.st)
            .await
            .map_err(internal)?;
        Ok(ReadResourceResponse::Complete(ReadResourceResult::new(
            vec![ResourceContents::TextResourceContents {
                uri: PREVIEW_URI.into(),
                mime_type: Some(APP_MIME.into()),
                text: html,
                meta: None,
            }],
        )))
    }
}
