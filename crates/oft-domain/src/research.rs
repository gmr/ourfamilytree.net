//! Research data (profiles, assignments, family groups) and its two JSON shapes:
//! the page's own format (v1, also what the browser reads) and the export format (v2, PRD §6).

use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::{Confidence, cut};

/// Lengths an import keeps of a snapshot's citation, details and place (characters).
pub const SNAPSHOT_C: usize = 300;
pub const SNAPSHOT_D: usize = 400;
pub const SNAPSHOT_P: usize = 200;

/// What an assignment saw of its record when it was made (PRD §6 `snapshot`).
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Snapshot {
    #[serde(default)]
    pub y: String,
    #[serde(default)]
    pub t: String,
    #[serde(default)]
    pub c: String,
    #[serde(default)]
    pub d: String,
    #[serde(default)]
    pub p: String,
}

#[derive(Debug, Clone)]
pub struct Assignment {
    pub record_id: Uuid,
    pub legacy_hash: String,
    pub confidence: Confidence,
    pub explanation: String,
    pub snapshot: Snapshot,
    pub marker_keys: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct Profile {
    pub id: Uuid,
    pub full_name: String,
    pub spelling_variants: Vec<String>,
    pub birth_death_dates: String,
    pub locations: Vec<String>,
    pub bio_summary: String,
    pub visibility: String,
    pub research_scope: String,
    pub assignments: Vec<Assignment>,
}

#[derive(Debug, Clone)]
pub struct Member {
    pub profile_id: Option<Uuid>,
    pub name: String,
    pub relationship: String,
    pub confidence: Confidence,
    pub citation: String,
}

#[derive(Debug, Clone)]
pub struct FamilyGroup {
    pub id: Uuid,
    pub title: String,
    pub dates: String,
    pub locations: Vec<String>,
    pub summary: String,
    pub visibility: String,
    pub research_scope: String,
    pub members: Vec<Member>,
}

#[derive(Debug, Clone, Default)]
pub struct Research {
    pub profiles: Vec<Profile>,
    pub family_groups: Vec<FamilyGroup>,
}

impl Research {
    /// Keeps only published items; members that point at a draft profile keep their name only.
    pub fn published(&self) -> Research {
        let profiles: Vec<Profile> = self
            .profiles
            .iter()
            .filter(|p| p.visibility == "published")
            .cloned()
            .collect();
        let shown: HashSet<Uuid> = profiles.iter().map(|p| p.id).collect();
        let family_groups = self
            .family_groups
            .iter()
            .filter(|g| g.visibility == "published")
            .cloned()
            .map(|mut g| {
                for m in &mut g.members {
                    m.profile_id = m.profile_id.filter(|id| shown.contains(id));
                }
                g
            })
            .collect();
        Research {
            profiles,
            family_groups,
        }
    }

    /// The shape the page's research code reads (its `kentmap-research-v1` store).
    pub fn to_page(&self) -> Value {
        json!({
            "version": 1,
            "profiles": self.profiles.iter().map(|p| json!({
                "id": p.id,
                "fullName": p.full_name,
                "spellingVariants": p.spelling_variants,
                "birthDeathDates": p.birth_death_dates,
                "locations": p.locations,
                "bioSummary": p.bio_summary,
                "visibility": p.visibility,
                "assignedRecords": p.assignments.iter().map(|a| json!({
                    "recordId": a.legacy_hash,
                    "confidence": a.confidence.as_str(),
                    "explanation": a.explanation,
                    "ref": {"y": a.snapshot.y, "t": a.snapshot.t, "c": a.snapshot.c,
                            "d": a.snapshot.d, "p": a.snapshot.p, "mk": a.marker_keys},
                })).collect::<Vec<_>>(),
            })).collect::<Vec<_>>(),
            "familyGroups": self.family_groups.iter().map(|g| json!({
                "id": g.id,
                "title": g.title,
                "dates": g.dates,
                "locations": g.locations,
                "summary": g.summary,
                "visibility": g.visibility,
                "members": g.members.iter().map(member_json).collect::<Vec<_>>(),
            })).collect::<Vec<_>>(),
        })
    }

    /// Export format version 2 (PRD §6).
    pub fn to_export(&self, exported_at: &str) -> Value {
        json!({
            "version": 2,
            "exportedAt": exported_at,
            "profiles": self.profiles.iter().map(|p| json!({
                "id": p.id,
                "fullName": p.full_name,
                "spellingVariants": p.spelling_variants,
                "birthDeathDates": p.birth_death_dates,
                "locations": p.locations,
                "bioSummary": p.bio_summary,
                "visibility": p.visibility,
                "researchScope": p.research_scope,
                "assignedRecords": p.assignments.iter().map(|a| json!({
                    "recordId": a.record_id,
                    "legacyHash": a.legacy_hash,
                    "confidence": a.confidence.as_str(),
                    "explanation": a.explanation,
                    "ref": {"y": a.snapshot.y, "t": a.snapshot.t, "c": a.snapshot.c,
                            "d": a.snapshot.d, "p": a.snapshot.p, "mk": a.marker_keys},
                })).collect::<Vec<_>>(),
            })).collect::<Vec<_>>(),
            "familyGroups": self.family_groups.iter().map(|g| json!({
                "id": g.id,
                "title": g.title,
                "dates": g.dates,
                "locations": g.locations,
                "summary": g.summary,
                "visibility": g.visibility,
                "researchScope": g.research_scope,
                "members": g.members.iter().map(member_json).collect::<Vec<_>>(),
            })).collect::<Vec<_>>(),
        })
    }

    pub fn counts(&self) -> Value {
        json!({
            "profiles": self.profiles.len(),
            "familyGroups": self.family_groups.len(),
            "assignments": self.profiles.iter().map(|p| p.assignments.len()).sum::<usize>(),
        })
    }
}

fn member_json(m: &Member) -> Value {
    json!({
        "profileId": m.profile_id.map(|u| u.to_string()).unwrap_or_default(),
        "name": m.name,
        "relationship": m.relationship,
        "confidence": m.confidence.as_str(),
        "citation": m.citation,
    })
}

// ---------- import (accepts version 1 and version 2) ----------

/// An assignment as read from a file: the record is found later by uuid, then legacy hash,
/// then snapshot (PRD §11 #9).
#[derive(Debug, Clone)]
pub struct ImportAssignment {
    pub record_id: Option<Uuid>,
    pub legacy_hash: String,
    pub confidence: Confidence,
    pub explanation: String,
    pub snapshot: Snapshot,
}

#[derive(Debug, Clone)]
pub struct ImportProfile {
    pub profile: Profile,
    pub legacy_id: Option<String>,
    pub assignments: Vec<ImportAssignment>,
}

#[derive(Debug, Clone)]
pub struct ImportGroup {
    pub group: FamilyGroup,
    pub legacy_id: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct ImportSet {
    pub version: u64,
    pub profiles: Vec<ImportProfile>,
    pub groups: Vec<ImportGroup>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct InFile {
    version: u64,
    profiles: Vec<InProfile>,
    family_groups: Vec<InGroup>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct InProfile {
    id: Value,
    full_name: String,
    spelling_variants: StrList,
    birth_death_dates: String,
    locations: StrList,
    bio_summary: String,
    visibility: String,
    research_scope: String,
    assigned_records: Vec<InAssignment>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct InAssignment {
    record_id: String,
    legacy_hash: String,
    confidence: String,
    explanation: String,
    #[serde(rename = "ref")]
    snapshot: Snapshot,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct InGroup {
    id: Value,
    title: String,
    dates: String,
    locations: StrList,
    summary: String,
    visibility: String,
    research_scope: String,
    members: Vec<InMember>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct InMember {
    profile_id: String,
    name: String,
    relationship: String,
    confidence: String,
    citation: String,
}

/// The page accepts a list or a comma-separated string.
#[derive(Default)]
struct StrList(Vec<String>);
impl<'de> Deserialize<'de> for StrList {
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        Ok(StrList(match Value::deserialize(d)? {
            Value::Array(a) => a
                .iter()
                .filter_map(|v| v.as_str())
                .map(|s| cut(s, 200))
                .filter(|s| !s.is_empty())
                .collect(),
            Value::String(s) => s
                .split([',', ';', '\n'])
                .map(|x| cut(x, 200))
                .filter(|x| !x.is_empty())
                .collect(),
            _ => vec![],
        }))
    }
}

fn pick<'a>(v: &'a str, allowed: &[&'a str], default: &'a str) -> String {
    if allowed.contains(&v) { v } else { default }.to_string()
}

/// Validates and normalises a research file (PRD §6 "Validation on import"): ids that are not
/// UUIDs become new UUIDs (the old id is kept as `legacy_id`), duplicate ids get new ones,
/// text is cut to the limits, and any confidence other than Proven becomes Probable.
pub fn parse_import(v: Value) -> Result<ImportSet, String> {
    if !v.get("profiles").is_some_and(Value::is_array)
        && !v.get("familyGroups").is_some_and(Value::is_array)
    {
        return Err("this is not a research JSON file (no profiles or familyGroups)".into());
    }
    let f: InFile = serde_json::from_value(v).map_err(|e| format!("invalid research JSON: {e}"))?;
    let mut seen = HashSet::new();
    let mut id_map: HashMap<String, Uuid> = HashMap::new();
    let new_id = |raw: &Value,
                  seen: &mut HashSet<Uuid>,
                  id_map: &mut HashMap<String, Uuid>|
     -> (Uuid, Option<String>) {
        let s = raw.as_str().unwrap_or_default().to_string();
        let parsed = Uuid::parse_str(&s).ok().filter(|u| !seen.contains(u));
        let id = parsed.unwrap_or_else(Uuid::new_v4);
        seen.insert(id);
        if !s.is_empty() {
            id_map.insert(s.clone(), id);
        }
        (id, (parsed.is_none() && !s.is_empty()).then_some(s))
    };

    let mut profiles = vec![];
    for p in f.profiles {
        let (id, legacy_id) = new_id(&p.id, &mut seen, &mut id_map);
        let assignments = p
            .assigned_records
            .into_iter()
            .filter(|a| !a.record_id.is_empty() || !a.legacy_hash.is_empty())
            .map(|a| {
                let uuid = Uuid::parse_str(&a.record_id).ok();
                let legacy_hash = if !a.legacy_hash.is_empty() {
                    a.legacy_hash
                } else if uuid.is_none() {
                    a.record_id
                } else {
                    String::new()
                };
                ImportAssignment {
                    record_id: uuid,
                    legacy_hash: cut(&legacy_hash, 60),
                    confidence: Confidence::lenient(&a.confidence),
                    explanation: cut(&a.explanation, 600),
                    snapshot: Snapshot {
                        y: cut(&a.snapshot.y, 60),
                        t: cut(&a.snapshot.t, 60),
                        c: cut(&a.snapshot.c, SNAPSHOT_C),
                        d: cut(&a.snapshot.d, SNAPSHOT_D),
                        p: cut(&a.snapshot.p, SNAPSHOT_P),
                    },
                }
            })
            .collect();
        profiles.push(ImportProfile {
            profile: Profile {
                id,
                full_name: cut(&p.full_name, 200),
                spelling_variants: p.spelling_variants.0,
                birth_death_dates: cut(&p.birth_death_dates, 200),
                locations: p.locations.0,
                bio_summary: cut(&p.bio_summary, 4000),
                visibility: pick(&p.visibility, &["draft", "published"], "draft"),
                research_scope: pick(
                    &p.research_scope,
                    &["general", "project", "own_line"],
                    "general",
                ),
                assignments: vec![],
            },
            legacy_id,
            assignments,
        });
    }
    let mut groups = vec![];
    for g in f.family_groups {
        let (id, legacy_id) = new_id(&g.id, &mut seen, &mut id_map);
        groups.push(ImportGroup {
            group: FamilyGroup {
                id,
                title: cut(&g.title, 200),
                dates: cut(&g.dates, 200),
                locations: g.locations.0,
                summary: cut(&g.summary, 4000),
                visibility: pick(&g.visibility, &["draft", "published"], "draft"),
                research_scope: pick(
                    &g.research_scope,
                    &["general", "project", "own_line"],
                    "general",
                ),
                members: g
                    .members
                    .into_iter()
                    .map(|m| Member {
                        profile_id: id_map.get(&m.profile_id).copied(),
                        name: cut(&m.name, 200),
                        relationship: cut(&m.relationship, 300),
                        confidence: Confidence::lenient(&m.confidence),
                        citation: cut(&m.citation, 600),
                    })
                    .collect(),
            },
            legacy_id,
        });
    }
    // A member that names a profile but has no typed name takes the profile's name.
    let names: HashMap<Uuid, String> = profiles
        .iter()
        .map(|p| (p.profile.id, p.profile.full_name.clone()))
        .collect();
    for g in &mut groups {
        for m in &mut g.group.members {
            if m.name.is_empty()
                && let Some(n) = m.profile_id.and_then(|id| names.get(&id))
            {
                m.name = n.clone();
            }
        }
    }
    Ok(ImportSet {
        version: f.version,
        profiles,
        groups,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn v1_import_maps_ids_and_hashes() {
        let v = json!({"version": 1, "profiles": [
            {"id": "p_abc", "fullName": " Elias Kent ", "spellingVariants": "Kent, Kint",
             "assignedRecords": [{"recordId": "rdb3e7b5b7c1972af", "confidence": "Possible", "explanation": "x",
                                  "ref": {"y": "1794", "t": "B/M/D", "c": "c", "d": "d", "p": "Caldwell"}}]}],
            "familyGroups": [{"id": "fg_1", "title": "T", "members": [
                {"profileId": "p_abc", "name": "", "relationship": "son of", "confidence": "Proven", "citation": "c"}]}]});
        let s = parse_import(v).unwrap();
        let p = &s.profiles[0];
        assert_eq!(p.profile.full_name, "Elias Kent");
        assert_eq!(p.profile.spelling_variants, vec!["Kent", "Kint"]);
        assert_eq!(p.legacy_id.as_deref(), Some("p_abc"));
        assert_eq!(p.assignments[0].legacy_hash, "rdb3e7b5b7c1972af");
        assert_eq!(p.assignments[0].confidence, Confidence::Probable);
        let m = &s.groups[0].group.members[0];
        assert_eq!(m.profile_id, Some(p.profile.id));
        assert_eq!(m.name, "Elias Kent");
    }

    #[test]
    fn duplicate_ids_get_new_uuids() {
        let id = Uuid::new_v4().to_string();
        let v = json!({"profiles": [{"id": id, "fullName": "A"}, {"id": id, "fullName": "B"}]});
        let s = parse_import(v).unwrap();
        assert_ne!(s.profiles[0].profile.id, s.profiles[1].profile.id);
    }

    #[test]
    fn rejects_other_json() {
        assert!(parse_import(json!({"a": 1})).is_err());
    }
}
