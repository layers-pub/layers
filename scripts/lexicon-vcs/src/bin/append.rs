//! Append one lexicon release to the existing Layers Panproto VCS.
//!
//! Mirrors the per-version step of `layers-lexicon-vcs` (bundle parse,
//! per-file project tree, staged structural migration, commit, tag, schema
//! and adjacent-lens emission) for a single new version whose HEAD already
//! holds the immediately preceding release.

use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result, bail};
use layers_lexicon_vcs::structural_migration;
use panproto_gat::Name;
use panproto_project::build_project_tree;
use panproto_protocols::{parse_schema_bundle, parse_schema_bundle_project};
use panproto_schema::Schema;
use panproto_vcs::index::{StagedSchema, ValidationStatus};
use panproto_vcs::{
    CommitOptions, Object, Repository, Store, assemble_schema, project_coproduct_protocol, refs,
    store,
};

const AUTHOR: &str = "layers-lexicon-vcs";

fn main() -> Result<()> {
    let mut args = env::args().skip(1);
    let output = args
        .next()
        .map(PathBuf::from)
        .context("usage: append <lexicons-dir> <version> <previous-version>")?;
    let version = args
        .next()
        .context("usage: append <lexicons-dir> <version> <previous-version>")?;
    let previous = args
        .next()
        .context("usage: append <lexicons-dir> <version> <previous-version>")?;
    append_version(&output, &version, &previous)
}

fn append_version(output: &Path, version: &str, previous: &str) -> Result<()> {
    if !output.join(".panproto").exists() {
        bail!("no Panproto repository at {}", output.join(".panproto").display());
    }

    let mut repo = Repository::open(output)
        .with_context(|| format!("open Panproto repository at {}", output.display()))?;

    let lexicon_root = output.join("pub/layers");
    let documents = record_documents(&lexicon_root)?;
    let bundle_documents: Vec<serde_json::Value> =
        documents.iter().map(|(_, doc)| doc.clone()).collect();
    let bundle = parse_schema_bundle("atproto", &bundle_documents)
        .with_context(|| format!("parse {version} bundled schema"))?;
    let project = parse_schema_bundle_project("atproto", &documents)
        .with_context(|| format!("parse {version} lexicon project"))?;

    let files: HashMap<PathBuf, _> = project.files.into_iter().collect();
    let protocols: HashMap<PathBuf, String> = files
        .keys()
        .map(|path| (path.clone(), "atproto".to_owned()))
        .collect();
    let file_count = files.len();
    let root_id = build_project_tree(
        repo.store_mut(),
        &files,
        &protocols,
        &project.cross_file_edges,
    )
    .with_context(|| format!("store {version} per-file schema tree"))?;

    let schema = assemble_schema(repo.store(), &root_id, &project_coproduct_protocol())
        .with_context(|| format!("assemble {version} project schema"))?;

    stage_tree(&mut repo, root_id, &schema)
        .with_context(|| format!("stage {version} schema tree"))?;

    let message = format!("Release lexicon schemas {}", &version[1..]);
    let commit_id = repo
        .commit_with_options(&message, AUTHOR, &CommitOptions { skip_verify: true })
        .with_context(|| format!("commit {version} schema"))?;
    refs::create_tag(repo.store_mut(), version, commit_id)
        .with_context(|| format!("tag {version} schema"))?;

    let schemas_dir = output.join(".schemas");
    let schema_path = schemas_dir.join(format!("{version}.json"));
    let serialized = serde_json::to_string_pretty(&bundle).context("serialize bundled schema")?;
    fs::write(&schema_path, serialized).with_context(|| format!("write {}", schema_path.display()))?;

    // Adjacent lens: identity-on-surviving-structure, same construction as the
    // seven existing lenses. The clean-break entries are added by a separate
    // hand-authoring step so the additive/surviving structure stays auto-derived.
    let previous_bundle: Schema = serde_json::from_str(
        &fs::read_to_string(schemas_dir.join(format!("{previous}.json")))
            .with_context(|| format!("read {previous} bundled schema"))?,
    )
    .with_context(|| format!("parse {previous} bundled schema"))?;
    let lens = structural_migration(&previous_bundle, &bundle);
    let lens_path = output.join("lenses").join(format!("{previous}-to-{version}.json"));
    fs::write(
        &lens_path,
        serde_json::to_string_pretty(&lens).context("serialize adjacent lens")?,
    )
    .with_context(|| format!("write {}", lens_path.display()))?;

    let tags = refs::list_tags(repo.store()).context("read VCS tags")?;
    let commits = repo.log(None).context("read VCS history")?;
    println!(
        "{version}: {file_count} files, {} vertices, {} edges, commit {}",
        schema.vertex_count(),
        schema.edge_count(),
        short_id(&commit_id.to_string())
    );
    println!("history now holds {} commits and {} tags", commits.len(), tags.len());
    Ok(())
}

fn stage_tree(repo: &mut Repository, root_id: panproto_vcs::ObjectId, schema: &Schema) -> Result<()> {
    let head_id = store::resolve_head(repo.store()).context("resolve Panproto HEAD")?;
    let source = if let Some(head_id) = head_id {
        let Object::Commit(head) = repo.store().get(&head_id).context("load Panproto HEAD commit")?
        else {
            bail!("Panproto HEAD did not resolve to a commit");
        };
        Some(
            assemble_schema(repo.store(), &head.schema_id, &project_coproduct_protocol())
                .context("assemble prior project schema")?,
        )
    } else {
        None
    };
    let migration = source
        .as_ref()
        .map(|source_schema| structural_migration(source_schema, schema));
    let migration_id = if let (Some(source), Some(migration)) = (source, migration.as_ref()) {
        let source_id = repo
            .store_mut()
            .put(&Object::FlatSchema(Box::new(source)))
            .context("store migration source schema")?;
        let target_id = repo
            .store_mut()
            .put(&Object::FlatSchema(Box::new(schema.clone())))
            .context("store migration target schema")?;
        let migration = migration.clone().with_endpoints(
            Some(Name::from(source_id.to_string())),
            Some(Name::from(target_id.to_string())),
        );
        let migration_id = repo
            .store_mut()
            .put(&Object::Migration {
                src: source_id,
                tgt: target_id,
                mapping: migration,
            })
            .context("store structural migration")?;
        Some(migration_id)
    } else {
        None
    };

    let mut index = repo.read_index().context("read staged schema index")?;
    index.staged = Some(StagedSchema {
        schema_id: root_id,
        migration_id,
        auto_derived: migration_id.is_some(),
        validation: ValidationStatus::Pending,
        gat_diagnostics: None,
    });
    repo.write_index(&index).context("write staged index")?;
    Ok(())
}

fn record_documents(root: &Path) -> Result<Vec<(PathBuf, serde_json::Value)>> {
    let mut documents = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(&dir).with_context(|| format!("read dir {}", dir.display()))? {
            let path = entry?.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let content = fs::read_to_string(&path).with_context(|| format!("read {}", path.display()))?;
            let document: serde_json::Value =
                serde_json::from_str(&content).with_context(|| format!("parse {}", path.display()))?;
            let main_type = document
                .get("defs")
                .and_then(|defs| defs.get("main"))
                .and_then(|main| main.get("type"))
                .and_then(serde_json::Value::as_str);
            if matches!(main_type, Some("permission-set" | "query")) {
                continue;
            }
            let relative = path
                .strip_prefix(root)
                .with_context(|| format!("strip lexicon prefix from {}", path.display()))?
                .to_path_buf();
            documents.push((relative, document));
        }
    }
    documents.sort_by(|a, b| a.0.cmp(&b.0));
    if documents.is_empty() {
        bail!("no record or shared-def lexicons found at {}", root.display());
    }
    Ok(documents)
}

fn short_id(id: &str) -> &str {
    id.get(..12).unwrap_or(id)
}
