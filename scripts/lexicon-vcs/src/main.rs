//! Build the historical Panproto VCS for the Layers record lexicons.

use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result, bail};
use layers_lexicon_vcs::structural_migration;
use panproto_gat::Name;
use panproto_project::build_project_tree;
use panproto_protocols::{parse_schema_bundle, parse_schema_bundle_project};
use panproto_schema::Schema;
use panproto_vcs::Object;
use panproto_vcs::index::{StagedSchema, ValidationStatus};
use panproto_vcs::{
    CommitOptions, Repository, Store, assemble_schema, project_coproduct_protocol, refs, store,
};

const VERSIONS: [&str; 10] = [
    "v0.1.0", "v0.2.0", "v0.3.0", "v0.4.0", "v0.5.0", "v0.6.0", "v0.7.0", "v0.8.0",
    "v0.9.0", "v0.10.0",
];
const LEXICON_ROOT: &str = "lexicons/pub/layers";
const AUTHOR: &str = "layers-lexicon-vcs";

fn main() -> Result<()> {
    let mut args = env::args_os();
    let Some(executable) = args.next() else {
        bail!("could not read the executable name");
    };
    let source = args.next().map(PathBuf::from).with_context(|| {
        format!(
            "usage: {} <layers-git-worktree> <output-directory>",
            Path::new(&executable).display()
        )
    })?;
    let output = args.next().map(PathBuf::from).with_context(|| {
        format!(
            "usage: {} <layers-git-worktree> <output-directory>",
            Path::new(&executable).display()
        )
    })?;
    if args.next().is_some() {
        bail!(
            "usage: {} <layers-git-worktree> <output-directory>",
            Path::new(&executable).display()
        );
    }
    build_history(&source, &output)
}

fn build_history(source: &Path, output: &Path) -> Result<()> {
    if output.join(".panproto").exists() {
        bail!(
            "refusing to replace existing Panproto repository at {}",
            output.join(".panproto").display()
        );
    }

    fs::create_dir_all(output)
        .with_context(|| format!("create output directory {}", output.display()))?;
    let schemas_dir = output.join(".schemas");
    fs::create_dir_all(&schemas_dir)
        .with_context(|| format!("create schema directory {}", schemas_dir.display()))?;
    let lenses_dir = output.join("lenses");
    fs::create_dir_all(&lenses_dir)
        .with_context(|| format!("create lens directory {}", lenses_dir.display()))?;

    let mut repo = Repository::init(output)
        .with_context(|| format!("initialize Panproto repository at {}", output.display()))?;
    let mut previous_version: Option<&str> = None;
    let mut previous_bundle: Option<Schema> = None;

    for version in VERSIONS {
        let documents = record_documents(source, version)?;
        let bundle_documents: Vec<serde_json::Value> = documents
            .iter()
            .map(|(_, document)| document.clone())
            .collect();
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
        if let (Some(previous), Some(previous_schema)) =
            (previous_version, previous_bundle.as_ref())
        {
            let migration = structural_migration(previous_schema, &bundle);
            let lens_path = lenses_dir.join(format!("{previous}-to-{version}.json"));
            let serialized =
                serde_json::to_string_pretty(&migration).context("serialize adjacent lens")?;
            fs::write(&lens_path, serialized)
                .with_context(|| format!("write {}", lens_path.display()))?;
        }

        let message = format!("Release lexicon schemas {}", &version[1..]);
        let commit_id = repo
            .commit_with_options(&message, AUTHOR, &CommitOptions { skip_verify: true })
            .with_context(|| format!("commit {version} schema"))?;
        refs::create_tag(repo.store_mut(), version, commit_id)
            .with_context(|| format!("tag {version} schema"))?;

        let schema_path = schemas_dir.join(format!("{version}.json"));
        let serialized =
            serde_json::to_string_pretty(&bundle).context("serialize bundled schema")?;
        fs::write(&schema_path, serialized)
            .with_context(|| format!("write {}", schema_path.display()))?;

        println!(
            "{version}: {file_count} files, {} vertices, {} edges, commit {}",
            schema.vertex_count(),
            schema.edge_count(),
            short_id(&commit_id.to_string())
        );
        previous_version = Some(version);
        previous_bundle = Some(bundle);
    }

    let commits = repo.log(None).context("read completed VCS history")?;
    let tags = refs::list_tags(repo.store()).context("read completed VCS tags")?;
    if commits.len() != VERSIONS.len() || tags.len() != VERSIONS.len() {
        bail!(
            "incomplete history: expected {} commits and tags, found {} commits and {} tags",
            VERSIONS.len(),
            commits.len(),
            tags.len()
        );
    }
    println!(
        "verified {} commits and {} tags in {}",
        commits.len(),
        tags.len(),
        output.join(".panproto").display()
    );
    Ok(())
}

fn stage_tree(
    repo: &mut Repository,
    root_id: panproto_vcs::ObjectId,
    schema: &Schema,
) -> Result<()> {
    let head_id = store::resolve_head(repo.store()).context("resolve Panproto HEAD")?;
    let source = if let Some(head_id) = head_id {
        let Object::Commit(head) = repo
            .store()
            .get(&head_id)
            .context("load Panproto HEAD commit")?
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
    repo.write_index(&index)
        .context("write per-file schema root to staged index")?;
    Ok(())
}

fn record_documents(source: &Path, version: &str) -> Result<Vec<(PathBuf, serde_json::Value)>> {
    let listing = git_output(
        source,
        &["ls-tree", "-r", "--name-only", version, "--", LEXICON_ROOT],
    )?;
    let mut documents = Vec::new();

    for path in listing.lines().filter(|path| path.ends_with(".json")) {
        let content = git_output(source, &["show", &format!("{version}:{path}")])?;
        let document: serde_json::Value =
            serde_json::from_str(&content).with_context(|| format!("parse {version}:{path}"))?;
        let main_type = document
            .get("defs")
            .and_then(|defs| defs.get("main"))
            .and_then(|main| main.get("type"))
            .and_then(serde_json::Value::as_str);
        if matches!(main_type, Some("permission-set" | "query")) {
            continue;
        }
        let relative = Path::new(path)
            .strip_prefix(LEXICON_ROOT)
            .with_context(|| format!("strip lexicon prefix from {path}"))?
            .to_path_buf();
        documents.push((relative, document));
    }

    if documents.is_empty() {
        bail!("no record or shared-def lexicons found at {version}");
    }
    Ok(documents)
}

fn git_output(source: &Path, args: &[&str]) -> Result<String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(source)
        .args(args)
        .output()
        .with_context(|| format!("run git in {}", source.display()))?;
    if !output.status.success() {
        bail!(
            "git {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&output.stderr).trim()
        );
    }
    String::from_utf8(output.stdout).context("git output was not UTF-8")
}

fn short_id(id: &str) -> &str {
    id.get(..12).unwrap_or(id)
}
