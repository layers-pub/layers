//! Emit `web/lib/generated/record-registry.ts`: the runtime registry of
//! every `pub.layers.*` record kind (field metadata + list/get endpoints
//! + list params), consumed by the generic record UI.
//!
//! This replaces the old `codegen/generate.mjs` output; the data is now
//! derived from the lexicons + `orchestrator-spec/queries.json` (for
//! endpoints/params) so it can never drift, and is covered by the
//! `layers-codegen -- check` drift gate.

use std::collections::BTreeMap;
use std::path::Path;

use anyhow::{Context, Result};
use serde_json::{Map, Value, json};

use super::forms::{humanize, walk_lexicons};

/// A record-kind lexicon plus its derived registry identity.
pub(super) struct RecordLexicon {
    pub nsid: String,
    /// URL/runtime slug: `<ns>` when the namespace and record name match
    /// (e.g. `corpus`), else `<ns>-<record>` (e.g. `corpus-membership`).
    pub slug: String,
    /// `<PascalRecord>View` interface name in `views.ts`.
    pub view_type: String,
    pub title: String,
    pub description: String,
    pub props: Map<String, Value>,
    pub required: Vec<String>,
}

/// Collect every record-kind lexicon under `lex_root`, sorted by slug.
pub(super) fn collect_records(lex_root: &Path) -> Result<Vec<RecordLexicon>> {
    let mut out = Vec::new();
    walk_lexicons(lex_root, &mut |path| -> Result<()> {
        let raw =
            std::fs::read_to_string(path).with_context(|| format!("reading {}", path.display()))?;
        let doc: Value =
            serde_json::from_str(&raw).with_context(|| format!("parsing {}", path.display()))?;
        let Some(nsid) = doc.get("id").and_then(Value::as_str) else {
            return Ok(());
        };
        let Some(main) = doc.get("defs").and_then(|d| d.get("main")) else {
            return Ok(());
        };
        if main.get("type").and_then(Value::as_str) != Some("record") {
            return Ok(());
        }
        let Some(record) = main.get("record") else {
            return Ok(());
        };
        let Some(props) = record
            .get("properties")
            .and_then(Value::as_object)
            .filter(|p| !p.is_empty())
        else {
            return Ok(());
        };
        let required: Vec<String> = record
            .get("required")
            .and_then(Value::as_array)
            .map(|arr| {
                arr.iter()
                    .filter_map(Value::as_str)
                    .map(str::to_owned)
                    .collect()
            })
            .unwrap_or_default();

        // nsid is `pub.layers.<ns>.<record>`.
        let segs: Vec<&str> = nsid.split('.').collect();
        let (ns, leaf) = match segs.as_slice() {
            [.., ns, leaf] => (*ns, *leaf),
            _ => return Ok(()),
        };
        let slug = if ns == leaf {
            ns.to_owned()
        } else {
            format!("{ns}-{leaf}")
        };
        let view_type = format!("{}View", pascal(leaf));
        let description = record
            .get("description")
            .or_else(|| main.get("description"))
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_owned();

        out.push(RecordLexicon {
            nsid: nsid.to_owned(),
            slug,
            view_type,
            title: humanize(leaf),
            description,
            props: props.clone(),
            required,
        });
        Ok(())
    })?;
    out.sort_by(|a, b| a.slug.cmp(&b.slug));
    Ok(out)
}

/// Capitalise the first character (record leaves are already camelCase).
pub(super) fn pascal(camel: &str) -> String {
    let mut chars = camel.chars();
    chars.next().map_or_else(String::new, |first| {
        first.to_uppercase().collect::<String>() + chars.as_str()
    })
}

/// queries.json get/list endpoints + list params for one entity.
struct EntityQueries {
    get_lxm: Option<String>,
    list_lxm: Option<String>,
    list_params: Vec<Value>,
}

fn load_entity_queries(repo_root: &Path) -> Result<BTreeMap<String, EntityQueries>> {
    let spec_path = repo_root.join("orchestrator-spec/queries.json");
    let raw = std::fs::read_to_string(&spec_path)
        .with_context(|| format!("reading {}", spec_path.display()))?;
    let spec: Value =
        serde_json::from_str(&raw).with_context(|| format!("parsing {}", spec_path.display()))?;
    let queries = spec
        .get("queries")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default();

    let mut map: BTreeMap<String, EntityQueries> = BTreeMap::new();
    for q in queries {
        let Some(entity) = q.get("entity").and_then(Value::as_str) else {
            continue;
        };
        let Some(name) = q.get("name").and_then(Value::as_str) else {
            continue;
        };
        let lxm = q
            .get("lxm")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_owned();
        let entry = map.entry(entity.to_owned()).or_insert(EntityQueries {
            get_lxm: None,
            list_lxm: None,
            list_params: Vec::new(),
        });
        if name.starts_with("get_") {
            entry.get_lxm = Some(lxm);
        } else if name.starts_with("list_") {
            entry.list_lxm = Some(lxm);
            entry.list_params = q
                .get("params")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
        }
    }
    Ok(map)
}

/// Map a queries.json param object to a registry `ParamMeta`.
fn param_meta(param: &Value) -> Value {
    let name = param
        .get("http_query")
        .and_then(Value::as_str)
        .or_else(|| param.get("name").and_then(Value::as_str))
        .unwrap_or_default();
    let rust_kind = param.get("rust_kind").and_then(Value::as_str).unwrap_or("");
    let parser = param.get("parser").and_then(Value::as_str).unwrap_or("");
    let required = !rust_kind.starts_with("Option");
    let ty = if rust_kind.contains("u32") || rust_kind.contains("u64") || rust_kind.contains("i64")
    {
        "number"
    } else {
        "string"
    };
    let format = if parser.contains("at_uri") {
        Value::String("at-uri".into())
    } else {
        Value::Null
    };
    let default = if name == "limit" {
        json!(50)
    } else {
        Value::Null
    };
    json!({
        "name": name,
        "required": required,
        "type": ty,
        "format": format,
        "description": Value::Null,
        "enumValues": Value::Null,
        "default": default,
    })
}

/// Build one record's `FieldMeta` object.
fn field_meta(name: &str, prop: &Value, required: &[String]) -> Value {
    let (kind, format) = registry_kind(prop);
    let enum_values = prop
        .get("knownValues")
        .and_then(Value::as_array)
        .filter(|a| !a.is_empty())
        .map_or(Value::Null, |a| Value::Array(a.clone()));
    let (item_kind, item_ref_target) = if kind == "array" {
        prop.get("items")
            .map_or((Value::Null, Value::Null), |items| {
                let (ik, _) = registry_kind(items);
                let irt = items
                    .get("ref")
                    .and_then(Value::as_str)
                    .map_or(Value::Null, |r| Value::String(r.to_owned()));
                (Value::String(ik), irt)
            })
    } else {
        (Value::Null, Value::Null)
    };
    let ref_target = prop
        .get("ref")
        .and_then(Value::as_str)
        .map_or(Value::Null, |r| Value::String(r.to_owned()));
    json!({
        "name": name,
        "label": humanize(name),
        "kind": kind,
        "required": required.iter().any(|r| r == name),
        "description": prop.get("description").and_then(Value::as_str)
            .map_or(Value::Null, |d| Value::String(d.to_owned())),
        "format": format,
        "enumValues": enum_values,
        "itemKind": item_kind,
        "itemRefTarget": item_ref_target,
        "refTarget": ref_target,
    })
}

/// Classify a lexicon property into a registry `(FieldKind, format)`.
fn registry_kind(prop: &Value) -> (String, Value) {
    let ty = prop.get("type").and_then(Value::as_str).unwrap_or("string");
    let fmt = prop.get("format").and_then(Value::as_str);
    let has_known = prop
        .get("knownValues")
        .and_then(Value::as_array)
        .is_some_and(|a| !a.is_empty());
    let format_val = fmt.map_or(Value::Null, |f| Value::String(f.to_owned()));
    let kind = match ty {
        "string" if has_known => "enum",
        "string" => match fmt {
            Some("at-uri") => "ref",
            Some("datetime") => "datetime",
            _ => "string",
        },
        "integer" | "number" => "number",
        "boolean" => "boolean",
        "array" => "array",
        "ref" => "ref",
        "blob" => "blob",
        "union" => "union",
        "object" => "object",
        _ => "unknown",
    };
    (kind.to_owned(), format_val)
}

const INTERFACES: &str = r"export type FieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'enum'
  | 'ref'
  | 'blob'
  | 'array'
  | 'object'
  | 'union'
  | 'unknown';

export interface FieldMeta {
  readonly name: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly required: boolean;
  readonly description: string | null;
  readonly format: string | null;
  readonly enumValues: readonly string[] | null;
  readonly itemKind: FieldKind | null;
  readonly itemRefTarget: string | null;
  readonly refTarget: string | null;
}

export interface ParamMeta {
  readonly name: string;
  readonly required: boolean;
  readonly type: 'string' | 'number';
  readonly format: string | null;
  readonly description: string | null;
  readonly enumValues: readonly string[] | null;
  readonly default: string | number | null;
}

export interface RecordKindMeta {
  readonly nsid: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly fields: readonly FieldMeta[];
  readonly primaryKey: 'uri';
  readonly viewType: string;
  readonly listEndpoint: string | null;
  readonly getEndpoint: string | null;
  readonly listParams: readonly ParamMeta[];
}
";

const HELPERS: &str = r"
export const recordKindList: readonly RecordKindMeta[] = Object.freeze(
  Object.values(recordKinds),
);

export function getRecordKindBySlug(slug: string): RecordKindMeta | undefined {
  return recordKinds[slug];
}

export function getRecordKindByNsid(nsid: string): RecordKindMeta | undefined {
  return recordKindList.find((k) => k.nsid === nsid);
}

export function resolveKindFromUri(uri: string): RecordKindMeta | undefined {
  const m = /^at:\/\/[^/]+\/([^/]+)\//.exec(uri);
  if (!m) return undefined;
  return getRecordKindByNsid(m[1]);
}
";

/// Render `record-registry.ts`.
pub(super) fn render(repo_root: &Path) -> Result<String> {
    let lex_root = repo_root.join("lexicons/pub/layers");
    let records = collect_records(&lex_root)?;
    let entity_queries = load_entity_queries(repo_root)?;

    let mut kinds = Map::new();
    for rec in &records {
        let entity = crate::tables::RECORD_TABLES
            .iter()
            .find(|t| t.nsid == rec.nsid)
            .map(|t| t.entity);
        let eq = entity.and_then(|e| entity_queries.get(e));

        let mut keys: Vec<&String> = rec.props.keys().collect();
        keys.sort();
        let fields: Vec<Value> = keys
            .iter()
            .map(|k| field_meta(k, &rec.props[*k], &rec.required))
            .collect();
        let list_params: Vec<Value> = eq
            .map(|q| q.list_params.iter().map(param_meta).collect())
            .unwrap_or_default();

        kinds.insert(
            rec.slug.clone(),
            json!({
                "nsid": rec.nsid,
                "slug": rec.slug,
                "title": rec.title,
                "description": rec.description,
                "fields": fields,
                "primaryKey": "uri",
                "viewType": rec.view_type,
                "listEndpoint": eq.and_then(|q| q.list_lxm.clone()).map_or(Value::Null, Value::String),
                "getEndpoint": eq.and_then(|q| q.get_lxm.clone()).map_or(Value::Null, Value::String),
                "listParams": list_params,
            }),
        );
    }

    let kinds_json =
        serde_json::to_string_pretty(&Value::Object(kinds)).context("serialising record kinds")?;
    Ok(format!(
        "// @generated by layers-codegen. do not edit.\n\
         // Runtime registry of every pub.layers.* record kind, derived from the\n\
         // lexicons + orchestrator-spec/queries.json.\n\n\
         {INTERFACES}\n\
         export const recordKinds: Readonly<Record<string, RecordKindMeta>> = Object.freeze(\n\
         {kinds_json} as Readonly<Record<string, RecordKindMeta>>,\n\
         );\n\
         {HELPERS}"
    ))
}

/// Emit (or check) `web/lib/generated/record-registry.ts`.
///
/// # Errors
/// Propagates lexicon/spec read and write failures.
pub fn emit(repo_root: &Path, check_only: bool) -> Result<bool> {
    let out = repo_root.join("web/lib/generated/record-registry.ts");
    let content = render(repo_root)?;
    super::write_or_check(&out, &content, check_only)
}
