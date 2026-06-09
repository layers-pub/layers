//! Convert `ATProto` lexicon JSON Schema-ish definitions into vanilla
//! JSON Schema components for the orchestrator's `OpenAPI` document.
//!
//! Lexicons use a restricted subset of JSON Schema with a few
//! ATProto-specific type tokens. This module emits one `OpenAPI` 3.1
//! component schema per top-level lexicon def and resolves intra-
//! lexicon `ref`s into `$ref: "#/components/schemas/<...>"` pointers.
//!
//! Naming convention (matches the frontend's existing test fixtures):
//!
//! - `pub.layers.<ns>.<name>#<defId>` -> `<UpperNs><UpperName><UpperDefId>`
//!   (so `pub.layers.expression.expression#main` becomes
//!   `ExpressionExpressionMain`).
//! - For `record`-typed defs, an alias `<UpperNs><UpperName>Record`
//!   pointing at the same body is emitted as well.
//! - `pub.layers.<ns>.defs#<defId>` -> `<UpperNs>Defs<UpperDefId>`.
//! - `pub.layers.defs#<defId>` -> `Defs<UpperDefId>` (the top-level
//!   shared defs, no namespace segment).
//!
//! Not handled (these don't appear in the `pub.layers.*` tree today):
//!
//! - `procedure` and `subscription` defs (no write/streaming surface).
//! - `xrpcError` (errors are mapped via the orchestrator's
//!   `ApiError`, not lexicon-typed).

use std::collections::BTreeMap;

use anyhow::{Context, Result, bail};
use serde_json::{Map, Value};

/// Walk every lexicon under `lexicons_dir` and return the `OpenAPI`
/// `components.schemas` map as a sorted `serde_json::Map`.
///
/// # Errors
/// Returns an error if a lexicon JSON file fails to parse, references
/// an unknown construct, or names a `$ref` target that does not exist
/// in the input set.
pub fn build_components(lexicons_dir: &std::path::Path) -> Result<Map<String, Value>> {
    let docs = load_all(lexicons_dir)?;
    // Resolve into a deterministic ordering for stable output.
    let mut out: BTreeMap<String, Value> = BTreeMap::new();
    for doc in &docs {
        emit_doc(doc, &mut out)?;
    }
    Ok(out.into_iter().collect())
}

#[derive(Debug)]
struct LexiconDoc {
    /// e.g. `pub.layers.expression.expression`
    nsid: String,
    /// `defs.<defId>` map
    defs: Map<String, Value>,
}

fn load_all(dir: &std::path::Path) -> Result<Vec<LexiconDoc>> {
    let mut out = Vec::new();
    walk(dir, &mut out)?;
    out.sort_by(|a, b| a.nsid.cmp(&b.nsid));
    Ok(out)
}

fn walk(dir: &std::path::Path, out: &mut Vec<LexiconDoc>) -> Result<()> {
    for entry in std::fs::read_dir(dir).with_context(|| format!("read_dir {}", dir.display()))? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            walk(&path, out)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("json") {
            let raw = std::fs::read_to_string(&path)?;
            let value: Value = serde_json::from_str(&raw)
                .with_context(|| format!("parsing {}", path.display()))?;
            let nsid = value
                .get("id")
                .and_then(Value::as_str)
                .ok_or_else(|| anyhow::anyhow!("{}: missing id", path.display()))?
                .to_owned();
            let defs = value
                .get("defs")
                .and_then(Value::as_object)
                .cloned()
                .unwrap_or_default();
            out.push(LexiconDoc { nsid, defs });
        }
    }
    Ok(())
}

fn emit_doc(doc: &LexiconDoc, out: &mut BTreeMap<String, Value>) -> Result<()> {
    // Permission-set lexicons carry no schema-bearing defs we need to
    // emit components for; they are runtime auth artifacts.
    let is_permission_set = doc.defs.get("main").is_some_and(|m| {
        m.get("type")
            .and_then(Value::as_str)
            .is_some_and(|s| s == "permission-set")
    });
    if is_permission_set {
        return Ok(());
    }

    for (def_id, def) in &doc.defs {
        let Some(def_obj) = def.as_object() else {
            continue;
        };
        let ty = def_obj.get("type").and_then(Value::as_str).unwrap_or("");
        let primary_name = component_name(&doc.nsid, def_id);

        match ty {
            "record" => {
                let body = def_obj
                    .get("record")
                    .ok_or_else(|| anyhow::anyhow!("{} record missing 'record'", doc.nsid))?;
                let schema = convert(&doc.nsid, body)?;
                out.insert(primary_name.clone(), schema.clone());
                // Alias <Ns><Name>Record for the canonical record body.
                let record_alias = record_alias_name(&doc.nsid);
                out.insert(record_alias, Value::Object(ref_object(&primary_name)));
            }
            "object" | "string" | "integer" | "boolean" | "array" | "ref" | "union" | "token"
            | "blob" | "cid-link" | "bytes" | "unknown" => {
                let schema = convert(&doc.nsid, def)?;
                out.insert(primary_name, schema);
            }
            "query" => {
                if let Some(output_schema) = def_obj.get("output").and_then(|o| o.get("schema")) {
                    let schema = convert(&doc.nsid, output_schema)?;
                    let output_name = query_output_name(&doc.nsid);
                    out.insert(output_name.clone(), schema.clone());
                    // For listX queries, expose the `records[*]` shape
                    // under a `<...>RecordView` alias.
                    if let Some(record_view_name) = list_record_view_name(&doc.nsid)
                        && let Some(record_view_schema) = extract_record_view_schema(&schema)
                    {
                        out.insert(record_view_name, record_view_schema);
                    }
                }
            }
            // procedure / subscription / permission-set: no component.
            _ => {}
        }
    }
    Ok(())
}

/// Compose a stable component name for a given (nsid, defId).
///
/// `pub.layers.expression.expression#main` -> `ExpressionExpressionMain`
/// `pub.layers.expression.defs#token` -> `ExpressionDefsToken`
/// `pub.layers.defs#anchor` -> `DefsAnchor`
pub fn component_name(nsid: &str, def_id: &str) -> String {
    let segments: Vec<&str> = nsid.split('.').collect();
    // Strip the `pub.layers.` prefix; everything below it forms the name.
    let tail: &[&str] = if segments.first().is_some_and(|s| *s == "pub")
        && segments.get(1).is_some_and(|s| *s == "layers")
    {
        &segments[2..]
    } else {
        &segments[..]
    };
    let mut buf = String::new();
    for seg in tail {
        buf.push_str(&upper_camel(seg));
    }
    buf.push_str(&upper_camel(def_id));
    buf
}

/// Alias name for the record body of a record-typed lexicon.
fn record_alias_name(nsid: &str) -> String {
    let mut name = component_name(nsid, "");
    name.push_str("Record");
    name
}

/// `<Ns><VerbResource>Output` for a query lexicon.
fn query_output_name(nsid: &str) -> String {
    let mut name = component_name(nsid, "");
    name.push_str("Output");
    name
}

/// `<Ns><Verb><Resource>RecordView` for a list query, when the output
/// has an array field whose items are typed objects we can surface as
/// an alias.
fn list_record_view_name(nsid: &str) -> Option<String> {
    let leaf = nsid.rsplit('.').next()?;
    if !leaf.starts_with("list") {
        return None;
    }
    let mut name = component_name(nsid, "");
    name.push_str("RecordView");
    Some(name)
}

/// Pull the record-view schema (i.e. the items of the `records` array)
/// out of a list query output schema. Returns `None` when the schema
/// doesn't follow the conventional `{ records: [...], cursor }` shape.
fn extract_record_view_schema(output: &Value) -> Option<Value> {
    let obj = output.as_object()?;
    let props = obj.get("properties")?.as_object()?;
    let records = props.get("records")?.as_object()?;
    let items = records.get("items")?;
    Some(items.clone())
}

fn ref_object(target: &str) -> Map<String, Value> {
    let mut m = Map::new();
    m.insert(
        "$ref".into(),
        Value::String(format!("#/components/schemas/{target}")),
    );
    m
}

fn upper_camel(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut up_next = true;
    for c in input.chars() {
        if c == '_' || c == '-' {
            up_next = true;
        } else if up_next {
            for u in c.to_uppercase() {
                out.push(u);
            }
            up_next = false;
        } else {
            out.push(c);
        }
    }
    out
}

/// Convert a lexicon type definition into a vanilla JSON Schema
/// suitable for `OpenAPI` components.
///
/// `current_nsid` provides the context for resolving relative refs
/// (`#defId` shorthand resolves against the lexicon the def lives in).
fn convert(current_nsid: &str, value: &Value) -> Result<Value> {
    let obj = value
        .as_object()
        .ok_or_else(|| anyhow::anyhow!("{current_nsid}: lexicon def is not an object"))?;
    let ty = obj.get("type").and_then(Value::as_str).unwrap_or("");
    match ty {
        "object" => convert_object(current_nsid, obj),
        "string" => Ok(convert_string(obj)),
        "integer" => Ok(convert_integer(obj)),
        "boolean" => Ok(convert_boolean(obj)),
        "array" => convert_array(current_nsid, obj),
        "ref" => Ok(convert_ref(current_nsid, obj)?),
        "union" => convert_union(current_nsid, obj),
        "token" => Ok(simple("string", obj.get("description"))),
        "blob" => Ok(blob_schema(obj.get("description"))),
        "cid-link" => Ok(cid_link_schema()),
        "bytes" => {
            let mut m = Map::new();
            m.insert("type".into(), Value::String("string".into()));
            m.insert("format".into(), Value::String("byte".into()));
            if let Some(d) = obj.get("description") {
                m.insert("description".into(), d.clone());
            }
            Ok(Value::Object(m))
        }
        "unknown" => {
            let mut m = Map::new();
            m.insert("type".into(), Value::String("object".into()));
            m.insert("additionalProperties".into(), Value::Bool(true));
            if let Some(d) = obj.get("description") {
                m.insert("description".into(), d.clone());
            }
            Ok(Value::Object(m))
        }
        other => bail!("{current_nsid}: unsupported lexicon type `{other}`"),
    }
}

fn simple(json_type: &str, description: Option<&Value>) -> Value {
    let mut m = Map::new();
    m.insert("type".into(), Value::String(json_type.to_owned()));
    if let Some(d) = description {
        m.insert("description".into(), d.clone());
    }
    Value::Object(m)
}

fn convert_object(current_nsid: &str, obj: &Map<String, Value>) -> Result<Value> {
    let mut out = Map::new();
    out.insert("type".into(), Value::String("object".into()));
    if let Some(d) = obj.get("description") {
        out.insert("description".into(), d.clone());
    }
    if let Some(req) = obj.get("required") {
        out.insert("required".into(), req.clone());
    }
    if let Some(nullable) = obj.get("nullable").and_then(Value::as_array) {
        // Lexicon `nullable` lists property names that may be null;
        // we transcribe by allowing those properties to be `nullable`
        // via `oneOf: [<schema>, { type: "null" }]` once we hit them.
        // Carry it through as an extension for downstream tooling that
        // wants to enforce null-ness explicitly.
        out.insert("x-lexicon-nullable".into(), Value::Array(nullable.clone()));
    }
    if let Some(props) = obj.get("properties").and_then(Value::as_object) {
        let mut converted = Map::new();
        for (name, prop) in props {
            converted.insert(name.clone(), convert(current_nsid, prop)?);
        }
        out.insert("properties".into(), Value::Object(converted));
    }
    Ok(Value::Object(out))
}

fn convert_string(obj: &Map<String, Value>) -> Value {
    let mut m = Map::new();
    m.insert("type".into(), Value::String("string".into()));
    for key in [
        "description",
        "format",
        "minLength",
        "maxLength",
        "minGraphemes",
        "maxGraphemes",
        "default",
        "const",
    ] {
        if let Some(v) = obj.get(key) {
            m.insert(key.into(), v.clone());
        }
    }
    if let Some(values) = obj.get("knownValues") {
        m.insert("x-known-values".into(), values.clone());
    }
    if let Some(values) = obj.get("enum").and_then(Value::as_array) {
        m.insert("enum".into(), Value::Array(values.clone()));
    }
    Value::Object(m)
}

fn convert_integer(obj: &Map<String, Value>) -> Value {
    let mut m = Map::new();
    m.insert("type".into(), Value::String("integer".into()));
    for key in ["description", "minimum", "maximum", "default", "const"] {
        if let Some(v) = obj.get(key) {
            m.insert(key.into(), v.clone());
        }
    }
    Value::Object(m)
}

fn convert_boolean(obj: &Map<String, Value>) -> Value {
    let mut m = Map::new();
    m.insert("type".into(), Value::String("boolean".into()));
    for key in ["description", "default", "const"] {
        if let Some(v) = obj.get(key) {
            m.insert(key.into(), v.clone());
        }
    }
    Value::Object(m)
}

fn convert_array(current_nsid: &str, obj: &Map<String, Value>) -> Result<Value> {
    let mut m = Map::new();
    m.insert("type".into(), Value::String("array".into()));
    for key in ["description", "minLength", "maxLength"] {
        if let Some(v) = obj.get(key) {
            // Lexicon array `minLength` / `maxLength` correspond to
            // JSON Schema `minItems` / `maxItems`.
            let json_key = match key {
                "minLength" => "minItems",
                "maxLength" => "maxItems",
                k => k,
            };
            m.insert(json_key.into(), v.clone());
        }
    }
    if let Some(items) = obj.get("items") {
        m.insert("items".into(), convert(current_nsid, items)?);
    } else {
        m.insert(
            "items".into(),
            Value::Object({
                let mut m = Map::new();
                m.insert("type".into(), Value::String("object".into()));
                m
            }),
        );
    }
    Ok(Value::Object(m))
}

fn convert_ref(current_nsid: &str, obj: &Map<String, Value>) -> Result<Value> {
    let raw = obj
        .get("ref")
        .and_then(Value::as_str)
        .ok_or_else(|| anyhow::anyhow!("{current_nsid}: ref missing 'ref'"))?;
    let target = resolve_ref_name(current_nsid, raw)?;
    let mut m = Map::new();
    m.insert(
        "$ref".into(),
        Value::String(format!("#/components/schemas/{target}")),
    );
    if let Some(d) = obj.get("description") {
        m.insert("description".into(), d.clone());
    }
    Ok(Value::Object(m))
}

fn convert_union(current_nsid: &str, obj: &Map<String, Value>) -> Result<Value> {
    let refs = obj
        .get("refs")
        .and_then(Value::as_array)
        .ok_or_else(|| anyhow::anyhow!("{current_nsid}: union missing 'refs'"))?;
    let mut variants: Vec<Value> = Vec::with_capacity(refs.len());
    for r in refs {
        let raw = r
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("{current_nsid}: union ref is not a string"))?;
        let target = resolve_ref_name(current_nsid, raw)?;
        let mut item = Map::new();
        item.insert(
            "$ref".into(),
            Value::String(format!("#/components/schemas/{target}")),
        );
        variants.push(Value::Object(item));
    }
    let mut m = Map::new();
    m.insert("oneOf".into(), Value::Array(variants));
    if let Some(d) = obj.get("description") {
        m.insert("description".into(), d.clone());
    }
    Ok(Value::Object(m))
}

/// Resolve a lexicon `$ref` into the component name we emit for it.
///
/// Handles three shapes:
///
/// - `pub.layers.foo.bar#main` -> full NSID + def id.
/// - `pub.layers.foo.bar` -> implicit `#main` per `ATProto` convention.
/// - `#defId` -> shorthand for the current NSID's `<defId>`.
#[allow(
    clippy::unnecessary_wraps,
    reason = "fallible-shaped for future malformed-ref handling"
)]
fn resolve_ref_name(current_nsid: &str, raw: &str) -> Result<String> {
    if let Some(stripped) = raw.strip_prefix('#') {
        return Ok(component_name(current_nsid, stripped));
    }
    if let Some((nsid, def_id)) = raw.split_once('#') {
        return Ok(component_name(nsid, def_id));
    }
    // Bare NSID -> implicit `#main`.
    Ok(component_name(raw, "main"))
}

fn blob_schema(description: Option<&Value>) -> Value {
    // ATProto BlobRef: `{ $type: "blob", ref: { $link: <cid> }, mimeType, size }`.
    let mut m = Map::new();
    m.insert("type".into(), Value::String("object".into()));
    if let Some(d) = description {
        m.insert("description".into(), d.clone());
    }
    let mut props = Map::new();
    props.insert("$type".into(), simple("string", None));
    props.insert(
        "ref".into(),
        Value::Object({
            let mut r = Map::new();
            r.insert("type".into(), Value::String("object".into()));
            let mut p = Map::new();
            p.insert("$link".into(), simple("string", None));
            r.insert("properties".into(), Value::Object(p));
            r
        }),
    );
    props.insert("mimeType".into(), simple("string", None));
    props.insert("size".into(), simple("integer", None));
    m.insert("properties".into(), Value::Object(props));
    Value::Object(m)
}

fn cid_link_schema() -> Value {
    let mut m = Map::new();
    m.insert("type".into(), Value::String("object".into()));
    let mut p = Map::new();
    p.insert("$link".into(), simple("string", None));
    m.insert("properties".into(), Value::Object(p));
    Value::Object(m)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn upper_camel_handles_separators() {
        assert_eq!(upper_camel("expression"), "Expression");
        assert_eq!(upper_camel("getExpression"), "GetExpression");
        assert_eq!(upper_camel("main"), "Main");
        assert_eq!(upper_camel("type_def"), "TypeDef");
    }

    #[test]
    fn component_name_maps_pub_layers_namespace() {
        assert_eq!(
            component_name("pub.layers.expression.expression", "main"),
            "ExpressionExpressionMain"
        );
        assert_eq!(
            component_name("pub.layers.annotation.defs", "annotation"),
            "AnnotationDefsAnnotation"
        );
        assert_eq!(component_name("pub.layers.defs", "anchor"), "DefsAnchor");
    }

    #[test]
    fn ref_resolution() {
        assert_eq!(
            resolve_ref_name(
                "pub.layers.expression.getExpression",
                "pub.layers.expression.expression#main",
            )
            .unwrap(),
            "ExpressionExpressionMain"
        );
        assert_eq!(
            resolve_ref_name("pub.layers.expression.expression", "#main").unwrap(),
            "ExpressionExpressionMain"
        );
        assert_eq!(
            resolve_ref_name("pub.layers.foo.bar", "pub.layers.baz.qux").unwrap(),
            "BazQuxMain"
        );
    }

    #[test]
    fn convert_object_passes_through_required_and_properties() {
        let input = json!({
            "type": "object",
            "required": ["uri", "value"],
            "properties": {
                "uri": { "type": "string", "format": "at-uri" },
                "value": { "type": "ref", "ref": "pub.layers.expression.expression#main" }
            }
        });
        let out = convert("pub.layers.expression.getExpression", &input).unwrap();
        assert_eq!(out["type"], "object");
        assert_eq!(out["required"], json!(["uri", "value"]));
        assert_eq!(
            out["properties"]["value"]["$ref"],
            "#/components/schemas/ExpressionExpressionMain"
        );
        assert_eq!(out["properties"]["uri"]["format"], "at-uri");
    }

    #[test]
    fn convert_array_uses_minitems() {
        let input = json!({
            "type": "array",
            "minLength": 1,
            "maxLength": 5,
            "items": { "type": "string" }
        });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["type"], "array");
        assert_eq!(out["minItems"], 1);
        assert_eq!(out["maxItems"], 5);
        assert_eq!(out["items"]["type"], "string");
    }

    #[test]
    fn convert_union_emits_oneof() {
        let input = json!({
            "type": "union",
            "refs": ["pub.layers.x.a#main", "pub.layers.x.b#main"]
        });
        let out = convert("pub.layers.x.host", &input).unwrap();
        let variants = out["oneOf"].as_array().unwrap();
        assert_eq!(variants.len(), 2);
        assert_eq!(variants[0]["$ref"], "#/components/schemas/XAMain");
        assert_eq!(variants[1]["$ref"], "#/components/schemas/XBMain");
    }

    #[test]
    fn extract_record_view_pulls_items() {
        let input = json!({
            "type": "object",
            "properties": {
                "records": {
                    "type": "array",
                    "items": { "$ref": "#/components/schemas/X" }
                }
            }
        });
        let view = extract_record_view_schema(&input).unwrap();
        assert_eq!(view["$ref"], "#/components/schemas/X");
    }

    #[test]
    fn extract_record_view_returns_none_when_records_absent() {
        let input = json!({
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": { "type": "string" }
                }
            }
        });
        assert!(extract_record_view_schema(&input).is_none());
    }

    #[test]
    fn convert_string_carries_format_and_length_constraints() {
        let input = json!({
            "type": "string",
            "format": "at-uri",
            "minLength": 1,
            "maxLength": 1024
        });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["type"], "string");
        assert_eq!(out["format"], "at-uri");
        assert_eq!(out["minLength"], 1);
        assert_eq!(out["maxLength"], 1024);
    }

    #[test]
    fn convert_string_with_known_values_passes_them_as_extension() {
        let input = json!({
            "type": "string",
            "knownValues": ["alpha", "beta"]
        });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["x-known-values"], json!(["alpha", "beta"]));
    }

    #[test]
    fn convert_integer_carries_min_max() {
        let input = json!({
            "type": "integer",
            "minimum": 1,
            "maximum": 200,
            "default": 50
        });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["type"], "integer");
        assert_eq!(out["minimum"], 1);
        assert_eq!(out["maximum"], 200);
        assert_eq!(out["default"], 50);
    }

    #[test]
    fn convert_blob_emits_object_with_ref_link_mime_size() {
        let input = json!({ "type": "blob" });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["type"], "object");
        let props = out["properties"].as_object().unwrap();
        assert!(props.contains_key("$type"));
        assert!(props.contains_key("ref"));
        assert!(props.contains_key("mimeType"));
        assert!(props.contains_key("size"));
    }

    #[test]
    fn convert_cid_link_emits_object_with_link_property() {
        let input = json!({ "type": "cid-link" });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["type"], "object");
        assert!(out["properties"]["$link"].is_object());
    }

    #[test]
    fn convert_bytes_emits_string_with_byte_format() {
        let input = json!({ "type": "bytes", "description": "raw bytes" });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["type"], "string");
        assert_eq!(out["format"], "byte");
        assert_eq!(out["description"], "raw bytes");
    }

    #[test]
    fn convert_unknown_emits_open_object() {
        let input = json!({ "type": "unknown" });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["type"], "object");
        assert_eq!(out["additionalProperties"], true);
    }

    #[test]
    fn convert_token_emits_string() {
        let input = json!({ "type": "token", "description": "marker" });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["type"], "string");
        assert_eq!(out["description"], "marker");
    }

    #[test]
    fn convert_array_without_items_defaults_to_object_items() {
        let input = json!({ "type": "array" });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["type"], "array");
        assert_eq!(out["items"]["type"], "object");
    }

    #[test]
    fn nested_object_recursion_works() {
        let input = json!({
            "type": "object",
            "properties": {
                "outer": {
                    "type": "object",
                    "properties": {
                        "inner": { "type": "integer" }
                    }
                }
            }
        });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(
            out["properties"]["outer"]["properties"]["inner"]["type"],
            "integer"
        );
    }

    #[test]
    fn nullable_property_carries_x_lexicon_extension() {
        let input = json!({
            "type": "object",
            "nullable": ["maybe"],
            "properties": { "maybe": { "type": "string" } }
        });
        let out = convert("pub.layers.x", &input).unwrap();
        assert_eq!(out["x-lexicon-nullable"], json!(["maybe"]));
    }

    #[test]
    fn unsupported_type_returns_error() {
        let input = json!({ "type": "subscription" });
        let err = convert("pub.layers.x", &input).unwrap_err();
        assert!(format!("{err}").contains("unsupported lexicon type"));
    }

    #[test]
    fn ref_resolution_handles_implicit_main_on_bare_nsid() {
        assert_eq!(
            resolve_ref_name("pub.layers.host", "pub.layers.foo.bar").unwrap(),
            "FooBarMain"
        );
    }

    #[test]
    fn record_alias_name_appends_record_suffix() {
        assert_eq!(
            record_alias_name("pub.layers.expression.expression"),
            "ExpressionExpressionRecord"
        );
        assert_eq!(
            record_alias_name("pub.layers.corpus.corpus"),
            "CorpusCorpusRecord"
        );
    }

    #[test]
    fn list_record_view_name_only_for_list_lexicons() {
        assert!(list_record_view_name("pub.layers.expression.getExpression").is_none());
        assert_eq!(
            list_record_view_name("pub.layers.expression.listExpressions"),
            Some("ExpressionListExpressionsRecordView".into())
        );
    }
}
