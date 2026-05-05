//! Lens-record authoring via the panproto-lens DSL.
//!
//! `cargo run -p layers-codegen -- lenses` reads
//! `lexicons/lenses/manifest.json`, then for each entry:
//!
//! 1. Parses the source/target lexicon JSONs into `panproto_schema::Schema`
//!    via [`panproto_protocols::web_document::atproto::parse_lexicon`].
//! 2. Loads the hand-authored lens DSL spec at
//!    `lexicons/lenses/<name>/lens.yaml` (or `.json`/`.ncl`).
//! 3. Compiles it into a `ProtolensChain` via [`panproto_lens_dsl::compile`].
//! 4. Emits three artefacts under `lexicons/lenses/<name>/`:
//!    `source.schema.record.json`, `target.schema.record.json`,
//!    `lens.record.json` — matching the
//!    `dev.panproto.schema.{schema,lens}` record shapes.
//!
//! The blobs are msgpack-encoded and inlined as base64-url so the
//! orchestrator boot path can install them into an
//! `InMemorySchemaLoader` / `InMemoryResolver` without a separate
//! blob store.

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use anyhow::{Context, Result, anyhow};
use base64::Engine;
use idiolect_lens::runtime::LensBody;
use panproto_protocols::web_document::atproto::parse_lexicon;
use panproto_schema::Schema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

/// One entry in `lexicons/lenses/manifest.json`.
#[derive(Debug, Deserialize)]
pub struct LensManifestEntry {
    /// Stable folder + AT-URI rkey used for the emitted records.
    pub name: String,
    /// Source NSID this lens applies to (e.g. `at.margin.note`).
    pub source_nsid: String,
    /// Target NSID the lens projects into.
    pub target_nsid: String,
    /// Path to the source lexicon JSON (relative to repo root).
    pub source_lexicon: String,
    /// Path to the target lexicon JSON (relative to repo root).
    pub target_lexicon: String,
    /// Body vertex name used by the DSL compiler. Defaults to the
    /// source NSID's `<nsid>` form when absent (panproto's
    /// `parse_lexicon` names the record's root object after the
    /// NSID itself).
    #[serde(default)]
    pub body_vertex: Option<String>,
}

/// Top-level shape of `manifest.json`.
#[derive(Debug, Deserialize)]
pub struct LensManifest {
    /// DID the codegen pretends owns the emitted records. Set to a
    /// stable identifier so AT-URIs are deterministic across
    /// regenerations.
    pub authoring_did: String,
    /// Lens entries.
    pub entries: Vec<LensManifestEntry>,
}

/// Wire shape of the emitted `dev.panproto.schema.schema` record body.
#[derive(Debug, Serialize)]
struct SchemaRecord<'a> {
    #[serde(rename = "$type")]
    nsid: &'a str,
    protocol: &'a str,
    #[serde(rename = "objectHash")]
    object_hash: String,
    #[serde(rename = "vertexCount")]
    vertex_count: usize,
    #[serde(rename = "edgeCount")]
    edge_count: usize,
    blob: BlobRef,
    #[serde(rename = "createdAt")]
    created_at: &'a str,
}

/// Wire shape of the emitted `dev.panproto.schema.lens` record body.
#[derive(Debug, Serialize)]
struct LensRecord<'a> {
    #[serde(rename = "$type")]
    nsid: &'a str,
    #[serde(rename = "sourceSchema")]
    source_schema: String,
    #[serde(rename = "targetSchema")]
    target_schema: String,
    #[serde(rename = "objectHash")]
    object_hash: String,
    blob: BlobRef,
    #[serde(rename = "createdAt")]
    created_at: &'a str,
}

/// Inline blob shape used in the emitted record.
#[derive(Debug, Serialize)]
struct BlobRef {
    #[serde(rename = "$type")]
    type_: &'static str,
    #[serde(rename = "mimeType")]
    mime_type: &'static str,
    size: usize,
    /// Base64-url-encoded msgpack body.
    base64: String,
}

const CREATED_AT: &str = "2026-05-04T00:00:00.000Z";

/// Entry point: read manifest, regenerate every lens output.
///
/// # Errors
/// Bubbles parse failures, DSL compile errors, and IO errors.
pub fn cmd_lenses(repo_root: &Path, _check_only: bool) -> Result<ExitCode> {
    let manifest_path = repo_root.join("lexicons/lenses/manifest.json");
    let manifest_raw = std::fs::read_to_string(&manifest_path)
        .with_context(|| format!("reading {}", manifest_path.display()))?;
    let manifest: LensManifest = serde_json::from_str(&manifest_raw)
        .with_context(|| format!("parsing {}", manifest_path.display()))?;

    let mut emitted = 0usize;
    for entry in &manifest.entries {
        let dir = repo_root.join(format!("lexicons/lenses/{}", entry.name));
        std::fs::create_dir_all(&dir)
            .with_context(|| format!("creating {}", dir.display()))?;

        let source_schema = load_lexicon_as_schema(repo_root, &entry.source_lexicon)
            .with_context(|| format!("source lexicon {}", entry.source_lexicon))?;
        let target_schema = load_lexicon_as_schema(repo_root, &entry.target_lexicon)
            .with_context(|| format!("target lexicon {}", entry.target_lexicon))?;
        let _ = &target_schema;

        let body_vertex = entry
            .body_vertex
            .clone()
            .unwrap_or_else(|| entry.source_nsid.clone());
        let dsl_path = pick_dsl_path(&dir)
            .with_context(|| format!("locating lens DSL for `{}`", entry.name))?;
        let chain = panproto_lens_dsl::load_and_compile(&dsl_path, &body_vertex)
            .with_context(|| format!("compile {}", dsl_path.display()))?
            .chain;

        let (_source_record, source_uri) = emit_schema_record(
            &dir,
            "source",
            &source_schema,
            &manifest.authoring_did,
            &entry.name,
            "source",
        )?;
        let (_target_record, target_uri) = emit_schema_record(
            &dir,
            "target",
            &target_schema,
            &manifest.authoring_did,
            &entry.name,
            "target",
        )?;
        emit_lens_record(&dir, &chain, &source_uri, &target_uri)?;
        emitted += 1;
        eprintln!(
            "emitted lens `{}` ({} -> {})",
            entry.name, entry.source_nsid, entry.target_nsid
        );
    }
    eprintln!("wrote {emitted} lenses under lexicons/lenses/");
    Ok(ExitCode::SUCCESS)
}

fn pick_dsl_path(dir: &Path) -> Result<PathBuf> {
    for ext in ["yaml", "yml", "json", "ncl"] {
        let path = dir.join(format!("lens.{ext}"));
        if path.exists() {
            return Ok(path);
        }
    }
    Err(anyhow!(
        "no lens DSL file found under {}: expected one of lens.yaml/yml/json/ncl",
        dir.display()
    ))
}

fn load_lexicon_as_schema(repo_root: &Path, rel: &str) -> Result<Schema> {
    let path = repo_root.join(rel);
    let raw = std::fs::read_to_string(&path)
        .with_context(|| format!("reading {}", path.display()))?;
    let value: Value = serde_json::from_str(&raw)
        .with_context(|| format!("parsing {} as json", path.display()))?;
    parse_lexicon(&value).map_err(|e| anyhow!("parse_lexicon {}: {e}", path.display()))
}

fn emit_schema_record(
    dir: &Path,
    side: &str,
    schema: &Schema,
    authoring_did: &str,
    lens_name: &str,
    schema_kind: &str,
) -> Result<(PathBuf, String)> {
    let bytes = rmp_serde::to_vec_named(schema)
        .with_context(|| format!("msgpack-serialize {side} schema"))?;
    let object_hash = sha256_hex(&bytes);
    let rkey = format!("{lens_name}-{schema_kind}");
    let uri = format!("at://{authoring_did}/dev.panproto.schema.schema/{rkey}");
    let record = SchemaRecord {
        nsid: "dev.panproto.schema.schema",
        protocol: "atproto",
        object_hash: format!("sha256:{object_hash}"),
        vertex_count: schema.vertices.len(),
        edge_count: schema.edges.len(),
        blob: BlobRef {
            type_: "blob",
            mime_type: "application/x-msgpack",
            size: bytes.len(),
            base64: base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&bytes),
        },
        created_at: CREATED_AT,
    };
    let out = dir.join(format!("{side}.schema.record.json"));
    std::fs::write(
        &out,
        format!("{}\n", serde_json::to_string_pretty(&record)?),
    )
    .with_context(|| format!("writing {}", out.display()))?;
    Ok((out, uri))
}

fn emit_lens_record(
    dir: &Path,
    chain: &panproto_lens::protolens::ProtolensChain,
    source_uri: &str,
    target_uri: &str,
) -> Result<()> {
    let body = LensBody::Chain(chain.clone());
    let bytes = rmp_serde::to_vec_named(&body)
        .with_context(|| "msgpack-serialize lens body")?;
    let object_hash = sha256_hex(&bytes);
    let record = LensRecord {
        nsid: "dev.panproto.schema.lens",
        source_schema: source_uri.to_owned(),
        target_schema: target_uri.to_owned(),
        object_hash: format!("sha256:{object_hash}"),
        blob: BlobRef {
            type_: "blob",
            mime_type: "application/x-msgpack",
            size: bytes.len(),
            base64: base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&bytes),
        },
        created_at: CREATED_AT,
    };
    let out = dir.join("lens.record.json");
    std::fs::write(
        &out,
        format!("{}\n", serde_json::to_string_pretty(&record)?),
    )
    .with_context(|| format!("writing {}", out.display()))?;
    Ok(())
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    digest.iter().map(|b| format!("{b:02x}")).collect()
}
