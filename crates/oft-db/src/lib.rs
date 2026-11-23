//! PostgreSQL access. Functions take `&mut PgConnection`, so callers can pass a pooled
//! connection or a transaction (`&mut *tx`).

use oft_domain::Confidence;
use oft_domain::research::{Assignment, FamilyGroup, Member, Profile, Research, Snapshot};
use serde_json::Value;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::{FromRow, PgConnection, PgPool};
use std::collections::HashMap;
use std::str::FromStr;
use uuid::Uuid;

pub use sqlx;

pub type Result<T> = std::result::Result<T, sqlx::Error>;

/// Connects and runs migrations. With `ca_pem` (App Platform's `${db.CA_CERT}`), TLS is required and
/// the server certificate is verified against it.
pub async fn connect(url: &str, ca_pem: Option<&str>) -> Result<PgPool> {
    let mut opts = PgConnectOptions::from_str(url)?;
    if let Some(pem) = ca_pem.filter(|p| !p.trim().is_empty()) {
        opts = opts
            .ssl_mode(sqlx::postgres::PgSslMode::VerifyFull)
            .ssl_root_cert_from_pem(pem.as_bytes().to_vec());
    }
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect_with(opts)
        .await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}

// ---------- datasets ----------

/// Values are stored and read as json text so object key order survives (the page relies on it).
pub async fn datasets(c: &mut PgConnection) -> Result<Vec<(String, Value)>> {
    let rows: Vec<(String, String)> =
        sqlx::query_as("SELECT name, value::text FROM dataset ORDER BY position")
            .fetch_all(c)
            .await?;
    rows.into_iter()
        .map(|(n, v)| {
            Ok((
                n,
                serde_json::from_str(&v).map_err(|e| sqlx::Error::Decode(Box::new(e)))?,
            ))
        })
        .collect()
}

pub async fn replace_datasets(c: &mut PgConnection, sets: &[(String, Value)]) -> Result<()> {
    sqlx::query("DELETE FROM dataset").execute(&mut *c).await?;
    for (i, (name, value)) in sets.iter().enumerate() {
        sqlx::query("INSERT INTO dataset (name, position, value) VALUES ($1, $2, $3::json)")
            .bind(name)
            .bind(i as i32)
            .bind(value.to_string())
            .execute(&mut *c)
            .await?;
    }
    Ok(())
}

// ---------- records ----------

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct Record {
    pub id: Uuid,
    /// The id the page gives the row: a hash of the source entry (`s…`).
    pub legacy_hash: String,
    /// The old id from the row text (`r…`), kept so v1 research exports find their records.
    pub text_hash: Option<String>,
    pub year_text: String,
    pub year: Option<i32>,
    pub type_label: String,
    pub citation: String,
    pub details: String,
    pub place: String,
    pub marker_keys: Vec<String>,
    pub sections: Vec<String>,
    pub status: String,
}

impl Record {
    pub fn snapshot(&self) -> Snapshot {
        Snapshot {
            y: self.year_text.clone(),
            t: self.type_label.clone(),
            c: self.citation.clone(),
            d: self.details.clone(),
            p: self.place.clone(),
        }
    }
}

const RECORD_COLS: &str = "id, legacy_hash, text_hash, year_text, year, type_label, citation, details, place, marker_keys, sections, status";

/// Inserts new records and refreshes existing ones (matched by the page id, so UUIDs never change).
/// A record stored under its old text id takes the page id of the first row with that text id, so
/// its UUID and assignments stay; the other rows with that text id become new records.
/// Records missing from `rows` are marked `removed`, never deleted. Returns (inserted, removed).
pub async fn sync_records(c: &mut PgConnection, rows: &[Record]) -> Result<(u64, u64)> {
    let mut inserted = 0;
    for r in rows {
        let search = oft_domain::words(&format!(
            "{} {} {} {} {} {}",
            r.year_text,
            r.type_label,
            r.citation,
            r.details,
            r.place,
            r.sections.join(" ")
        ))
        .join(" ");
        if let Some(text_hash) = &r.text_hash {
            sqlx::query(
                "UPDATE record SET legacy_hash=$1, text_hash=$2 WHERE legacy_hash=$2
                   AND NOT EXISTS (SELECT 1 FROM record WHERE legacy_hash=$1)",
            )
            .bind(&r.legacy_hash)
            .bind(text_hash)
            .execute(&mut *c)
            .await?;
        }
        let res = sqlx::query(
            "INSERT INTO record (legacy_hash, year_text, year, type_label, citation, details, place,
                                 marker_keys, sections, search_text, status, text_hash)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11)
             ON CONFLICT (legacy_hash) DO UPDATE SET year_text=$2, year=$3, type_label=$4, citation=$5,
               details=$6, place=$7, marker_keys=$8, sections=$9, search_text=$10, status='active',
               text_hash=COALESCE(record.text_hash, $11), updated_at=now()
             RETURNING (xmax = 0) AS inserted",
        )
        .bind(&r.legacy_hash)
        .bind(&r.year_text)
        .bind(r.year)
        .bind(&r.type_label)
        .bind(&r.citation)
        .bind(&r.details)
        .bind(&r.place)
        .bind(&r.marker_keys)
        .bind(&r.sections)
        .bind(&search)
        .bind(&r.text_hash)
        .fetch_one(&mut *c)
        .await?;
        if sqlx::Row::get::<bool, _>(&res, "inserted") {
            inserted += 1;
        }
    }
    let hashes: Vec<&str> = rows.iter().map(|r| r.legacy_hash.as_str()).collect();
    let removed = sqlx::query(
        "UPDATE record SET status='removed', updated_at=now() WHERE status='active' AND NOT legacy_hash = ANY($1)",
    )
    .bind(&hashes)
    .execute(&mut *c)
    .await?
    .rows_affected();
    Ok((inserted, removed))
}

#[derive(Debug, Default)]
pub struct RecordFilter {
    pub words: Vec<String>,
    pub year_from: Option<i32>,
    pub year_to: Option<i32>,
    pub types: Vec<String>,
    pub place: Option<String>,
    /// `assigned`, `unassigned`, or anything else for all.
    pub assignment: Option<String>,
    pub limit: i64,
    pub offset: i64,
}

/// Word search per PRD §7.5: every word must appear. Undated records match any year range.
pub async fn search_records(c: &mut PgConnection, f: &RecordFilter) -> Result<(Vec<Record>, i64)> {
    let patterns: Vec<String> = f.words.iter().map(|w| format!("%{w}%")).collect();
    let place = f.place.as_ref().map(|p| format!("%{}%", p.to_lowercase()));
    let filter = "status='active'
          AND search_text LIKE ALL($1)
          AND ($2::int IS NULL OR year IS NULL OR year >= $2)
          AND ($3::int IS NULL OR year IS NULL OR year <= $3)
          AND (cardinality($4::text[]) = 0 OR type_label = ANY($4))
          AND ($5::text IS NULL OR lower(place) LIKE $5 OR lower(array_to_string(sections, ' ')) LIKE $5)
          AND CASE $6::text
                WHEN 'assigned' THEN EXISTS (SELECT 1 FROM assignment a WHERE a.record_id = record.id)
                WHEN 'unassigned' THEN NOT EXISTS (SELECT 1 FROM assignment a WHERE a.record_id = record.id)
                ELSE true END";
    let total: i64 = sqlx::query_scalar(&format!("SELECT count(*) FROM record WHERE {filter}"))
        .bind(&patterns)
        .bind(f.year_from)
        .bind(f.year_to)
        .bind(&f.types)
        .bind(&place)
        .bind(&f.assignment)
        .fetch_one(&mut *c)
        .await?;
    let rows = sqlx::query_as(&format!(
        "SELECT {RECORD_COLS} FROM record WHERE {filter}
         ORDER BY year NULLS LAST, type_label, citation LIMIT $7 OFFSET $8"
    ))
    .bind(&patterns)
    .bind(f.year_from)
    .bind(f.year_to)
    .bind(&f.types)
    .bind(&place)
    .bind(&f.assignment)
    .bind(f.limit)
    .bind(f.offset)
    .fetch_all(&mut *c)
    .await?;
    Ok((rows, total))
}

/// Finds a record by UUID, by the page id, or by an old text id that names only one record.
pub async fn record(c: &mut PgConnection, id_or_hash: &str) -> Result<Option<Record>> {
    match Uuid::parse_str(id_or_hash) {
        Ok(id) => {
            sqlx::query_as(&format!("SELECT {RECORD_COLS} FROM record WHERE id=$1"))
                .bind(id)
                .fetch_optional(c)
                .await
        }
        Err(_) => {
            let mut rows: Vec<Record> = sqlx::query_as(&format!(
                "SELECT {RECORD_COLS} FROM record WHERE legacy_hash=$1 OR text_hash=$1 LIMIT 2"
            ))
            .bind(id_or_hash)
            .fetch_all(c)
            .await?;
            Ok(if rows.len() == 1 { rows.pop() } else { None })
        }
    }
}

/// Fallback for old exports (PRD §11 #9): same year, type and citation text.
pub async fn record_by_snapshot(c: &mut PgConnection, s: &Snapshot) -> Result<Option<Record>> {
    let rows: Vec<Record> = sqlx::query_as(&format!(
        "SELECT {RECORD_COLS} FROM record WHERE year_text=$1 AND type_label=$2 AND citation=$3 LIMIT 2"
    ))
    .bind(&s.y)
    .bind(&s.t)
    .bind(&s.c)
    .fetch_all(c)
    .await?;
    Ok(if rows.len() == 1 {
        rows.into_iter().next()
    } else {
        None
    })
}

// ---------- users ----------

#[derive(Debug, Clone, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub display_name: String,
    pub role: String,
    pub active: bool,
}

pub async fn upsert_user(
    c: &mut PgConnection,
    email: &str,
    name: &str,
    role: &str,
    active: bool,
) -> Result<User> {
    sqlx::query_as(
        "INSERT INTO app_user (email, display_name, role, active) VALUES (lower($1), $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET display_name = CASE WHEN $2 = '' THEN app_user.display_name ELSE $2 END,
           role = $3, active = $4
         RETURNING id, email, display_name, role, active",
    )
    .bind(email)
    .bind(name)
    .bind(role)
    .bind(active)
    .fetch_one(c)
    .await
}

pub async fn users(c: &mut PgConnection) -> Result<Vec<User>> {
    sqlx::query_as("SELECT id, email, display_name, role, active FROM app_user ORDER BY email")
        .fetch_all(c)
        .await
}

// ---------- research ----------

#[derive(FromRow)]
struct ProfileRow {
    id: Uuid,
    full_name: String,
    spelling_variants: Vec<String>,
    birth_death_dates: String,
    locations: Vec<String>,
    bio_summary: String,
    visibility: String,
    research_scope: String,
}

#[derive(FromRow)]
struct AssignmentRow {
    profile_id: Uuid,
    record_id: Uuid,
    legacy_hash: String,
    confidence: String,
    explanation: String,
    snapshot: Value,
    marker_keys: Vec<String>,
}

#[derive(FromRow)]
struct GroupRow {
    id: Uuid,
    title: String,
    dates: String,
    locations: Vec<String>,
    summary: String,
    visibility: String,
    research_scope: String,
}

#[derive(FromRow)]
struct MemberRow {
    family_group_id: Uuid,
    profile_id: Option<Uuid>,
    name: String,
    relationship: String,
    relationship_confidence: String,
    citation: String,
}

/// All research, in creation order.
pub async fn research(c: &mut PgConnection) -> Result<Research> {
    let profiles: Vec<ProfileRow> = sqlx::query_as(
        "SELECT id, full_name, spelling_variants, birth_death_dates, locations, bio_summary, visibility, research_scope
         FROM profile ORDER BY created_at, full_name",
    )
    .fetch_all(&mut *c)
    .await?;
    let assigns: Vec<AssignmentRow> = sqlx::query_as(
        "SELECT a.profile_id, a.record_id, r.legacy_hash, a.confidence, a.explanation, a.snapshot, a.marker_keys
         FROM assignment a JOIN record r ON r.id = a.record_id ORDER BY a.created_at",
    )
    .fetch_all(&mut *c)
    .await?;
    let groups: Vec<GroupRow> = sqlx::query_as(
        "SELECT id, title, dates, locations, summary, visibility, research_scope FROM family_group ORDER BY created_at, title",
    )
    .fetch_all(&mut *c)
    .await?;
    let members: Vec<MemberRow> = sqlx::query_as(
        "SELECT family_group_id, profile_id, name, relationship, relationship_confidence, citation
         FROM family_group_member ORDER BY sort_order",
    )
    .fetch_all(&mut *c)
    .await?;

    let mut by_profile: HashMap<Uuid, Vec<Assignment>> = HashMap::new();
    for a in assigns {
        by_profile
            .entry(a.profile_id)
            .or_default()
            .push(Assignment {
                record_id: a.record_id,
                legacy_hash: a.legacy_hash,
                confidence: Confidence::lenient(&a.confidence),
                explanation: a.explanation,
                snapshot: serde_json::from_value(a.snapshot).unwrap_or_default(),
                marker_keys: a.marker_keys,
            });
    }
    let mut by_group: HashMap<Uuid, Vec<Member>> = HashMap::new();
    for m in members {
        by_group.entry(m.family_group_id).or_default().push(Member {
            profile_id: m.profile_id,
            name: m.name,
            relationship: m.relationship,
            confidence: Confidence::lenient(&m.relationship_confidence),
            citation: m.citation,
        });
    }
    Ok(Research {
        profiles: profiles
            .into_iter()
            .map(|p| Profile {
                assignments: by_profile.remove(&p.id).unwrap_or_default(),
                id: p.id,
                full_name: p.full_name,
                spelling_variants: p.spelling_variants,
                birth_death_dates: p.birth_death_dates,
                locations: p.locations,
                bio_summary: p.bio_summary,
                visibility: p.visibility,
                research_scope: p.research_scope,
            })
            .collect(),
        family_groups: groups
            .into_iter()
            .map(|g| FamilyGroup {
                members: by_group.remove(&g.id).unwrap_or_default(),
                id: g.id,
                title: g.title,
                dates: g.dates,
                locations: g.locations,
                summary: g.summary,
                visibility: g.visibility,
                research_scope: g.research_scope,
            })
            .collect(),
    })
}

/// Inserts or replaces a profile's fields (not its assignments).
pub async fn save_profile(
    c: &mut PgConnection,
    p: &Profile,
    legacy_id: Option<&str>,
    user: Option<Uuid>,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO profile (id, full_name, spelling_variants, birth_death_dates, locations, bio_summary,
                              visibility, research_scope, legacy_id, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
         ON CONFLICT (id) DO UPDATE SET full_name=$2, spelling_variants=$3, birth_death_dates=$4, locations=$5,
           bio_summary=$6, visibility=$7, research_scope=$8, updated_by=$10, updated_at=now()",
    )
    .bind(p.id)
    .bind(&p.full_name)
    .bind(&p.spelling_variants)
    .bind(&p.birth_death_dates)
    .bind(&p.locations)
    .bind(&p.bio_summary)
    .bind(&p.visibility)
    .bind(&p.research_scope)
    .bind(legacy_id)
    .bind(user)
    .execute(c)
    .await?;
    Ok(())
}

pub async fn delete_profile(c: &mut PgConnection, id: Uuid) -> Result<u64> {
    Ok(sqlx::query("DELETE FROM profile WHERE id=$1")
        .bind(id)
        .execute(c)
        .await?
        .rows_affected())
}

/// Adds or replaces the assignment of one record to one profile (PRD §4.1 A-5).
pub async fn upsert_assignment(
    c: &mut PgConnection,
    profile: Uuid,
    rec: &Record,
    conf: Confidence,
    explanation: &str,
    user: Option<Uuid>,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO assignment (profile_id, record_id, confidence, explanation, snapshot, marker_keys, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (profile_id, record_id) DO UPDATE SET confidence=$3, explanation=$4, snapshot=$5,
           marker_keys=$6, updated_at=now()",
    )
    .bind(profile)
    .bind(rec.id)
    .bind(conf.as_str())
    .bind(explanation)
    .bind(serde_json::to_value(rec.snapshot()).expect("snapshot serializes"))
    .bind(&rec.marker_keys)
    .bind(user)
    .execute(c)
    .await?;
    Ok(())
}

/// Inserts an assignment with a stored snapshot (used by import, which keeps the file's snapshot).
pub async fn insert_assignment(
    c: &mut PgConnection,
    profile: Uuid,
    a: &Assignment,
    user: Option<Uuid>,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO assignment (profile_id, record_id, confidence, explanation, snapshot, marker_keys, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (profile_id, record_id) DO UPDATE SET confidence=$3, explanation=$4, snapshot=$5, marker_keys=$6, updated_at=now()",
    )
    .bind(profile)
    .bind(a.record_id)
    .bind(a.confidence.as_str())
    .bind(&a.explanation)
    .bind(serde_json::to_value(&a.snapshot).expect("snapshot serializes"))
    .bind(&a.marker_keys)
    .bind(user)
    .execute(c)
    .await?;
    Ok(())
}

pub async fn delete_assignments(
    c: &mut PgConnection,
    profile: Uuid,
    records: &[Uuid],
) -> Result<u64> {
    Ok(
        sqlx::query("DELETE FROM assignment WHERE profile_id=$1 AND record_id = ANY($2)")
            .bind(profile)
            .bind(records)
            .execute(c)
            .await?
            .rows_affected(),
    )
}

/// Moves assignments to another profile; an existing assignment there is replaced.
pub async fn reassign(c: &mut PgConnection, from: Uuid, to: Uuid, records: &[Uuid]) -> Result<u64> {
    sqlx::query("DELETE FROM assignment WHERE profile_id=$1 AND record_id = ANY($2)")
        .bind(to)
        .bind(records)
        .execute(&mut *c)
        .await?;
    Ok(sqlx::query("UPDATE assignment SET profile_id=$2, updated_at=now() WHERE profile_id=$1 AND record_id = ANY($3)")
        .bind(from)
        .bind(to)
        .bind(records)
        .execute(c)
        .await?
        .rows_affected())
}

/// Inserts or replaces a family group and all of its members.
pub async fn save_group(
    c: &mut PgConnection,
    g: &FamilyGroup,
    legacy_id: Option<&str>,
    user: Option<Uuid>,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO family_group (id, title, dates, locations, summary, visibility, research_scope, legacy_id, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
         ON CONFLICT (id) DO UPDATE SET title=$2, dates=$3, locations=$4, summary=$5, visibility=$6,
           research_scope=$7, updated_by=$9, updated_at=now()",
    )
    .bind(g.id)
    .bind(&g.title)
    .bind(&g.dates)
    .bind(&g.locations)
    .bind(&g.summary)
    .bind(&g.visibility)
    .bind(&g.research_scope)
    .bind(legacy_id)
    .bind(user)
    .execute(&mut *c)
    .await?;
    sqlx::query("DELETE FROM family_group_member WHERE family_group_id=$1")
        .bind(g.id)
        .execute(&mut *c)
        .await?;
    for (i, m) in g.members.iter().enumerate() {
        sqlx::query(
            "INSERT INTO family_group_member (family_group_id, profile_id, name, relationship, relationship_confidence, citation, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7)",
        )
        .bind(g.id)
        .bind(m.profile_id)
        .bind(&m.name)
        .bind(&m.relationship)
        .bind(m.confidence.as_str())
        .bind(&m.citation)
        .bind(i as i32)
        .execute(&mut *c)
        .await?;
    }
    Ok(())
}

pub async fn delete_group(c: &mut PgConnection, id: Uuid) -> Result<u64> {
    Ok(sqlx::query("DELETE FROM family_group WHERE id=$1")
        .bind(id)
        .execute(c)
        .await?
        .rows_affected())
}

pub async fn clear_research(c: &mut PgConnection) -> Result<()> {
    sqlx::query("DELETE FROM family_group")
        .execute(&mut *c)
        .await?;
    sqlx::query("DELETE FROM profile").execute(&mut *c).await?;
    Ok(())
}

pub async fn set_visibility(
    c: &mut PgConnection,
    table: &str,
    id: Uuid,
    visibility: &str,
    user: Uuid,
) -> Result<u64> {
    let table = if table == "family_group" {
        "family_group"
    } else {
        "profile"
    };
    Ok(sqlx::query(&format!(
        "UPDATE {table} SET visibility=$2, updated_by=$3, updated_at=now() WHERE id=$1"
    ))
    .bind(id)
    .bind(visibility)
    .bind(user)
    .execute(c)
    .await?
    .rows_affected())
}

// ---------- audit and backups ----------

pub async fn audit(
    c: &mut PgConnection,
    user: Option<Uuid>,
    action: &str,
    entity: &str,
    entity_id: Option<&str>,
    before: Option<&Value>,
    after: Option<&Value>,
) -> Result<()> {
    sqlx::query("INSERT INTO audit_log (user_id, action, entity, entity_id, before, after) VALUES ($1,$2,$3,$4,$5,$6)")
        .bind(user)
        .bind(action)
        .bind(entity)
        .bind(entity_id)
        .bind(before)
        .bind(after)
        .execute(c)
        .await?;
    Ok(())
}

#[derive(Debug, FromRow, serde::Serialize)]
pub struct AuditRow {
    pub id: i64,
    pub at: chrono::DateTime<chrono::Utc>,
    pub email: Option<String>,
    pub action: String,
    pub entity: String,
    pub entity_id: Option<String>,
    pub before: Option<Value>,
    pub after: Option<Value>,
}

pub async fn audit_log(
    c: &mut PgConnection,
    limit: i64,
    entity_id: Option<&str>,
) -> Result<Vec<AuditRow>> {
    sqlx::query_as(
        "SELECT l.id, l.at, u.email, l.action, l.entity, l.entity_id, l.before, l.after
         FROM audit_log l LEFT JOIN app_user u ON u.id = l.user_id
         WHERE $2::text IS NULL OR l.entity_id = $2 ORDER BY l.id DESC LIMIT $1",
    )
    .bind(limit)
    .bind(entity_id)
    .fetch_all(c)
    .await
}

#[derive(Debug, FromRow, serde::Serialize)]
pub struct BackupRow {
    pub id: Uuid,
    pub taken_at: chrono::DateTime<chrono::Utc>,
    pub kind: String,
    pub counts: Value,
}

pub async fn insert_backup(
    c: &mut PgConnection,
    kind: &str,
    user: Option<Uuid>,
    payload: &Value,
    counts: &Value,
) -> Result<Uuid> {
    sqlx::query_scalar("INSERT INTO research_backup (kind, taken_by, payload, counts) VALUES ($1,$2,$3,$4) RETURNING id")
        .bind(kind)
        .bind(user)
        .bind(payload)
        .bind(counts)
        .fetch_one(c)
        .await
}

pub async fn backups(c: &mut PgConnection, limit: i64) -> Result<Vec<BackupRow>> {
    sqlx::query_as(
        "SELECT id, taken_at, kind, counts FROM research_backup ORDER BY taken_at DESC LIMIT $1",
    )
    .bind(limit)
    .fetch_all(c)
    .await
}

pub async fn backup_payload(c: &mut PgConnection, id: Uuid) -> Result<Option<Value>> {
    sqlx::query_scalar("SELECT payload FROM research_backup WHERE id=$1")
        .bind(id)
        .fetch_optional(c)
        .await
}

pub async fn last_backup_at(
    c: &mut PgConnection,
    kind: &str,
) -> Result<Option<chrono::DateTime<chrono::Utc>>> {
    sqlx::query_scalar("SELECT max(taken_at) FROM research_backup WHERE kind=$1")
        .bind(kind)
        .fetch_one(c)
        .await
}

/// Retention (PRD §9): nightly backups for 30 days, then the first of each month for 12 months.
/// Manual and import backups are kept for a year.
pub async fn prune_backups(c: &mut PgConnection) -> Result<u64> {
    Ok(sqlx::query(
        "DELETE FROM research_backup b WHERE
           (kind = 'nightly' AND taken_at < now() - interval '30 days'
             AND (taken_at < now() - interval '12 months' OR b.id <> (
                  SELECT x.id FROM research_backup x WHERE x.kind = 'nightly'
                    AND date_trunc('month', x.taken_at) = date_trunc('month', b.taken_at)
                  ORDER BY x.taken_at LIMIT 1)))
           OR (kind <> 'nightly' AND taken_at < now() - interval '12 months')",
    )
    .execute(c)
    .await?
    .rows_affected())
}

// ---------- OAuth ----------

pub async fn oauth_register_client(
    c: &mut PgConnection,
    id: &str,
    name: &str,
    redirect_uris: &[String],
) -> Result<()> {
    sqlx::query("INSERT INTO oauth_client (id, name, redirect_uris) VALUES ($1,$2,$3)")
        .bind(id)
        .bind(name)
        .bind(redirect_uris)
        .execute(c)
        .await?;
    Ok(())
}

pub async fn oauth_client_name(c: &mut PgConnection, id: &str) -> Result<Option<String>> {
    sqlx::query_scalar("SELECT name FROM oauth_client WHERE id=$1")
        .bind(id)
        .fetch_optional(c)
        .await
}

pub async fn oauth_client_redirects(c: &mut PgConnection, id: &str) -> Result<Option<Vec<String>>> {
    sqlx::query_scalar("SELECT redirect_uris FROM oauth_client WHERE id=$1")
        .bind(id)
        .fetch_optional(c)
        .await
}

#[derive(Debug, FromRow)]
pub struct OAuthRequest {
    pub client_id: String,
    pub redirect_uri: String,
    pub code_challenge: String,
    pub client_state: Option<String>,
    /// Set once the person has signed in; the request then waits for consent.
    pub user_id: Option<Uuid>,
}

pub async fn oauth_save_request(c: &mut PgConnection, id: &str, r: &OAuthRequest) -> Result<()> {
    sqlx::query(
        "INSERT INTO oauth_request (id, client_id, redirect_uri, code_challenge, client_state, user_id, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6, now() + interval '10 minutes')",
    )
    .bind(id)
    .bind(&r.client_id)
    .bind(&r.redirect_uri)
    .bind(&r.code_challenge)
    .bind(&r.client_state)
    .bind(r.user_id)
    .execute(c)
    .await?;
    Ok(())
}

pub async fn oauth_take_request(c: &mut PgConnection, id: &str) -> Result<Option<OAuthRequest>> {
    sqlx::query_as(
        "DELETE FROM oauth_request WHERE id=$1 AND expires_at > now()
         RETURNING client_id, redirect_uri, code_challenge, client_state, user_id",
    )
    .bind(id)
    .fetch_optional(c)
    .await
}

pub async fn oauth_save_code(
    c: &mut PgConnection,
    code_hash: &str,
    user: Uuid,
    r: &OAuthRequest,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO oauth_code (code_hash, client_id, user_id, redirect_uri, code_challenge, expires_at)
         VALUES ($1,$2,$3,$4,$5, now() + interval '5 minutes')",
    )
    .bind(code_hash)
    .bind(&r.client_id)
    .bind(user)
    .bind(&r.redirect_uri)
    .bind(&r.code_challenge)
    .execute(c)
    .await?;
    Ok(())
}

#[derive(Debug, FromRow)]
pub struct OAuthCode {
    pub client_id: String,
    pub user_id: Uuid,
    pub redirect_uri: String,
    pub code_challenge: String,
}

pub async fn oauth_take_code(c: &mut PgConnection, code_hash: &str) -> Result<Option<OAuthCode>> {
    sqlx::query_as(
        "DELETE FROM oauth_code WHERE code_hash=$1 AND expires_at > now()
         RETURNING client_id, user_id, redirect_uri, code_challenge",
    )
    .bind(code_hash)
    .fetch_optional(c)
    .await
}

pub async fn oauth_save_token(
    c: &mut PgConnection,
    hash: &str,
    kind: &str,
    client: &str,
    user: Uuid,
    ttl_secs: i64,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO oauth_token (token_hash, kind, client_id, user_id, expires_at)
         VALUES ($1,$2,$3,$4, now() + make_interval(secs => $5))",
    )
    .bind(hash)
    .bind(kind)
    .bind(client)
    .bind(user)
    .bind(ttl_secs as f64)
    .execute(c)
    .await?;
    Ok(())
}

/// Removes a refresh token (rotation) and returns its client and user.
pub async fn oauth_take_refresh(
    c: &mut PgConnection,
    hash: &str,
    client: &str,
) -> Result<Option<(String, Uuid)>> {
    sqlx::query_as(
        "DELETE FROM oauth_token WHERE token_hash=$1 AND client_id=$2 AND kind='refresh' AND expires_at > now()
         RETURNING client_id, user_id",
    )
    .bind(hash)
    .bind(client)
    .fetch_optional(c)
    .await
}

/// The active user behind a valid access token.
pub async fn oauth_token_user(c: &mut PgConnection, hash: &str) -> Result<Option<User>> {
    sqlx::query_as(
        "SELECT u.id, u.email, u.display_name, u.role, u.active FROM oauth_token t JOIN app_user u ON u.id = t.user_id
         WHERE t.token_hash=$1 AND t.kind='access' AND t.expires_at > now() AND u.active",
    )
    .bind(hash)
    .fetch_optional(c)
    .await
}

pub async fn oauth_cleanup(c: &mut PgConnection) -> Result<()> {
    sqlx::query("DELETE FROM oauth_token WHERE expires_at < now()")
        .execute(&mut *c)
        .await?;
    sqlx::query("DELETE FROM oauth_code WHERE expires_at < now()")
        .execute(&mut *c)
        .await?;
    sqlx::query("DELETE FROM oauth_request WHERE expires_at < now()")
        .execute(&mut *c)
        .await?;
    Ok(())
}
