//! Structural-fingerprint rkeys for seed records, modeled on
//! didactic's approach (`~/Projects/didactic/didactic/docs/concepts/fingerprints.md`).
//!
//! Algorithm:
//! 1. Take the record body as a `serde_json::Value`.
//! 2. Strip mutable-metadata fields (`createdAt`, `version`) so a
//!    re-publish that only touches those does not burn a new rkey.
//! 3. Render to canonical JSON: keys sorted, no whitespace, no
//!    insignificant zeros on numbers, ASCII-safe escaping.
//! 4. SHA-256 hex digest of the canonical bytes; take the first 24
//!    chars as the rkey (the full digest is overkill and 24 hex chars
//!    leaves enough collision resistance for the registry's record
//!    population).
//!
//! The 24-char rkey gives 96 bits of collision resistance, more than
//! sufficient for a registry that publishes ~700K records and grows
//! by hundreds per quarter.

// Canonical-JSON string builder: `push_str(&format!(..))` reads clearly here.
#![allow(clippy::format_push_string)]

use anyhow::Result;
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};

/// Mutable fields excluded from canonicalisation. A re-publish that
/// only touches these does not change the fingerprint, so the rkey
/// stays stable.
const MUTABLE_FIELDS: &[&str] = &["createdAt", "indexedAt", "publishedAt", "version"];

/// Compute the structural fingerprint rkey for a record body.
///
/// # Errors
/// Propagates JSON serialisation errors, which only happen on
/// non-string keys or other malformed input that `serde_yaml` would
/// have already rejected upstream.
#[allow(
    clippy::unnecessary_wraps,
    reason = "fallible-shaped: canonicalisation may surface errors"
)]
pub fn for_record(body: &Value) -> Result<String> {
    let stripped = strip_mutable(body.clone());
    let canonical = canonicalise(&stripped);
    let mut hasher = Sha256::new();
    hasher.update(canonical.as_bytes());
    let digest = hasher.finalize();
    Ok(hex_short(&digest))
}

fn strip_mutable(value: Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut out = Map::new();
            for (k, v) in map {
                if MUTABLE_FIELDS.contains(&k.as_str()) {
                    continue;
                }
                out.insert(k, strip_mutable(v));
            }
            Value::Object(out)
        }
        Value::Array(items) => Value::Array(items.into_iter().map(strip_mutable).collect()),
        other => other,
    }
}

/// Render a JSON value to a canonical UTF-8 byte string. Keys are
/// sorted lexicographically at every object level, no whitespace is
/// emitted, numbers use the shortest round-trippable form, and
/// strings escape every non-ASCII codepoint via `\uXXXX`.
fn canonicalise(value: &Value) -> String {
    let mut out = String::new();
    write_canonical(value, &mut out);
    out
}

fn write_canonical(value: &Value, out: &mut String) {
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Value::Number(n) => out.push_str(&n.to_string()),
        Value::String(s) => {
            out.push('"');
            for ch in s.chars() {
                match ch {
                    '"' => out.push_str("\\\""),
                    '\\' => out.push_str("\\\\"),
                    '\n' => out.push_str("\\n"),
                    '\r' => out.push_str("\\r"),
                    '\t' => out.push_str("\\t"),
                    '\x08' => out.push_str("\\b"),
                    '\x0c' => out.push_str("\\f"),
                    c if (c as u32) < 0x20 || (c as u32) > 0x7e => {
                        for unit in c.encode_utf16(&mut [0u16; 2]).iter() {
                            out.push_str(&format!("\\u{unit:04x}"));
                        }
                    }
                    c => out.push(c),
                }
            }
            out.push('"');
        }
        Value::Array(items) => {
            out.push('[');
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_canonical(item, out);
            }
            out.push(']');
        }
        Value::Object(map) => {
            out.push('{');
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort();
            for (i, k) in keys.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_canonical(&Value::String((*k).clone()), out);
                out.push(':');
                write_canonical(&map[*k], out);
            }
            out.push('}');
        }
    }
}

fn hex_short(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(24);
    for byte in &bytes[..12] {
        out.push_str(&format!("{byte:02x}"));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fingerprint_is_stable_on_key_order() {
        let a = serde_json::json!({"name": "NOUN", "kind": "pos", "id": "n"});
        let b = serde_json::json!({"id": "n", "name": "NOUN", "kind": "pos"});
        assert_eq!(for_record(&a).unwrap(), for_record(&b).unwrap());
    }

    #[test]
    fn fingerprint_ignores_mutable_metadata() {
        let a = serde_json::json!({"name": "NOUN", "createdAt": "2026-01-01T00:00:00Z"});
        let b = serde_json::json!({"name": "NOUN", "createdAt": "2099-12-31T23:59:59Z"});
        assert_eq!(for_record(&a).unwrap(), for_record(&b).unwrap());
    }

    #[test]
    fn fingerprint_changes_on_substantive_edit() {
        let a = serde_json::json!({"name": "NOUN", "kind": "pos"});
        let b = serde_json::json!({"name": "NOUN", "kind": "POS"});
        assert_ne!(for_record(&a).unwrap(), for_record(&b).unwrap());
    }

    #[test]
    fn fingerprint_is_24_hex_chars() {
        let v = serde_json::json!({"x": 1});
        let fp = for_record(&v).unwrap();
        assert_eq!(fp.len(), 24);
        assert!(fp.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
