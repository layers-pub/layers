//! YAML seed-tree walker + record model.
//!
//! Layout convention:
//!
//! ```text
//! lexicons/seeds/
//!   <handle>/                    # PDS account handle, e.g. `auth.layers.pub`
//!     <name>.yaml                # one record per file
//! ```
//!
//! The handle directory name is the PDS account that owns the
//! record. `<name>.yaml` is the human-readable filename; the on-PDS
//! `rkey` is the structural-fingerprint hex (computed by
//! [`crate::seed::fingerprint`]) so identical content always
//! resolves to identical rkeys.
//!
//! Each YAML carries:
//!
//! ```yaml
//! collection: pub.layers.ontology.ontology
//! record:
//!   $type: pub.layers.ontology.ontology
//!   name: "UD Universal POS Tags v2"
//!   description: "..."
//!   languages: []
//!   createdAt: "2026-05-06T00:00:00Z"
//! changelog:
//!   summary: "Initial publish"
//! ```
//!
//! `record` is the literal record body that lands on the PDS;
//! `collection` is the NSID. `changelog` is optional metadata the
//! seed pipeline uses to author a `pub.layers.changelog.entry` when
//! the fingerprint shifts.

use std::path::{Path, PathBuf};

use anyhow::{Context, Result, anyhow};
use serde::Deserialize;
use serde_json::Value;

/// One seed file, parsed.
#[derive(Debug, Clone)]
pub struct SeedEntry {
    /// PDS handle that hosts this record (the immediate parent
    /// directory under `lexicons/seeds/`).
    pub account: String,
    /// Path relative to the seeds root, used for diagnostics.
    pub relpath: PathBuf,
    /// NSID of the record's collection.
    pub collection: String,
    /// Record body (the JSON value the PDS stores).
    pub body: Value,
    /// Optional changelog summary the publisher uses on fingerprint
    /// changes.
    pub changelog_summary: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawSeed {
    collection: String,
    record: Value,
    #[serde(default)]
    changelog: Option<RawChangelog>,
}

#[derive(Debug, Deserialize)]
struct RawChangelog {
    summary: Option<String>,
}

/// Walk the seeds tree and gather every record. Two source modes
/// land in the same `Vec<SeedEntry>`:
///
/// 1. **Lexicon-derived records.** Lexicon JSON files under
///    `lexicons/pub/layers/auth*.json` and `lexicons/foreign/**/*.json`
///    are the registry's single source of truth for permission sets
///    and vendored foreign schemas. The walker reads them directly
///    and wraps each as a `com.atproto.lexicon.schema` record on the
///    matching account. No YAML duplicate.
/// 2. **Hand-authored YAML seeds.** Every other file at
///    `<seeds-root>/<handle>/<name>.yaml` carries a `collection` and
///    `record` body for content that is itself canonical
///    (operator-authored ontologies, the demo corpus, paradigm
///    templates, the operator changelog).
///
/// # Errors
/// Returns the first I/O or YAML parse error encountered.
pub fn walk(seeds_root: &Path) -> Result<Vec<SeedEntry>> {
    let mut out: Vec<SeedEntry> = Vec::new();
    let lexicons_root = seeds_root
        .parent()
        .ok_or_else(|| anyhow!("seeds dir has no parent"))?;
    walk_lexicon_derived(lexicons_root, &mut out)?;
    if seeds_root.exists() {
        walk_yaml_seeds(seeds_root, &mut out)?;
    }
    out.sort_by(|a, b| a.relpath.cmp(&b.relpath));
    Ok(out)
}

/// Wrap permission-set and vendored-foreign lexicon JSONs as
/// `com.atproto.lexicon.schema` records on the matching account.
fn walk_lexicon_derived(lexicons_root: &Path, out: &mut Vec<SeedEntry>) -> Result<()> {
    // Permission sets: `lexicons/pub/layers/auth*.json` → `auth.layers.pub`.
    let pub_layers = lexicons_root.join("pub/layers");
    if pub_layers.exists() {
        for entry in std::fs::read_dir(&pub_layers)? {
            let path = entry?.path();
            if !path.is_file() || path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
                continue;
            };
            if !stem.starts_with("auth") {
                continue;
            }
            push_lexicon_record(lexicons_root, &path, "auth.layers.pub", out)?;
        }
    }
    // Vendored foreign lexicons: `lexicons/foreign/**/*.json` → `foreign.layers.pub`.
    let foreign_root = lexicons_root.join("foreign");
    if foreign_root.exists() {
        for entry in walkdir(&foreign_root)? {
            if entry.extension().and_then(|s| s.to_str()) == Some("json") {
                push_lexicon_record(lexicons_root, &entry, "foreign.layers.pub", out)?;
            }
        }
    }
    Ok(())
}

fn push_lexicon_record(
    lexicons_root: &Path,
    path: &Path,
    account: &str,
    out: &mut Vec<SeedEntry>,
) -> Result<()> {
    let raw = std::fs::read_to_string(path)
        .with_context(|| format!("reading {}", path.display()))?;
    let mut body: Value = serde_json::from_str(&raw)
        .with_context(|| format!("parsing {} as lexicon JSON", path.display()))?;
    if let Value::Object(map) = &mut body {
        map.insert(
            "$type".into(),
            Value::String("com.atproto.lexicon.schema".into()),
        );
    }
    let relpath = path
        .strip_prefix(lexicons_root)
        .map_err(|_| anyhow!("{} not under {}", path.display(), lexicons_root.display()))?
        .to_path_buf();
    out.push(SeedEntry {
        account: account.to_owned(),
        relpath,
        collection: "com.atproto.lexicon.schema".into(),
        body,
        changelog_summary: None,
    });
    Ok(())
}

fn walkdir(root: &Path) -> Result<Vec<PathBuf>> {
    let mut out = Vec::new();
    fn recurse(p: &Path, out: &mut Vec<PathBuf>) -> Result<()> {
        for entry in std::fs::read_dir(p)? {
            let path = entry?.path();
            if path.is_dir() {
                recurse(&path, out)?;
            } else {
                out.push(path);
            }
        }
        Ok(())
    }
    recurse(root, &mut out)?;
    Ok(out)
}

fn walk_yaml_seeds(seeds_root: &Path, out: &mut Vec<SeedEntry>) -> Result<()> {
    let account_dirs = std::fs::read_dir(seeds_root)
        .with_context(|| format!("reading {}", seeds_root.display()))?;
    for account_entry in account_dirs {
        let account_path = account_entry?.path();
        if !account_path.is_dir() {
            continue;
        }
        let Some(account) = account_path.file_name().and_then(|s| s.to_str()) else {
            continue;
        };
        walk_account(seeds_root, account, &account_path, out)?;
    }
    Ok(())
}

fn walk_account(
    seeds_root: &Path,
    account: &str,
    dir: &Path,
    out: &mut Vec<SeedEntry>,
) -> Result<()> {
    for entry in std::fs::read_dir(dir).with_context(|| format!("reading {}", dir.display()))? {
        let path = entry?.path();
        if path.is_dir() {
            walk_account(seeds_root, account, &path, out)?;
            continue;
        }
        if path.extension().and_then(|s| s.to_str()) != Some("yaml") {
            continue;
        }
        let raw = std::fs::read_to_string(&path)
            .with_context(|| format!("reading {}", path.display()))?;
        let parsed: RawSeed = serde_yaml::from_str(&raw)
            .with_context(|| format!("parsing {} as seed YAML", path.display()))?;
        let relpath = path
            .strip_prefix(seeds_root)
            .map_err(|_| anyhow!("{} not under {}", path.display(), seeds_root.display()))?
            .to_path_buf();
        out.push(SeedEntry {
            account: account.to_owned(),
            relpath,
            collection: parsed.collection,
            body: parsed.record,
            changelog_summary: parsed.changelog.and_then(|c| c.summary),
        });
    }
    Ok(())
}
