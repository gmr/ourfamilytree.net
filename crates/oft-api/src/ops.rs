//! Research operations shared by the MCP tools, the CLI and the nightly job.

use oft_db::sqlx::{PgConnection, PgPool};
use oft_domain::research::{Assignment, ImportSet, Research, parse_import};
use serde_json::{Value, json};
use std::collections::HashMap;
use uuid::Uuid;

pub type Error = Box<dyn std::error::Error + Send + Sync>;

pub fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

/// Stores a backup of all research and returns its id.
pub async fn backup(c: &mut PgConnection, kind: &str, user: Option<Uuid>) -> Result<Uuid, Error> {
    let r = oft_db::research(c).await?;
    Ok(oft_db::insert_backup(c, kind, user, &r.to_export(&now()), &r.counts()).await?)
}

#[derive(Debug, Default, serde::Serialize)]
pub struct ImportReport {
    pub mode: String,
    pub dry_run: bool,
    pub file_version: u64,
    pub profiles_in_file: usize,
    pub family_groups_in_file: usize,
    pub profiles_added: usize,
    pub family_groups_added: usize,
    pub skipped_existing: usize,
    pub assignments_attached: usize,
    /// Assignments whose record was found only by matching the snapshot (not by id or hash).
    pub matched_by_snapshot: usize,
    pub unmatched_assignments: Vec<Value>,
    pub backup_id: Option<Uuid>,
}

/// Imports a research file (v1 or v2). `merge` adds new items and keeps existing ones when an
/// id matches; `replace` deletes all research first. A `pre_import` backup is taken before any
/// change. With `dry_run` nothing is written and the report shows what would happen.
pub async fn import(
    pool: &PgPool,
    file: Value,
    replace: bool,
    dry_run: bool,
    user: Option<Uuid>,
) -> Result<ImportReport, Error> {
    let set: ImportSet = parse_import(file)?;
    let mut tx = pool.begin().await?;
    let existing = oft_db::research(&mut tx).await?;
    let mut rep = ImportReport {
        mode: if replace { "replace" } else { "merge" }.into(),
        dry_run,
        file_version: set.version,
        profiles_in_file: set.profiles.len(),
        family_groups_in_file: set.groups.len(),
        ..Default::default()
    };
    if !dry_run {
        rep.backup_id = Some(backup(&mut tx, "pre_import", user).await?);
        if replace {
            oft_db::clear_research(&mut tx).await?;
        }
    }
    let known_profiles: std::collections::HashSet<Uuid> = if replace {
        Default::default()
    } else {
        existing.profiles.iter().map(|p| p.id).collect()
    };
    let known_groups: std::collections::HashSet<Uuid> = if replace {
        Default::default()
    } else {
        existing.family_groups.iter().map(|g| g.id).collect()
    };
    // v1 ids are not UUIDs, so each import gives them new UUIDs; the old id (`legacy_id`) shows
    // that the item was imported before.
    let (old_profiles, old_groups) = if replace {
        Default::default()
    } else {
        (
            oft_db::legacy_ids(&mut tx, false).await?,
            oft_db::legacy_ids(&mut tx, true).await?,
        )
    };
    let mut stored_as: HashMap<Uuid, Uuid> = HashMap::new();
    let mut saved = known_profiles.clone();

    for ip in &set.profiles {
        let stored = ip.legacy_id.as_ref().and_then(|l| old_profiles.get(l));
        if let Some(&s) = stored {
            stored_as.insert(ip.profile.id, s);
        }
        if known_profiles.contains(&ip.profile.id) || stored.is_some() {
            rep.skipped_existing += 1;
            continue;
        }
        if ip.profile.full_name.is_empty() {
            rep.unmatched_assignments
                .push(json!({"profile": ip.legacy_id, "problem": "profile has no name; skipped"}));
            continue;
        }
        rep.profiles_added += 1;
        saved.insert(ip.profile.id);
        if !dry_run {
            oft_db::save_profile(&mut tx, &ip.profile, ip.legacy_id.as_deref(), user).await?;
        }
        for a in &ip.assignments {
            let mut rec = None;
            if let Some(id) = a.record_id {
                rec = oft_db::record(&mut tx, &id.to_string()).await?;
            }
            if rec.is_none() && !a.legacy_hash.is_empty() {
                rec = oft_db::record(&mut tx, &a.legacy_hash).await?;
            }
            rec = rec.filter(|r| r.status == "active");
            if rec.is_none() {
                rec = oft_db::record_by_snapshot(&mut tx, &a.snapshot).await?;
                if rec.is_some() {
                    rep.matched_by_snapshot += 1;
                }
            }
            let Some(rec) = rec else {
                rep.unmatched_assignments.push(json!({
                    "profile": ip.profile.full_name, "recordId": a.record_id, "legacyHash": a.legacy_hash, "ref": a.snapshot,
                }));
                continue;
            };
            if a.explanation.is_empty() {
                rep.unmatched_assignments.push(json!({
                    "profile": ip.profile.full_name, "legacyHash": rec.legacy_hash, "problem": "no explanation; skipped",
                }));
                continue;
            }
            rep.assignments_attached += 1;
            if !dry_run {
                let asg = Assignment {
                    record_id: rec.id,
                    legacy_hash: rec.legacy_hash.clone(),
                    confidence: a.confidence,
                    explanation: a.explanation.clone(),
                    snapshot: if a.snapshot.c.is_empty() {
                        rec.snapshot()
                    } else {
                        a.snapshot.clone()
                    },
                    marker_keys: rec.marker_keys.clone(),
                };
                oft_db::insert_assignment(&mut tx, ip.profile.id, &asg, user).await?;
            }
        }
    }
    for ig in &set.groups {
        let imported_before = ig
            .legacy_id
            .as_ref()
            .is_some_and(|l| old_groups.contains_key(l));
        if known_groups.contains(&ig.group.id) || imported_before {
            rep.skipped_existing += 1;
            continue;
        }
        let mut g = ig.group.clone();
        // Members need a name, a relationship and a citation (PRD §4.2); fill what the page allowed empty.
        g.members.retain(|m| !m.name.is_empty());
        for m in &mut g.members {
            // Link to the stored profile; a profile that is neither stored nor added keeps the name only.
            m.profile_id = m
                .profile_id
                .map(|id| *stored_as.get(&id).unwrap_or(&id))
                .filter(|id| saved.contains(id));
            if m.relationship.is_empty() {
                m.relationship = "(not stated)".into();
            }
            if m.citation.is_empty() {
                m.citation = "(not stated)".into();
            }
        }
        if g.title.is_empty() {
            g.title = "(untitled)".into();
        }
        rep.family_groups_added += 1;
        if !dry_run {
            oft_db::save_group(&mut tx, &g, ig.legacy_id.as_deref(), user).await?;
        }
    }
    if !dry_run {
        let after = json!({"report": serde_json::to_value(&rep)?});
        oft_db::audit(
            &mut tx,
            user,
            "import",
            "research",
            None,
            None,
            Some(&after),
        )
        .await?;
        tx.commit().await?;
    }
    Ok(rep)
}

/// Replaces all research with a backup, after taking a `pre_restore` backup.
pub async fn restore(pool: &PgPool, id: Uuid, user: Option<Uuid>) -> Result<ImportReport, Error> {
    let mut c = pool.acquire().await?;
    let payload = oft_db::backup_payload(&mut c, id)
        .await?
        .ok_or("no backup with that id")?;
    drop(c);
    let mut tx = pool.begin().await?;
    backup(&mut tx, "pre_restore", user).await?;
    tx.commit().await?;
    let rep = import(pool, payload, true, false, user).await?;
    let mut c = pool.acquire().await?;
    oft_db::audit(
        &mut c,
        user,
        "restore",
        "research",
        Some(&id.to_string()),
        None,
        None,
    )
    .await?;
    Ok(rep)
}

pub async fn export(pool: &PgPool, user: Option<Uuid>) -> Result<(Value, Uuid), Error> {
    let mut tx = pool.begin().await?;
    let r: Research = oft_db::research(&mut tx).await?;
    let payload = r.to_export(&now());
    let id = oft_db::insert_backup(&mut tx, "manual", user, &payload, &r.counts()).await?;
    oft_db::audit(
        &mut tx,
        user,
        "export",
        "research",
        Some(&id.to_string()),
        None,
        None,
    )
    .await?;
    tx.commit().await?;
    Ok((payload, id))
}
