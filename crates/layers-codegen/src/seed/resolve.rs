//! Resolve handle-form AT-URIs in seed bodies to DID-form.
//!
//! Seed YAMLs reference other accounts by handle
//! (`at://ud.ontology.layers.pub/pub.layers.ontology.typeDef/...`)
//! because handles are stable across deployments and authored
//! before any DID exists. The wire-format AT-URIs that land on
//! the PDS — and that every typed downstream consumer parses
//! through `idiolect_records::AtUri` — must use DID authorities
//! (`at://did:plc:.../...`). This module bridges the two forms.
//!
//! The publisher captures a handle → DID map as it provisions
//! account sessions, then runs [`rewrite_body`] over each seed
//! body just before `putRecord`. Any AT-URI whose authority is
//! a handle in the map gets its authority swapped for the DID;
//! AT-URIs already in DID form pass through untouched.
//!
//! Resolution is structural: it walks the JSON `Value` tree
//! string-by-string, so an AT-URI buried inside an arbitrarily
//! nested feature dict still resolves. It never touches strings
//! that don't start with `at://`, so seed text fields holding
//! prose with stray `at://` substrings aren't corrupted (in
//! practice nothing in `pub.layers.*` carries such prose, but
//! the prefix gate keeps the function safe regardless).

use std::collections::BTreeMap;

use serde_json::Value;

/// A snapshot of the `<handle> → <DID>` mapping for one seed
/// publish run.
#[derive(Debug, Default, Clone)]
pub struct HandleDidMap {
    inner: BTreeMap<String, String>,
}

impl HandleDidMap {
    /// Construct an empty map.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Record that `handle` resolves to `did` for this run.
    pub fn insert(&mut self, handle: impl Into<String>, did: impl Into<String>) {
        self.inner.insert(handle.into(), did.into());
    }

    /// Look up the DID for `handle`, if known.
    #[must_use]
    pub fn get(&self, handle: &str) -> Option<&str> {
        self.inner.get(handle).map(String::as_str)
    }
}

/// Result of rewriting one body.
#[derive(Debug, Default, Clone, Copy)]
pub struct RewriteReport {
    /// Number of AT-URIs whose authority got swapped from a
    /// handle to a DID.
    pub resolved: usize,
    /// Number of AT-URIs whose handle authority isn't in the map
    /// (`unresolved`) — the caller decides whether to fail or warn.
    pub unresolved: usize,
}

/// Rewrite every handle-form AT-URI inside `body` to its DID
/// counterpart using `map`. Returns counts of (resolved,
/// unresolved) URIs.
///
/// AT-URIs whose authority is already a DID
/// (`at://did:plc:.../...`) are skipped silently. AT-URIs whose
/// authority is a handle not in the map are left as-is and
/// counted under `unresolved`; the publisher logs them so the
/// operator can either supply credentials for the missing
/// account or abort.
pub fn rewrite_body(body: &mut Value, map: &HandleDidMap) -> RewriteReport {
    let mut report = RewriteReport::default();
    walk(body, map, &mut report);
    report
}

fn walk(value: &mut Value, map: &HandleDidMap, report: &mut RewriteReport) {
    match value {
        Value::String(s) => {
            if let Some(replacement) = rewrite_at_uri(s, map, report) {
                *s = replacement;
            }
        }
        Value::Array(items) => {
            for item in items {
                walk(item, map, report);
            }
        }
        Value::Object(fields) => {
            for v in fields.values_mut() {
                walk(v, map, report);
            }
        }
        _ => {}
    }
}

/// Returns `Some(new)` when `s` is an AT-URI whose handle
/// authority resolves through `map`, otherwise `None`. Side
/// effect: updates counts in `report`.
fn rewrite_at_uri(s: &str, map: &HandleDidMap, report: &mut RewriteReport) -> Option<String> {
    let body = s.strip_prefix("at://")?;
    let (authority, rest) = body.split_once('/')?;
    // DID authorities pass through. We don't need to validate the
    // shape here — typed consumers do that on the way back in.
    if authority.starts_with("did:") {
        return None;
    }
    // Plausibility gate: at-uri authorities are either DIDs or
    // dotted DNS-style handles. If neither, treat as non-AT-URI
    // text (don't touch, don't count).
    if !authority.contains('.') {
        return None;
    }
    if let Some(did) = map.get(authority) {
        report.resolved += 1;
        Some(format!("at://{did}/{rest}"))
    } else {
        report.unresolved += 1;
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn fixture_map() -> HandleDidMap {
        let mut m = HandleDidMap::new();
        m.insert("ud.ontology.layers.pub", "did:plc:ud-fake");
        m.insert("ewt.eng.ud.segmentation.layers.pub", "did:plc:seg-ewt-fake");
        m
    }

    #[test]
    fn rewrites_top_level_at_uri_string_fields() {
        let mut body = json!({
            "ontologyRef": "at://ud.ontology.layers.pub/pub.layers.ontology.ontology/ud-pos-v2",
            "kind": "token-tag",
        });
        let report = rewrite_body(&mut body, &fixture_map());
        assert_eq!(report.resolved, 1);
        assert_eq!(report.unresolved, 0);
        assert_eq!(
            body["ontologyRef"],
            json!("at://did:plc:ud-fake/pub.layers.ontology.ontology/ud-pos-v2"),
        );
    }

    #[test]
    fn rewrites_nested_anchor_at_uris() {
        let mut body = json!({
            "annotations": [
                {
                    "anchor": {
                        "$type": "pub.layers.defs#tokenRef",
                        "segmentation": "at://ewt.eng.ud.segmentation.layers.pub/pub.layers.segmentation.segmentation/seg-1",
                        "tokenization": 0,
                        "token": 0
                    },
                    "label": "NOUN"
                }
            ]
        });
        let report = rewrite_body(&mut body, &fixture_map());
        assert_eq!(report.resolved, 1);
        assert_eq!(
            body["annotations"][0]["anchor"]["segmentation"],
            json!("at://did:plc:seg-ewt-fake/pub.layers.segmentation.segmentation/seg-1"),
        );
    }

    #[test]
    fn passes_through_did_form_at_uris_untouched() {
        let mut body = json!({
            "ontologyRef": "at://did:plc:already-did/pub.layers.ontology.ontology/ud",
        });
        let before = body.clone();
        let report = rewrite_body(&mut body, &fixture_map());
        assert_eq!(report.resolved, 0);
        assert_eq!(report.unresolved, 0);
        assert_eq!(body, before);
    }

    #[test]
    fn counts_unresolved_handle_uris() {
        let mut body = json!({
            "ontologyRef": "at://unknown.handle.layers.pub/pub.layers.ontology.ontology/x",
        });
        let report = rewrite_body(&mut body, &fixture_map());
        assert_eq!(report.resolved, 0);
        assert_eq!(report.unresolved, 1);
    }

    #[test]
    fn does_not_corrupt_non_at_uri_strings() {
        let mut body = json!({
            "description": "see at://, the AT Protocol scheme; also https://example.com",
            "url": "https://layers.pub/about/registry",
        });
        let before = body.clone();
        let report = rewrite_body(&mut body, &fixture_map());
        assert_eq!(report.resolved, 0);
        assert_eq!(report.unresolved, 0);
        assert_eq!(body, before);
    }
}
