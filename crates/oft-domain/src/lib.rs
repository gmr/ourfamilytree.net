//! Rules that do not touch the database: the data.js writer, the research JSON formats
//! (the page's version 1 and the export version 2, PRD §6) and input validation.

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub mod research;

/// Writes the datasets and research as a classic script of `const` declarations. The page's
/// app.js shares the global lexical scope, so it reads them exactly as the v114 page declared them.
pub fn render_data_js(datasets: &[(String, Value)], research: &Value, extra: &str) -> String {
    let mut out = String::with_capacity(256 * 1024);
    for (name, value) in datasets {
        out.push_str("const ");
        out.push_str(name);
        out.push('=');
        write_js(&mut out, value);
        out.push_str(";\n");
    }
    out.push_str("const RESEARCH=");
    write_js(&mut out, research);
    out.push_str(";\n");
    out.push_str(extra);
    out
}

/// JSON is valid JavaScript, except that the extractor stores regex literals as
/// `{"$re": [source, flags]}`. `</` is escaped so the output can also sit inside a `<script>`.
fn write_js(out: &mut String, v: &Value) {
    match v {
        Value::Object(o) => {
            if let (1, Some(Value::Array(re))) = (o.len(), o.get("$re"))
                && let [Value::String(src), Value::String(flags)] = re.as_slice()
            {
                out.push('/');
                out.push_str(src);
                out.push('/');
                out.push_str(flags);
                return;
            }
            out.push('{');
            for (i, (k, val)) in o.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                out.push_str(&json_str(k));
                out.push(':');
                write_js(out, val);
            }
            out.push('}');
        }
        Value::Array(a) => {
            out.push('[');
            for (i, val) in a.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_js(out, val);
            }
            out.push(']');
        }
        Value::String(s) => out.push_str(&json_str(s)),
        other => out.push_str(&other.to_string()),
    }
}

fn json_str(s: &str) -> String {
    serde_json::to_string(s)
        .expect("string serializes")
        .replace("</", "<\\/")
        .replace('\u{2028}', "\\u2028")
        .replace('\u{2029}', "\\u2029")
}

/// Confidence of an assignment or a family-group relationship. Nothing else is allowed (PRD §6).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, schemars::JsonSchema)]
pub enum Confidence {
    Proven,
    Probable,
}

impl Confidence {
    pub fn as_str(self) -> &'static str {
        match self {
            Confidence::Proven => "Proven",
            Confidence::Probable => "Probable",
        }
    }
    /// Imports turn anything that is not "Proven" into "Probable" (PRD §6 validation).
    pub fn lenient(s: &str) -> Self {
        if s == "Proven" {
            Confidence::Proven
        } else {
            Confidence::Probable
        }
    }
}

/// Cuts text to `max` characters (not bytes), after trimming.
pub fn cut(s: &str, max: usize) -> String {
    s.trim().chars().take(max).collect()
}

/// PRD §11 #11: no living people. A four-digit year after 1900 in the dates needs a confirmation.
pub fn living_person_risk(birth_death_dates: &str) -> bool {
    let b = birth_death_dates.as_bytes();
    (0..b.len().saturating_sub(3)).any(|i| {
        b[i..i + 4].iter().all(u8::is_ascii_digit)
            && (i == 0 || !b[i - 1].is_ascii_digit())
            && b.get(i + 4).is_none_or(|c| !c.is_ascii_digit())
            && std::str::from_utf8(&b[i..i + 4])
                .ok()
                .and_then(|y| y.parse::<u32>().ok())
                .is_some_and(|y| y > 1900)
    })
}

/// Search normalisation of PRD §7.5: lowercase, non-alphanumerics to spaces, split into words.
pub fn words(s: &str) -> Vec<String> {
    s.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(str::to_string)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn data_js_restores_regex_and_escapes_script_end() {
        let ds = vec![
            (
                "TF".to_string(),
                json!({"m": {"tn": {"$re": ["^Morristown", ""]}}}),
            ),
            ("X".to_string(), json!(["</script>"])),
        ];
        let js = render_data_js(&ds, &json!({"profiles": []}), "");
        assert!(js.contains(r#"const TF={"m":{"tn":/^Morristown/}};"#));
        assert!(js.contains(r#"const X=["<\/script>"];"#));
        assert!(js.contains(r#"const RESEARCH={"profiles":[]};"#));
    }

    #[test]
    fn living_check_finds_years_after_1900_only() {
        assert!(living_person_risk("b. 1931"));
        assert!(!living_person_risk("b. c1757; d. c1833"));
        assert!(!living_person_risk("d. 1900"));
        assert!(!living_person_risk("ref 19311"));
    }

    #[test]
    fn words_match_page_rule() {
        assert_eq!(words("Kent, John"), vec!["kent", "john"]);
    }
}
