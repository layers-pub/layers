//! Validate the on-disk `web/lib/api/openapi.json` artifact end-to-end.
//!
//! This guards three properties:
//!
//! 1. The document is valid JSON and conforms to OpenAPI 3.1's required
//!    top-level shape.
//! 2. Every path response references a component that actually exists
//!    in `components.schemas`.
//! 3. Every record-bearing lexicon emits its expected component
//!    aliases (`<Ns><Leaf>Record` and `<Ns><Leaf>Main`).

use serde_json::Value;
use std::path::PathBuf;

fn load_openapi() -> Value {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    // crates/layers-codegen/Cargo.toml -> crates/layers-codegen
    let layers_root = manifest
        .parent()
        .expect("crates dir")
        .parent()
        .expect("layers dir");
    let path = layers_root.join("web/lib/api/openapi.json");
    let raw = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
    serde_json::from_str(&raw).expect("openapi.json parses")
}

#[test]
fn document_has_openapi_3_1_envelope() {
    let doc = load_openapi();
    assert_eq!(doc["openapi"], "3.1.0");
    assert!(doc["info"]["title"].is_string());
    assert!(doc["info"]["version"].is_string());
    assert!(doc["paths"].is_object());
    assert!(doc["components"]["schemas"].is_object());
}

#[test]
fn every_path_references_a_known_component_or_baked_response() {
    let doc = load_openapi();
    let schemas = doc["components"]["schemas"].as_object().unwrap();
    let paths = doc["paths"].as_object().unwrap();

    for (path, item) in paths {
        let response = item["get"]["responses"]["200"]["content"]["application/json"]["schema"]
            .as_object()
            .unwrap_or_else(|| panic!("{path} missing 200 response schema"));
        // The "baked response" case: the schema is inlined (typed
        // object with properties) rather than referencing a named
        // component. Inline schemas are valid OpenAPI; they just
        // bypass the component-reference check.
        let Some(reference) = response.get("$ref").and_then(|v| v.as_str()) else {
            assert!(
                response.contains_key("type")
                    || response.contains_key("properties")
                    || response.contains_key("oneOf")
                    || response.contains_key("anyOf")
                    || response.contains_key("allOf"),
                "{path} 200 response is neither a $ref nor an inline schema"
            );
            continue;
        };
        let name = reference
            .strip_prefix("#/components/schemas/")
            .unwrap_or_else(|| panic!("{path} response $ref is not local"));
        assert!(
            schemas.contains_key(name),
            "{path} response references unknown component `{name}`"
        );
    }
}

#[test]
fn record_alias_components_exist_for_every_record_lexicon() {
    let doc = load_openapi();
    let schemas = doc["components"]["schemas"].as_object().unwrap();
    let expected = [
        // (alias name, primary name)
        ("ExpressionExpressionRecord", "ExpressionExpressionMain"),
        ("CorpusCorpusRecord", "CorpusCorpusMain"),
        ("OntologyOntologyRecord", "OntologyOntologyMain"),
        ("AnnotationAnnotationLayerRecord", "AnnotationAnnotationLayerMain"),
        ("SegmentationSegmentationRecord", "SegmentationSegmentationMain"),
    ];
    for (alias, primary) in expected {
        assert!(
            schemas.contains_key(primary),
            "missing primary component {primary}"
        );
        assert!(
            schemas.contains_key(alias),
            "missing record alias {alias}"
        );
        assert_eq!(
            schemas[alias]["$ref"]
                .as_str()
                .unwrap_or_default(),
            format!("#/components/schemas/{primary}"),
            "{alias} should ref {primary}"
        );
    }
}

#[test]
fn shared_defs_components_exist() {
    let doc = load_openapi();
    let schemas = doc["components"]["schemas"].as_object().unwrap();
    for name in [
        "DefsAnchor",
        "AnnotationDefsAnnotation",
        "SegmentationDefsToken",
    ] {
        assert!(
            schemas.contains_key(name),
            "missing shared def component {name}"
        );
    }
}

#[test]
fn record_view_and_list_response_baked_in_components_present() {
    let doc = load_openapi();
    let schemas = doc["components"]["schemas"].as_object().unwrap();
    for name in ["RecordView", "ListResponse", "ErrorBody"] {
        assert!(
            schemas.contains_key(name),
            "missing baked-in component {name}"
        );
    }
    assert_eq!(
        schemas["RecordView"]["properties"]["uri"]["type"],
        "string"
    );
}
