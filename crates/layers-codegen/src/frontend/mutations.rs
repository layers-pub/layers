//! Per-namespace mutation hooks (`useCreate<X>` / `useUpdate<X>` /
//! `useDelete<X>`) for every `pub.layers.*` record collection.
//!
//! ATProto puts writes in the user's PDS, not in the appview, so the
//! generated hooks delegate to a [`RecordWriter`] (typically backed
//! by an OAuth session) injected via React context. Each hook
//! invalidates the matching read query keys after a successful
//! write so the cached list/get views stay in sync.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use serde_json::Value;

use super::fragments::{MutationHookSpec, mutation_hook_fragments};
use super::ts::{TsImport, TsItem, TsModule};

struct RecordEntry {
    nsid: String,
    namespace: String,
    pascal: String,
}

/// Walk record lexicons, group by namespace, emit mutation hooks +
/// the shared `RecordWriter` context module.
pub fn emit(repo_root: &Path, check_only: bool) -> Result<bool> {
    let lex_root = repo_root.join("lexicons/pub/layers");
    let mut by_namespace: BTreeMap<String, Vec<RecordEntry>> = BTreeMap::new();
    walk(&lex_root, &mut |path| -> Result<()> {
        let raw = std::fs::read_to_string(path)?;
        let doc: Value = serde_json::from_str(&raw)?;
        let Some(nsid) = doc.get("id").and_then(Value::as_str) else {
            return Ok(());
        };
        if doc
            .get("defs")
            .and_then(|d| d.get("main"))
            .and_then(|m| m.get("type"))
            .and_then(Value::as_str)
            != Some("record")
        {
            return Ok(());
        }
        let rest = nsid.strip_prefix("pub.layers.").unwrap_or(nsid);
        let mut parts = rest.split('.');
        let namespace = parts.next().unwrap_or("misc").to_owned();
        let leaf = parts.next_back().unwrap_or(rest);
        by_namespace
            .entry(namespace.clone())
            .or_default()
            .push(RecordEntry {
                nsid: nsid.to_owned(),
                namespace,
                pascal: pascal_case(leaf),
            });
        Ok(())
    })?;

    let out_dir = repo_root.join("web/lib/api/generated/mutations");
    let mut emitted: BTreeMap<PathBuf, String> = BTreeMap::new();
    emitted.insert(out_dir.join("writer.ts"), build_writer_module().emit());
    for (ns, entries) in &by_namespace {
        emitted.insert(
            out_dir.join(format!("{ns}.ts")),
            build_namespace_module(ns, entries).emit(),
        );
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
        let total: usize = by_namespace.values().map(Vec::len).sum();
        println!(
            "wrote mutations: {} namespaces, {} record types",
            by_namespace.len(),
            total
        );
    }
    Ok(drift)
}

fn walk(root: &Path, visit: &mut impl FnMut(&Path) -> Result<()>) -> Result<()> {
    for entry in std::fs::read_dir(root)
        .with_context(|| format!("reading {}", root.display()))?
    {
        let path = entry?.path();
        if path.is_dir() {
            walk(&path, visit)?;
        } else if path.extension().and_then(|s| s.to_str()) == Some("json") {
            visit(&path)?;
        }
    }
    Ok(())
}

fn build_index_module<'a>(namespaces: impl IntoIterator<Item = &'a String>) -> TsModule {
    let mut module = TsModule::new();
    module.leading_comment = Some("Barrel of every mutation namespace + the RecordWriter context.".into());
    module.item(TsItem::Raw("export * from './writer.js';\n".into()));
    for ns in namespaces {
        module.item(TsItem::Raw(format!("export * from './{ns}.js';\n")));
    }
    module
}

/// Hand-authored writer-context module rendered through the IR (the
/// shape is fixed and parameterless, so this is a single typed
/// fragment rather than a per-record loop).
fn build_writer_module() -> TsModule {
    let mut module = TsModule::new();
    module.leading_comment = Some(
        "Abstract record writer the generated mutation hooks delegate to.\n\n\
Layers' appview is read-only; writes land in the user's PDS via\n\
`com.atproto.repo.{putRecord,applyWrites,deleteRecord}`. The app\n\
provides a concrete implementation backed by its OAuth session\n\
(typically `@atproto/oauth-client-browser`) through\n\
`RecordWriterProvider`."
            .into(),
    );
    module.import(TsImport::named("react", ["createContext", "useContext"]));
    module.item(TsItem::Raw(
        "export interface RecordWriter {\n  /** Create or replace a record at `(repo, collection, rkey)`. */\n  putRecord(args: {\n    repo: string;\n    collection: string;\n    rkey?: string;\n    record: unknown;\n  }): Promise<{ uri: string; cid: string }>;\n\n  /** Delete the record at `(repo, collection, rkey)`. Idempotent. */\n  deleteRecord(args: {\n    repo: string;\n    collection: string;\n    rkey: string;\n  }): Promise<void>;\n\n  /** DID of the authenticated repo (target of every write). */\n  readonly repoDid: string;\n}\n"
            .into(),
    ));
    module.item(TsItem::Const {
        doc: None,
        exported: false,
        name: "RecordWriterContext".into(),
        annotation: None,
        value: "createContext<RecordWriter | null>(null)".into(),
    });
    module.item(TsItem::Const {
        doc: Some("Provider component scoping a `RecordWriter` to a subtree.".into()),
        exported: true,
        name: "RecordWriterProvider".into(),
        annotation: None,
        value: "RecordWriterContext.Provider".into(),
    });
    module.item(TsItem::Function {
        doc: Some("Resolve the currently-installed `RecordWriter`. Throws when missing.".into()),
        exported: true,
        is_async: false,
        name: "useRecordWriter".into(),
        params: vec![],
        return_type: Some("RecordWriter".into()),
        body: "const writer = useContext(RecordWriterContext);\nif (!writer) {\n  throw new Error(\n    'useRecordWriter: no RecordWriter installed. Wrap your tree in <RecordWriterProvider>.'\n  );\n}\nreturn writer;".into(),
    });
    module
}

fn build_namespace_module(namespace: &str, entries: &[RecordEntry]) -> TsModule {
    let mut module = TsModule::new();
    module.leading_comment = Some(format!(
        "Mutation hooks for the `pub.layers.{namespace}.*` record collections."
    ));
    module
        .import(
            TsImport::named(
                "@tanstack/react-query",
                ["useMutation", "useQueryClient"],
            )
            .add_type("UseMutationOptions"),
        )
        .import(TsImport::named("./writer.js", ["useRecordWriter"]));

    for entry in entries {
        let combined = format!("{}{}", pascal_case(&entry.namespace), entry.pascal);
        let spec = MutationHookSpec {
            nsid: &entry.nsid,
            namespace: &entry.namespace,
            pascal: &combined,
        };
        for item in mutation_hook_fragments(&spec) {
            module.item(item);
        }
    }
    module
}

fn pascal_case(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut up = true;
    for ch in s.chars() {
        if ch == '_' || ch == '-' {
            up = true;
        } else if up {
            out.extend(ch.to_uppercase());
            up = false;
        } else {
            out.push(ch);
        }
    }
    if let Some(first) = out.chars().next() {
        if first.is_lowercase() {
            let mut chars = out.chars();
            let head = chars.next().unwrap().to_uppercase().to_string();
            return head + chars.as_str();
        }
    }
    out
}
