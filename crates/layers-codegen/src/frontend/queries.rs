//! Per-namespace TanStack Query hooks generated from
//! `orchestrator-spec/queries.json`.
//!
//! Composition: this module groups spec entries by `pub.layers.<ns>.*`
//! namespace, then for each entry asks
//! [`super::fragments::query_hook_fragment`] for a typed fragment of
//! IR nodes. The IR nodes are added to a [`super::ts::TsModule`] and
//! emitted as one TypeScript file per namespace. Adding a new
//! generator pattern means adding a fragment in `fragments.rs`, never
//! string-templating in here.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result, anyhow};
use serde_json::Value;

use super::fragments::{KeysFactoryEntry, QueryHookSpec, query_hook_fragment};
use super::ts::{TsImport, TsItem, TsModule};

/// Emit one `<namespace>.ts` per `pub.layers.*` namespace plus an
/// `index.ts` barrel. Returns true on drift in `check_only`.
pub fn emit(repo_root: &Path, check_only: bool) -> Result<bool> {
    let spec_path = repo_root.join("orchestrator-spec/queries.json");
    let raw = std::fs::read_to_string(&spec_path)
        .with_context(|| format!("reading {}", spec_path.display()))?;
    let spec: Value = serde_json::from_str(&raw)
        .with_context(|| format!("parsing {} as json", spec_path.display()))?;
    let queries = spec
        .get("queries")
        .and_then(Value::as_array)
        .ok_or_else(|| anyhow!("queries.json: missing top-level `queries` array"))?;

    let out_dir = repo_root.join("web/lib/api/generated/queries");

    let mut by_namespace: BTreeMap<String, Vec<&Value>> = BTreeMap::new();
    for q in queries {
        let lxm = q
            .get("lxm")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("query missing `lxm`"))?;
        let ns = namespace_for(lxm)
            .ok_or_else(|| anyhow!("could not derive namespace from `{lxm}`"))?;
        by_namespace.entry(ns.to_owned()).or_default().push(q);
    }

    let mut emitted: BTreeMap<PathBuf, String> = BTreeMap::new();
    for (ns, entries) in &by_namespace {
        let module = build_namespace_module(ns, entries);
        emitted.insert(out_dir.join(format!("{ns}.ts")), module.emit());
    }
    emitted.insert(
        out_dir.join("index.ts"),
        build_index_module(by_namespace.keys()).emit(),
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
            "wrote queries hooks: {} namespaces, {} entries",
            by_namespace.len(),
            queries.len()
        );
    }
    Ok(drift)
}

fn namespace_for(lxm: &str) -> Option<&str> {
    lxm.strip_prefix("pub.layers.")?.split('.').next()
}

fn build_index_module<'a>(namespaces: impl IntoIterator<Item = &'a String>) -> TsModule {
    let mut module = TsModule::new();
    module.leading_comment = Some("Barrel of every generated namespace hook module.".into());
    let names: Vec<&String> = namespaces.into_iter().collect();
    for ns in names {
        module.item(TsItem::Raw(format!("export * from './{ns}';\n")));
    }
    module
}

fn build_namespace_module(namespace: &str, entries: &[&Value]) -> TsModule {
    let mut module = TsModule::new();
    module.leading_comment = Some(format!(
        "Hooks for the `pub.layers.{namespace}.*` query namespace."
    ));
    module
        .import(
            TsImport::named(
                "@tanstack/react-query",
                ["useInfiniteQuery", "useQuery"],
            )
            .add_type("UseInfiniteQueryOptions")
            .add_type("UseQueryOptions"),
        )
        .import(TsImport::named("@/lib/api/client", ["api"]))
        .import(TsImport::types("@/lib/api/schema.generated", ["paths"]));

    let mut keys: Vec<KeysFactoryEntry> = Vec::new();
    for entry in entries {
        let lxm = entry.get("lxm").and_then(Value::as_str).unwrap();
        let snake = entry.get("name").and_then(Value::as_str).unwrap();
        let method_camel = snake_to_camel(snake);
        let method_pascal = pascal_case(&method_camel);
        let predicate = entry.get("predicate").and_then(Value::as_str).unwrap_or("");
        let is_get = predicate.ends_with("_by_uri");
        let has_cursor = entry
            .get("params")
            .and_then(Value::as_array)
            .map(|ps| {
                ps.iter()
                    .any(|p| p.get("name").and_then(Value::as_str) == Some("cursor"))
            })
            .unwrap_or(false);
        let spec = QueryHookSpec {
            lxm,
            namespace,
            method_camel: &method_camel,
            method_pascal: &method_pascal,
            paginated: !is_get && has_cursor,
        };
        let (items, key_entry) = query_hook_fragment(&spec);
        for item in items {
            module.item(item);
        }
        keys.push(key_entry);
    }

    if namespace == "integration" {
        let (items, extra_keys) = extra_integration_items();
        for item in items {
            module.item(item);
        }
        keys.extend(extra_keys);
    }

    let factory_doc = format!(
        "Query-key factory for the `{namespace}` namespace. Use `{namespace}QueryKeys.<method>(params)` to build a stable cache key for invalidation."
    );
    let body = keys
        .iter()
        .map(|k| format!("  {}", k.render_member()))
        .collect::<Vec<_>>()
        .join(",\n");
    module.item(TsItem::Const {
        doc: Some(factory_doc),
        exported: true,
        name: format!("{namespace}QueryKeys"),
        annotation: None,
        value: format!("{{\n{body},\n}} as const"),
    });

    module
}

/// IR for the two integration endpoints (`getExternal`, `applyLens`)
/// that live outside the spec-driven route table. Built using the
/// same fragment factories so they stay structurally identical to the
/// spec-driven hooks. Returns both the items and their key-factory
/// entries so the namespace's `QueryKeys` const includes them.
fn extra_integration_items() -> (Vec<TsItem>, Vec<KeysFactoryEntry>) {
    let mut items = Vec::new();
    let mut keys = Vec::new();
    items.push(TsItem::Section(
        "Manual integration endpoints (outside the spec-driven tree).".into(),
    ));
    for spec in [
        QueryHookSpec {
            lxm: "pub.layers.integration.getExternal",
            namespace: "integration",
            method_camel: "getExternal",
            method_pascal: "GetExternal",
            paginated: false,
        },
        QueryHookSpec {
            lxm: "pub.layers.integration.applyLens",
            namespace: "integration",
            method_camel: "applyLens",
            method_pascal: "ApplyLens",
            paginated: false,
        },
    ] {
        let (frag_items, key) = query_hook_fragment(&spec);
        items.extend(frag_items);
        keys.push(key);
    }
    (items, keys)
}

fn snake_to_camel(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut up = false;
    for ch in s.chars() {
        if ch == '_' {
            up = true;
        } else if up {
            out.extend(ch.to_uppercase());
            up = false;
        } else {
            out.push(ch);
        }
    }
    out
}

fn pascal_case(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars();
    if let Some(first) = chars.next() {
        out.extend(first.to_uppercase());
    }
    out.extend(chars);
    out
}
