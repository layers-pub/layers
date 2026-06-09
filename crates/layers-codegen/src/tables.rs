//! Canonical record-kind -> storage mapping.
//!
//! This is the single source of truth for which Postgres table each
//! `pub.layers.*` record kind lands in. Two consumers read from it, so
//! they can never drift:
//!
//! - the runtime sink, via the generated `crates/layers-records/src/tables.rs`
//!   (keyed by record NSID), emitted by [`cmd_tables`];
//! - the orchestrator route generator (`cmd_routes`), keyed by the
//!   `queries.json` `entity` slug, via [`table_for_entity`].
//!
//! Table names are not derivable from the lexicons alone (irregular
//! plurals like `corpora`, namespace prefixes like `resource_*`), so the
//! mapping is curated here once. [`cmd_tables`] validates that the set of
//! record lexicons on disk matches this table exactly, so adding a record
//! lexicon without a table entry (or vice versa) fails codegen.

use std::fmt::Write as _;
use std::path::Path;
use std::process::ExitCode;

use anyhow::{Context, Result, bail};
use serde_json::Value;

/// One record kind's storage identity.
pub struct RecordTable {
    /// Record lexicon NSID, e.g. `pub.layers.corpus.corpus`. Empty for
    /// synthetic kinds that have no `pub.layers` record lexicon (the
    /// foreign `external_records` table populated by the integration
    /// import path).
    pub nsid: &'static str,
    /// `queries.json` `entity` slug, e.g. `corpus_membership`.
    pub entity: &'static str,
    /// Postgres table name.
    pub table: &'static str,
}

/// Every record kind's `(nsid, entity, table)`. The one place a new
/// record kind's table name is declared.
pub const RECORD_TABLES: &[RecordTable] = &[
    rt("pub.layers.alignment.alignment", "alignment", "alignments"),
    rt(
        "pub.layers.annotation.annotationLayer",
        "annotation_layer",
        "annotation_layers",
    ),
    rt(
        "pub.layers.annotation.clusterSet",
        "cluster_set",
        "cluster_sets",
    ),
    rt(
        "pub.layers.changelog.entry",
        "changelog_entry",
        "changelog_entries",
    ),
    rt("pub.layers.corpus.corpus", "corpus", "corpora"),
    rt(
        "pub.layers.corpus.membership",
        "corpus_membership",
        "corpus_memberships",
    ),
    rt("pub.layers.eprint.dataLink", "data_link", "data_links"),
    rt("pub.layers.eprint.eprint", "eprint", "eprints"),
    rt(
        "pub.layers.expression.expression",
        "expression",
        "expressions",
    ),
    rt("pub.layers.graph.graphEdge", "graph_edge", "graph_edges"),
    rt(
        "pub.layers.graph.graphEdgeSet",
        "graph_edge_set",
        "graph_edge_sets",
    ),
    rt("pub.layers.graph.graphNode", "graph_node", "graph_nodes"),
    rt(
        "pub.layers.judgment.agreementReport",
        "agreement_report",
        "agreement_reports",
    ),
    rt(
        "pub.layers.judgment.experimentDef",
        "experiment_def",
        "experiment_defs",
    ),
    rt(
        "pub.layers.judgment.judgmentSet",
        "judgment_set",
        "judgment_sets",
    ),
    rt("pub.layers.media.media", "media", "media_records"),
    rt("pub.layers.ontology.ontology", "ontology", "ontologies"),
    rt("pub.layers.ontology.typeDef", "type_def", "type_defs"),
    rt("pub.layers.persona.persona", "persona", "personas"),
    rt(
        "pub.layers.resource.collection",
        "collection",
        "resource_collections",
    ),
    rt(
        "pub.layers.resource.collectionMembership",
        "collection_membership",
        "resource_collection_memberships",
    ),
    rt("pub.layers.resource.entry", "entry", "resource_entries"),
    rt(
        "pub.layers.resource.filling",
        "filling",
        "resource_fillings",
    ),
    rt(
        "pub.layers.resource.template",
        "template",
        "resource_templates",
    ),
    rt(
        "pub.layers.resource.templateComposition",
        "template_composition",
        "resource_template_compositions",
    ),
    rt(
        "pub.layers.segmentation.segmentation",
        "segmentation",
        "segmentations",
    ),
    // Synthetic: foreign records indexed for cross-app interop have no
    // pub.layers record lexicon, so they are excluded from the generated
    // runtime map but still resolvable by the route generator.
    rt("", "external_record", "external_records"),
];

const fn rt(nsid: &'static str, entity: &'static str, table: &'static str) -> RecordTable {
    RecordTable {
        nsid,
        entity,
        table,
    }
}

/// Postgres table for a `queries.json` entity slug.
#[must_use]
pub fn table_for_entity(entity: &str) -> Option<&'static str> {
    RECORD_TABLES
        .iter()
        .find(|r| r.entity == entity)
        .map(|r| r.table)
}

/// Emit (or, when `check_only`, verify) the two generated artifacts that
/// derive from [`RECORD_TABLES`] — the runtime NSID->table map
/// (`crates/layers-records/src/tables.rs`) and the record-table DDL
/// (`migrations/0002_record_tables.sql`) — after validating that the
/// record lexicons on disk match the table exactly.
///
/// # Errors
/// Returns an error if the lexicon set and [`RECORD_TABLES`] disagree, or
/// if either file cannot be read or written.
pub fn cmd_tables(
    lexicons_dir: &Path,
    rust_out: &Path,
    sql_out: &Path,
    check_only: bool,
) -> Result<ExitCode> {
    let record_nsids = record_lexicon_nsids(lexicons_dir)?;

    // Every record lexicon must have a table entry.
    for nsid in &record_nsids {
        if !RECORD_TABLES.iter().any(|r| r.nsid == nsid) {
            bail!(
                "record lexicon `{nsid}` has no table mapping; add it to \
                 crates/layers-codegen/src/tables.rs"
            );
        }
    }
    // Every non-synthetic table entry must correspond to a record lexicon.
    for r in RECORD_TABLES.iter().filter(|r| !r.nsid.is_empty()) {
        if !record_nsids.iter().any(|n| n == r.nsid) {
            bail!(
                "table mapping references record lexicon `{}` that does not \
                 exist on disk; remove it from crates/layers-codegen/src/tables.rs",
                r.nsid
            );
        }
    }

    emit_artifact(rust_out, &render_tables_rs(), check_only)?;
    emit_artifact(sql_out, &render_record_tables_sql(), check_only)?;
    if check_only {
        println!("tables up-to-date: {} record tables", record_nsids.len());
    }
    Ok(ExitCode::SUCCESS)
}

/// Write `rendered` to `out`, or (in check mode) bail if it differs.
fn emit_artifact(out: &Path, rendered: &str, check_only: bool) -> Result<()> {
    if check_only {
        let actual = std::fs::read_to_string(out).unwrap_or_default();
        if actual != *rendered {
            bail!(
                "drift detected in {}; run `cargo run -p layers-codegen -- generate` to update",
                out.display()
            );
        }
    } else {
        std::fs::write(out, rendered).with_context(|| format!("writing {}", out.display()))?;
        println!("wrote {}", out.display());
    }
    Ok(())
}

/// Render the generated `tables.rs` source (NSID -> table map only).
fn render_tables_rs() -> String {
    let mut rows: Vec<&RecordTable> = RECORD_TABLES
        .iter()
        .filter(|r| !r.nsid.is_empty())
        .collect();
    rows.sort_by(|a, b| a.nsid.cmp(b.nsid));

    let mut body = String::from(
        "// @generated by layers-codegen. do not edit.\n\n\
         //! NSID -> Postgres table map for every `pub.layers.*` record kind.\n\
         //!\n\
         //! Generated from `crates/layers-codegen/src/tables.rs`, which is also\n\
         //! read by the orchestrator route generator, so the runtime sink and\n\
         //! the generated query handlers can never disagree on table names.\n\n\
         /// Every record kind's `(nsid, table)`, sorted by NSID.\n\
         pub const TABLES: &[(&str, &str)] = &[\n",
    );
    for r in &rows {
        let _ = writeln!(body, "    ({:?}, {:?}),", r.nsid, r.table);
    }
    body.push_str(
        "];\n\n\
         /// Postgres table for a record NSID, or `None` when the NSID is not a\n\
         /// known `pub.layers.*` record kind.\n\
         #[must_use]\n\
         pub fn table_for(nsid: &str) -> Option<&'static str> {\n\
         \x20\x20\x20\x20TABLES.iter().copied().find(|(n, _)| *n == nsid).map(|(_, t)| t)\n\
         }\n",
    );
    idiolect_codegen::rustfmt_source(&body)
}

/// Render the generated `0002_record_tables.sql` migration: one uniform
/// JSONB table per record kind, sorted by table name. The shape is
/// `(uri PK, did, rkey, cid, indexed_at, record JSONB)` plus a `did`
/// index and a GIN index on `record`; filter predicates read JSONB via
/// `record->>'key'`, so a new filter never needs a migration.
fn render_record_tables_sql() -> String {
    let mut tables: Vec<&str> = RECORD_TABLES
        .iter()
        .filter(|r| !r.nsid.is_empty())
        .map(|r| r.table)
        .collect();
    tables.sort_unstable();

    let mut out = String::from(
        "-- @generated by layers-codegen. do not edit.\n\
         --\n\
         -- Per-record-type tables for every pub.layers.* record kind, derived\n\
         -- from crates/layers-codegen/src/tables.rs. Every table has the same\n\
         -- shape: an at-uri primary key, the record's did/rkey for cheap\n\
         -- filters, an indexed_at timestamp, and the full record body as JSONB.\n\
         -- Filter predicates declared in orchestrator-spec/queries.json read\n\
         -- from JSONB via record->>'key', so adding a filter never requires a\n\
         -- migration. The indexer's PostgresRecordSink applies this file via\n\
         -- ensure_tables() on startup.\n",
    );
    for table in tables {
        let _ = write!(
            out,
            "\nCREATE TABLE IF NOT EXISTS {table} (\n\
             \x20\x20\x20\x20uri TEXT PRIMARY KEY, did TEXT NOT NULL, rkey TEXT NOT NULL,\n\
             \x20\x20\x20\x20cid TEXT,\n\
             \x20\x20\x20\x20indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), record JSONB NOT NULL\n\
             );\n\
             CREATE INDEX IF NOT EXISTS idx_{table}_did ON {table} (did);\n\
             CREATE INDEX IF NOT EXISTS idx_{table}_record ON {table} USING GIN (record);\n"
        );
    }
    out
}

/// Collect the NSIDs of every record-kind lexicon under `dir`.
fn record_lexicon_nsids(dir: &Path) -> Result<Vec<String>> {
    let mut paths = Vec::new();
    crate::collect_json(dir, &mut paths)?;
    let mut nsids = Vec::new();
    for path in paths {
        let raw = std::fs::read_to_string(&path)
            .with_context(|| format!("reading {}", path.display()))?;
        let v: Value = serde_json::from_str(&raw)
            .with_context(|| format!("parsing {} as json", path.display()))?;
        let is_record = v
            .get("defs")
            .and_then(|d| d.get("main"))
            .and_then(|m| m.get("type"))
            .and_then(Value::as_str)
            == Some("record");
        if is_record && let Some(id) = v.get("id").and_then(Value::as_str) {
            nsids.push(id.to_owned());
        }
    }
    nsids.sort();
    Ok(nsids)
}
