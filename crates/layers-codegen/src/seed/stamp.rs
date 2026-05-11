//! Stamp deterministic UUIDs onto the bodies the lexicons say
//! require them.
//!
//! The lexicons mark a `uuid` field as `required` on three nested
//! structures: annotation entries (`pub.layers.annotation.defs#annotation`),
//! segmentation tokens (`pub.layers.segmentation.defs#token`), and
//! cluster members (`pub.layers.annotation.defs#cluster`). Lenses
//! and seed scripts don't emit these because the natural
//! authoring shape is "give me a list of annotations / tokens";
//! requiring every author to invent UUIDs would be friction.
//!
//! The publisher stamps them just before fingerprinting using
//! UUID v5 over a stable name derived from the surrounding
//! record + the entry's index. Identical input → identical
//! UUID, so re-running the publisher against the same seed
//! YAML produces the same on-PDS UUIDs (and therefore the same
//! structural-fingerprint rkey).
//!
//! Ordering invariant: stamping must happen **after**
//! [`super::resolve::rewrite_body`] (so the UUID name covers
//! the wire shape, not the authoring shape) and **before**
//! [`super::fingerprint::for_record`] (so the rkey is stable
//! against the stamped form).
//!
//! Stamping is idempotent: an entry that already carries a UUID
//! is left untouched.
use serde_json::Value;
use uuid::Uuid;

/// Namespace UUID v5 for Layers' seed-time UUID derivation.
/// Generated once with `Uuid::new_v5(&Uuid::NAMESPACE_URL,
/// b"https://layers.pub/seed-uuid-namespace")`; constant
/// thereafter so re-runs are reproducible.
const SEED_NAMESPACE: Uuid = Uuid::from_bytes([
    0x2f, 0x5b, 0xcd, 0x4c, 0xc0, 0x96, 0x5b, 0xe5, 0xae, 0x2f, 0xc5, 0x88, 0x40, 0xc1, 0x6e, 0xf2,
]);

/// Result of a stamping pass.
#[derive(Debug, Default, Clone, Copy)]
pub struct StampReport {
    /// Number of UUIDs that were missing and got stamped in.
    pub stamped: usize,
    /// Number of UUIDs that were already present and left as-is.
    pub already_present: usize,
}

/// Walk `body` and stamp UUIDs onto every entry the lexicons
/// require one for. `collection` is the record's NSID so the
/// stamper knows which nested arrays to look at.
pub fn stamp_uuids(body: &mut Value, collection: &str) -> StampReport {
    let mut report = StampReport::default();
    match collection {
        "pub.layers.annotation.annotationLayer" => {
            stamp_array(body, "annotations", &mut report);
        }
        "pub.layers.annotation.clusterSet" => {
            stamp_array(body, "clusters", &mut report);
            // Cluster members are themselves objects with required
            // uuid; stamp them too.
            if let Some(clusters) = body.get_mut("clusters").and_then(Value::as_array_mut) {
                for (i, cluster) in clusters.iter_mut().enumerate() {
                    if let Some(members) =
                        cluster.get_mut("members").and_then(Value::as_array_mut)
                    {
                        for (j, member) in members.iter_mut().enumerate() {
                            stamp_object(
                                member,
                                &format!("clusterSet:cluster:{i}:member:{j}"),
                                &mut report,
                            );
                        }
                    }
                }
            }
        }
        "pub.layers.segmentation.segmentation" => {
            // Per `pub.layers.segmentation.defs#tokenization`, the
            // tokenization wrapper carries the required `uuid`;
            // individual tokens require only `tokenIndex`.
            if let Some(tokenizations) = body
                .get_mut("tokenizations")
                .and_then(Value::as_array_mut)
            {
                for (ti, tokenization) in tokenizations.iter_mut().enumerate() {
                    stamp_object(
                        tokenization,
                        &format!("segmentation:tokenization:{ti}"),
                        &mut report,
                    );
                    if let Some(tokens) =
                        tokenization.get_mut("tokens").and_then(Value::as_array_mut)
                    {
                        for (i, token) in tokens.iter_mut().enumerate() {
                            // Add `tokenIndex` if missing — the
                            // lexicon requires it, and authoring
                            // by order in the array is the obvious
                            // semantic.
                            if let Some(obj) = token.as_object_mut() {
                                obj.entry("tokenIndex")
                                    .or_insert_with(|| Value::Number(i.into()));
                            }
                        }
                    }
                }
            }
        }
        _ => {}
    }
    report
}

/// Stamp every object inside `body[field]` (an array) with a
/// UUID derived from its index.
fn stamp_array(body: &mut Value, field: &str, report: &mut StampReport) {
    let Some(items) = body.get_mut(field).and_then(Value::as_array_mut) else {
        return;
    };
    for (i, item) in items.iter_mut().enumerate() {
        stamp_object(item, &format!("{field}:{i}"), report);
    }
}

/// Stamp one object with `uuid` derived from `name_suffix`. If
/// `uuid` is already set, leaves it alone and increments
/// `already_present`.
fn stamp_object(item: &mut Value, name_suffix: &str, report: &mut StampReport) {
    let Some(obj) = item.as_object_mut() else {
        return;
    };
    if obj.contains_key("uuid") {
        report.already_present += 1;
        return;
    }
    // Derive the UUID over the object's *content* plus the
    // index suffix. Two structurally-identical annotations at
    // different indices get distinct UUIDs; the same annotation
    // re-run against the same seed YAML gets the same UUID.
    let canonical =
        serde_json::to_string(&obj).expect("Map<String,Value> is always JSON-serialisable");
    let name = format!("{name_suffix}\x00{canonical}");
    let uuid = Uuid::new_v5(&SEED_NAMESPACE, name.as_bytes());
    // The lexicon's `pub.layers.defs#uuid` is an object shape
    // `{ "value": "<string>" }`, not a bare string. Match it.
    obj.insert(
        "uuid".to_owned(),
        serde_json::json!({ "value": uuid.to_string() }),
    );
    report.stamped += 1;
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn stamps_annotation_entries() {
        let mut body = json!({
            "kind": "token-tag",
            "annotations": [
                {"label": "NOUN", "tokenIndex": 0},
                {"label": "VERB", "tokenIndex": 1},
            ],
        });
        let report = stamp_uuids(&mut body, "pub.layers.annotation.annotationLayer");
        assert_eq!(report.stamped, 2);
        assert_eq!(report.already_present, 0);
        let first = body["annotations"][0]["uuid"]["value"].as_str().unwrap();
        let second = body["annotations"][1]["uuid"]["value"].as_str().unwrap();
        assert!(Uuid::parse_str(first).is_ok());
        assert!(Uuid::parse_str(second).is_ok());
        assert_ne!(first, second);
    }

    #[test]
    fn stamps_tokenization_uuid_and_indices_tokens() {
        let mut body = json!({
            "tokenizations": [
                {
                    "kind": "whitespace",
                    "tokens": [
                        {"text": "Hello", "textSpan": {"byteStart": 0, "byteEnd": 5}},
                        {"text": "world", "textSpan": {"byteStart": 6, "byteEnd": 11}},
                    ],
                }
            ],
        });
        let report = stamp_uuids(&mut body, "pub.layers.segmentation.segmentation");
        // Only the tokenization itself gets a uuid; tokens get
        // tokenIndex back-fill but no uuid.
        assert_eq!(report.stamped, 1);
        let stamped = body["tokenizations"][0]["uuid"]["value"]
            .as_str()
            .unwrap();
        assert!(Uuid::parse_str(stamped).is_ok());
        assert_eq!(body["tokenizations"][0]["tokens"][0]["tokenIndex"], json!(0));
        assert_eq!(body["tokenizations"][0]["tokens"][1]["tokenIndex"], json!(1));
    }

    #[test]
    fn preserves_existing_uuids() {
        let mut body = json!({
            "annotations": [
                {
                    "uuid": {"value": "11111111-1111-1111-1111-111111111111"},
                    "label": "X"
                },
                {"label": "Y"},
            ],
        });
        let report = stamp_uuids(&mut body, "pub.layers.annotation.annotationLayer");
        assert_eq!(report.stamped, 1);
        assert_eq!(report.already_present, 1);
        assert_eq!(
            body["annotations"][0]["uuid"]["value"],
            json!("11111111-1111-1111-1111-111111111111")
        );
    }

    #[test]
    fn idempotent_under_repeat() {
        let make = || {
            json!({
                "annotations": [
                    {"label": "NOUN", "tokenIndex": 0},
                    {"label": "VERB", "tokenIndex": 1},
                ]
            })
        };
        let mut a = make();
        let mut b = make();
        stamp_uuids(&mut a, "pub.layers.annotation.annotationLayer");
        stamp_uuids(&mut b, "pub.layers.annotation.annotationLayer");
        assert_eq!(a, b);
    }
}
