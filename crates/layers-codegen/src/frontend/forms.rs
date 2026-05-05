//! Emit Zod schemas + field metadata for every `pub.layers.*` record
//! lexicon. The metadata feeds the generic annotation renderer
//! (which falls back to a labelled key/value display whenever no
//! concrete `(kind, anchor)` renderer is registered) and any future
//! generated form scaffold.
//!
//! Outputs (one of each per record lexicon):
//!
//! - `web/lib/forms/generated/<dotted.nsid>.schema.ts` — exports a Zod schema named `schema`.
//! - `web/lib/forms/generated/<dotted.nsid>.fields.ts` — exports `fields: readonly FormField[]`.
//! - `web/lib/forms/generated/index.ts` — barrel + `loadFields(nsid)` lazy loader.
//!
//! Module structure goes through the [`super::ts`] IR; field-level
//! emission stays as a small Zod expression builder (a separate IR
//! would buy little since each property maps 1-1 to a chained Zod
//! call). Keep new shapes out of raw string concatenation by adding
//! new constructors to either the TS IR or the Zod helpers below.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use serde_json::{Map, Value};

use super::ts::{TsItem, TsModule};

/// Walk every `pub.layers.*` record lexicon and emit its schema +
/// field metadata + index barrel.
pub fn emit(repo_root: &Path, check_only: bool) -> Result<bool> {
    let lex_root = repo_root.join("lexicons/pub/layers");
    let out_dir = repo_root.join("web/lib/forms/generated");

    let mut emitted: BTreeMap<PathBuf, String> = BTreeMap::new();
    let mut nsids: Vec<String> = Vec::new();

    walk_lexicons(&lex_root, &mut |path| -> Result<()> {
        let raw = std::fs::read_to_string(path)
            .with_context(|| format!("reading {}", path.display()))?;
        let doc: Value = serde_json::from_str(&raw)
            .with_context(|| format!("parsing {}", path.display()))?;
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
        let required: Vec<&str> = record
            .get("required")
            .and_then(Value::as_array)
            .map(|arr| arr.iter().filter_map(Value::as_str).collect())
            .unwrap_or_default();

        nsids.push(nsid.to_owned());
        emitted.insert(
            out_dir.join(format!("{nsid}.schema.ts")),
            build_schema_module(nsid, props, &required).emit(),
        );
        emitted.insert(
            out_dir.join(format!("{nsid}.fields.ts")),
            build_fields_module(nsid, props, &required).emit(),
        );
        Ok(())
    })?;

    nsids.sort();
    emitted.insert(
        out_dir.join("index.ts"),
        build_index_module(&nsids).emit(),
    );

    let mut drift = false;
    if !check_only {
        std::fs::create_dir_all(&out_dir)?;
        for entry in std::fs::read_dir(&out_dir)? {
            let path = entry?.path();
            if path.is_file() && !emitted.contains_key(&path) {
                std::fs::remove_file(&path)?;
            }
        }
    }
    for (path, content) in &emitted {
        let actual = std::fs::read_to_string(path).unwrap_or_default();
        if actual == *content {
            continue;
        }
        if check_only {
            eprintln!("drift in {}", path.display());
            drift = true;
        } else {
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::write(path, content)?;
        }
    }
    if !check_only {
        println!(
            "wrote forms: {} record lexicons (Zod + field metadata)",
            nsids.len()
        );
    }
    Ok(drift)
}

fn walk_lexicons(root: &Path, visit: &mut impl FnMut(&Path) -> Result<()>) -> Result<()> {
    for entry in std::fs::read_dir(root)
        .with_context(|| format!("reading {}", root.display()))?
    {
        let path = entry?.path();
        if path.is_dir() {
            walk_lexicons(&path, visit)?;
        } else if path.extension().and_then(|s| s.to_str()) == Some("json") {
            visit(&path)?;
        }
    }
    Ok(())
}

fn build_index_module(nsids: &[String]) -> TsModule {
    let mut module = TsModule::new();
    module.leading_comment = Some(
        "Barrel of every generated form artefact. Each `<nsid>.schema.ts`\nexports a Zod schema named `schema`; each `<nsid>.fields.ts` exports a\n`fields` array of `{ name, kind, label, description, required, ... }`."
            .into(),
    );
    let nsid_array = nsids
        .iter()
        .map(|n| format!("  '{n}'"))
        .collect::<Vec<_>>()
        .join(",\n");
    module.item(TsItem::Const {
        doc: Some("Every record NSID for which a form scaffold was emitted.".into()),
        exported: true,
        name: "FORM_NSIDS".into(),
        annotation: Some("readonly string[]".into()),
        value: format!("[\n{nsid_array},\n]"),
    });
    if let Some(first) = nsids.first() {
        module.item(TsItem::Raw(format!(
            "export type {{ FormField }} from './{first}.fields';\n"
        )));
    }

    let mut body = String::from("switch (nsid) {\n");
    for n in nsids {
        body.push_str(&format!(
            "  case '{n}':\n    return (await import('./{n}.fields')).fields;\n"
        ));
    }
    body.push_str("  default:\n    return null;\n}");
    module.item(TsItem::Function {
        doc: Some("Lazily import the field metadata for an NSID. Used by the generic annotation renderer at runtime.".into()),
        exported: true,
        is_async: true,
        name: "loadFields".into(),
        params: vec![super::ts::TsParam::new("nsid", "string")],
        return_type: Some("Promise<readonly unknown[] | null>".into()),
        body,
    });
    module
}

fn build_schema_module(nsid: &str, props: &Map<String, Value>, required: &[&str]) -> TsModule {
    let mut module = TsModule::new();
    module.leading_comment = Some(format!(
        "Zod schema mirroring the `{nsid}` record lexicon shape."
    ));
    module.import(super::ts::TsImport::named("zod", ["z"]));

    let mut body = String::from("z.object({\n");
    let mut keys: Vec<&String> = props.keys().collect();
    keys.sort();
    for key in keys {
        let prop = &props[key];
        let inner = zod_for_property(prop);
        let line = if required.contains(&key.as_str()) {
            format!("  {}: {},\n", quote_key(key), inner)
        } else {
            format!("  {}: {}.optional(),\n", quote_key(key), inner)
        };
        body.push_str(&line);
    }
    body.push_str("})");

    module.item(TsItem::Const {
        doc: Some(format!(
            "Validator for `{nsid}` records — every constraint here is derived from the lexicon."
        )),
        exported: true,
        name: "schema".into(),
        annotation: None,
        value: body,
    });
    module.item(TsItem::TypeAlias {
        doc: None,
        exported: true,
        name: "SchemaInput".into(),
        body: "z.input<typeof schema>".into(),
    });
    module.item(TsItem::TypeAlias {
        doc: None,
        exported: true,
        name: "SchemaOutput".into(),
        body: "z.output<typeof schema>".into(),
    });
    module
}

fn build_fields_module(nsid: &str, props: &Map<String, Value>, required: &[&str]) -> TsModule {
    let mut module = TsModule::new();
    module.leading_comment = Some(format!(
        "Field metadata for the `{nsid}` record lexicon. The generic\nannotation renderer + the generated form scaffold both consume this."
    ));

    module.item(TsItem::Raw(FORM_FIELD_INTERFACE.into()));

    let mut keys: Vec<&String> = props.keys().collect();
    keys.sort();
    let mut entries: Vec<String> = Vec::new();
    for key in keys {
        let prop = &props[key];
        entries.push(render_field_object(key, prop, required));
    }

    module.item(TsItem::Const {
        doc: None,
        exported: true,
        name: "fields".into(),
        annotation: Some("readonly FormField[]".into()),
        value: format!("[\n{},\n]", entries.join(",\n")),
    });
    module
}

const FORM_FIELD_INTERFACE: &str = "export interface FormField {\n  readonly name: string;\n  readonly kind:\n    | 'string'\n    | 'enum'\n    | 'integer'\n    | 'number'\n    | 'boolean'\n    | 'datetime'\n    | 'uri'\n    | 'at-uri'\n    | 'array'\n    | 'ref'\n    | 'union'\n    | 'blob'\n    | 'unknown';\n  readonly label: string;\n  readonly description?: string;\n  readonly required: boolean;\n  readonly knownValues?: readonly string[];\n  readonly minLength?: number;\n  readonly maxLength?: number;\n  readonly itemKind?: FormField['kind'];\n  readonly refTarget?: string;\n}\n";

fn render_field_object(key: &str, prop: &Value, required: &[&str]) -> String {
    let kind = field_kind(prop);
    let label = humanize(key);
    let mut body = String::from("  {\n");
    body.push_str(&format!("    name: '{key}',\n"));
    body.push_str(&format!("    kind: '{kind}',\n"));
    body.push_str(&format!("    label: {},\n", quote_string(&label)));
    if let Some(d) = prop.get("description").and_then(Value::as_str) {
        body.push_str(&format!("    description: {},\n", quote_string(d)));
    }
    body.push_str(&format!(
        "    required: {},\n",
        required.contains(&key)
    ));
    if let Some(arr) = prop.get("knownValues").and_then(Value::as_array) {
        let listed: Vec<String> = arr
            .iter()
            .filter_map(Value::as_str)
            .map(|s| format!("'{}'", escape_single(s)))
            .collect();
        if !listed.is_empty() {
            body.push_str(&format!(
                "    knownValues: [{}],\n",
                listed.join(", ")
            ));
        }
    }
    if let Some(min) = prop.get("minLength").and_then(Value::as_u64) {
        body.push_str(&format!("    minLength: {min},\n"));
    }
    if let Some(max) = prop.get("maxLength").and_then(Value::as_u64) {
        body.push_str(&format!("    maxLength: {max},\n"));
    }
    if kind == "array" {
        if let Some(item) = prop.get("items") {
            body.push_str(&format!("    itemKind: '{}',\n", field_kind(item)));
        }
    }
    if let Some(r) = prop.get("ref").and_then(Value::as_str) {
        body.push_str(&format!("    refTarget: '{r}',\n"));
    }
    body.push_str("  }");
    body
}

/// Build a Zod expression for a single property. Each transformation
/// is one chained method call so the output stays trivially auditable.
fn zod_for_property(prop: &Value) -> String {
    let ty = prop.get("type").and_then(Value::as_str).unwrap_or("string");
    match ty {
        "string" => {
            let mut z = String::from("z.string()");
            if let Some(min) = prop.get("minLength").and_then(Value::as_u64) {
                z.push_str(&format!(".min({min})"));
            }
            if let Some(max) = prop.get("maxLength").and_then(Value::as_u64) {
                z.push_str(&format!(".max({max})"));
            }
            match prop.get("format").and_then(Value::as_str) {
                Some("uri") => z.push_str(".url()"),
                Some("datetime") => z.push_str(".datetime({ offset: true })"),
                Some("at-uri") => {
                    z.push_str(".regex(/^at:\\/\\//, 'must start with at://')")
                }
                _ => {}
            }
            if let Some(known) = prop.get("knownValues").and_then(Value::as_array) {
                let pretty: Vec<String> = known
                    .iter()
                    .filter_map(Value::as_str)
                    .map(|s| format!("'{}'", escape_single(s)))
                    .collect();
                if !pretty.is_empty() {
                    return format!("z.union([z.enum([{}]), z.string()])", pretty.join(", "));
                }
            }
            z
        }
        "integer" => {
            let mut z = String::from("z.number().int()");
            if let Some(min) = prop.get("minimum").and_then(Value::as_i64) {
                z.push_str(&format!(".min({min})"));
            }
            if let Some(max) = prop.get("maximum").and_then(Value::as_i64) {
                z.push_str(&format!(".max({max})"));
            }
            z
        }
        "number" => "z.number()".into(),
        "boolean" => "z.boolean()".into(),
        "array" => {
            let item = prop
                .get("items")
                .map(zod_for_property)
                .unwrap_or_else(|| "z.unknown()".into());
            let mut z = format!("z.array({item})");
            if let Some(min) = prop.get("minLength").and_then(Value::as_u64) {
                z.push_str(&format!(".min({min})"));
            }
            if let Some(max) = prop.get("maxLength").and_then(Value::as_u64) {
                z.push_str(&format!(".max({max})"));
            }
            z
        }
        "ref" => "z.unknown()".into(),
        "union" => "z.unknown()".into(),
        "blob" => "z.unknown()".into(),
        "bytes" => "z.unknown()".into(),
        "cid-link" => "z.string()".into(),
        _ => "z.unknown()".into(),
    }
}

fn field_kind(prop: &Value) -> String {
    let ty = prop.get("type").and_then(Value::as_str).unwrap_or("string");
    match ty {
        "string" => match prop.get("format").and_then(Value::as_str) {
            Some("uri") => "uri".into(),
            Some("datetime") => "datetime".into(),
            Some("at-uri") => "at-uri".into(),
            _ if prop
                .get("knownValues")
                .and_then(Value::as_array)
                .is_some_and(|a| !a.is_empty()) =>
            {
                "enum".into()
            }
            _ => "string".into(),
        },
        "integer" => "integer".into(),
        "number" => "number".into(),
        "boolean" => "boolean".into(),
        "array" => "array".into(),
        "ref" => "ref".into(),
        "union" => "union".into(),
        "blob" => "blob".into(),
        _ => "unknown".into(),
    }
}

fn humanize(camel: &str) -> String {
    let mut out = String::with_capacity(camel.len() + 4);
    for (i, ch) in camel.chars().enumerate() {
        if i == 0 {
            out.extend(ch.to_uppercase());
        } else if ch.is_uppercase() {
            out.push(' ');
            out.push(ch);
        } else {
            out.push(ch);
        }
    }
    out
}

fn quote_key(k: &str) -> String {
    if k.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
        && k.chars().next().is_some_and(|c| !c.is_ascii_digit())
    {
        k.to_owned()
    } else {
        format!("'{}'", escape_single(k))
    }
}

fn quote_string(s: &str) -> String {
    format!("'{}'", escape_single(s))
}

fn escape_single(s: &str) -> String {
    s.replace('\\', "\\\\").replace('\'', "\\'")
}
