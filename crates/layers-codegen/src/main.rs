//! Driver that reuses `idiolect-codegen` as a library to emit Rust and
//! TypeScript bindings for the `pub.layers.*` record types.
//!
//! Why this exists: the upstream `idiolect-codegen` binary walks
//! `lexicons/dev/<family>/` by convention. Layers' NSIDs live under
//! `layers/lexicons/pub/layers/` so we cannot point the stock CLI at our
//! tree. This binary consumes the emit modules directly and writes to:
//!
//! - `crates/layers-records/src/generated/` (Rust record types)
//! - `packages/schema/src/generated/`       (TypeScript types + validators)
//!
//! Subcommands:
//!
//! - `generate` — emit both trees.
//! - `check`    — drift gate; non-zero exit if disk differs from expected output.
//! - `list`     — print NSID + record kind for every `pub.layers.*` lexicon.

use std::env;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use anyhow::{Context, Result, anyhow, bail};
use idiolect_codegen::emit::family::FamilyConfig;
use idiolect_codegen::{Example, emit, lexicon, rustfmt_source};
use serde_json::Value;

mod frontend;
mod lenses;
mod lexicon_jsonschema;
mod seed;

fn to_camel(snake: &str) -> String {
    let mut out = String::with_capacity(snake.len());
    let mut up = true;
    for c in snake.chars() {
        if c == '_' {
            up = true;
        } else if up {
            out.extend(c.to_uppercase());
            up = false;
        } else {
            out.push(c);
        }
    }
    out
}

fn layers_family() -> FamilyConfig {
    FamilyConfig::new("LayersFamily", "pub.layers", "pub.layers.")
}

fn main() -> ExitCode {
    match run() {
        Ok(code) => code,
        Err(err) => {
            eprintln!("layers-codegen: {err:#}");
            ExitCode::from(1)
        }
    }
}

fn run() -> Result<ExitCode> {
    let args: Vec<String> = env::args().skip(1).collect();
    let sub = args.first().map(String::as_str).unwrap_or("help");

    let repo_root = resolve_repo_root()?;
    let lexicons_dir = repo_root.join("lexicons/pub/layers");
    let rust_out = repo_root.join("crates/layers-records/src/generated");
    let ts_out = repo_root.join("packages/schema/src/generated");

    let routes_spec = repo_root.join("orchestrator-spec/queries.json");
    let routes_out = repo_root
        .join("crates/layers-orchestrator/src/generated_routes.rs");
    let openapi_out = repo_root.join("web/lib/api/openapi.json");

    match sub {
        "generate" => {
            cmd_generate(&lexicons_dir, &rust_out, &ts_out, false)?;
            cmd_routes(&routes_spec, &routes_out, false)?;
            cmd_openapi(&routes_spec, &openapi_out, false)?;
            frontend::cmd_frontend(&repo_root, false)
        }
        "check" => {
            cmd_generate(&lexicons_dir, &rust_out, &ts_out, true)?;
            cmd_routes(&routes_spec, &routes_out, true)?;
            cmd_openapi(&routes_spec, &openapi_out, true)?;
            // Frontend codegen drift checks (queries hooks + lens
            // registry) reuse the same byte-equality gate. The
            // openapi-typescript step is in-place; CI catches drift
            // via `git diff --exit-code`.
            let mut drift = false;
            drift |= frontend::queries::emit(&repo_root, true)?;
            drift |= frontend::lenses::emit(&repo_root, true)?;
            drift |= frontend::forms::emit(&repo_root, true)?;
            drift |= frontend::mutations::emit(&repo_root, true)?;
            if drift {
                Ok(ExitCode::from(1))
            } else {
                Ok(ExitCode::SUCCESS)
            }
        }
        "routes" => cmd_routes(&routes_spec, &routes_out, false),
        "openapi" => cmd_openapi(&routes_spec, &openapi_out, false),
        "frontend" => frontend::cmd_frontend(&repo_root, false),
        "lenses" => lenses::cmd_lenses(&repo_root, false),
        "seed" => seed::run(&repo_root, &args[1..]),
        "list" => {
            list_lexicons(&lexicons_dir)?;
            Ok(ExitCode::SUCCESS)
        }
        "help" | "--help" | "-h" => {
            print_help();
            Ok(ExitCode::SUCCESS)
        }
        other => {
            eprintln!("unknown subcommand: {other}");
            print_help();
            Ok(ExitCode::from(2))
        }
    }
}

fn cmd_openapi(spec: &Path, out: &Path, check_only: bool) -> Result<ExitCode> {
    let raw = std::fs::read_to_string(spec)
        .with_context(|| format!("reading {}", spec.display()))?;
    let spec_v: Value = serde_json::from_str(&raw)
        .with_context(|| format!("parsing {} as json", spec.display()))?;
    let queries = spec_v
        .get("queries")
        .and_then(Value::as_array)
        .ok_or_else(|| anyhow!("queries.json: missing top-level `queries` array"))?;

    let lexicons_dir = resolve_repo_root()?.join("lexicons/pub/layers");
    let lexicon_components = lexicon_jsonschema::build_components(&lexicons_dir)
        .context("converting lexicons to JSON Schema components")?;

    let mut paths = serde_json::Map::new();
    for q in queries {
        let lxm = q
            .get("lxm")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("query missing `lxm`"))?;
        let predicate = q.get("predicate").and_then(Value::as_str).unwrap_or("");
        let params = q
            .get("params")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let is_get = predicate.ends_with("_by_uri");
        // Match the emitter's naming: `<Ns><VerbResource>Output`
        // (no def-id segment between the path and the suffix).
        let prefix = lexicon_jsonschema::component_name(lxm, "");
        let output_component = format!("{prefix}Output");
        let record_view_component = format!("{prefix}RecordView");
        let has_typed_output = lexicon_components.contains_key(&output_component);
        let has_record_view = lexicon_components.contains_key(&record_view_component);
        let response_schema = if has_typed_output {
            serde_json::json!({
                "$ref": format!("#/components/schemas/{output_component}")
            })
        } else if is_get {
            serde_json::json!({ "$ref": "#/components/schemas/RecordView" })
        } else {
            serde_json::json!({ "$ref": "#/components/schemas/ListResponse" })
        };
        let _ = has_record_view; // record_view is referenced via output_component already
        let mut openapi_params: Vec<Value> = Vec::new();
        if is_get {
            openapi_params.push(serde_json::json!({
                "name": "uri",
                "in": "query",
                "required": true,
                "schema": { "type": "string" },
                "description": "AT-URI of the record to fetch.",
            }));
        } else {
            openapi_params.push(serde_json::json!({
                "name": "did",
                "in": "query",
                "required": false,
                "schema": { "type": "string" },
                "description": "Optional `did` filter applied to the record's owning repo.",
            }));
            for p in &params {
                let pname = p
                    .get("name")
                    .and_then(Value::as_str)
                    .unwrap_or("");
                if matches!(pname, "did" | "cursor" | "limit") {
                    continue;
                }
                let http_q = p
                    .get("http_query")
                    .and_then(Value::as_str)
                    .unwrap_or(pname);
                openapi_params.push(serde_json::json!({
                    "name": http_q,
                    "in": "query",
                    "required": false,
                    "schema": { "type": "string" },
                }));
            }
            openapi_params.push(serde_json::json!({
                "name": "cursor",
                "in": "query",
                "required": false,
                "schema": { "type": "string" },
                "description": "Opaque pagination cursor returned by a previous list call.",
            }));
            openapi_params.push(serde_json::json!({
                "name": "limit",
                "in": "query",
                "required": false,
                "schema": { "type": "integer", "minimum": 1, "maximum": 200, "default": 50 },
            }));
        }
        let path_item = serde_json::json!({
            "get": {
                "summary": lxm,
                "operationId": q.get("name").and_then(Value::as_str).unwrap_or(lxm),
                "tags": [q.get("entity").and_then(Value::as_str).unwrap_or("default")],
                "parameters": openapi_params,
                "responses": {
                    "200": {
                        "description": "OK",
                        "content": { "application/json": { "schema": response_schema } }
                    },
                    "400": { "$ref": "#/components/responses/Error" },
                    "401": { "$ref": "#/components/responses/Error" },
                    "403": { "$ref": "#/components/responses/Error" },
                    "404": { "$ref": "#/components/responses/Error" },
                    "429": { "$ref": "#/components/responses/Error" },
                    "500": { "$ref": "#/components/responses/Error" }
                }
            }
        });
        paths.insert(format!("/xrpc/{lxm}"), path_item);
    }

    let mut all_components = lexicon_components.clone();
    let baked_in_components = serde_json::json!({
        "RecordView": {
            "type": "object",
            "required": ["uri", "value"],
            "properties": {
                "uri":   { "type": "string", "description": "AT-URI of the record." },
                "cid":   { "type": "string", "description": "Content-addressed identifier." },
                "value": { "type": "object", "description": "Full record body." }
            }
        },
        "ListResponse": {
            "type": "object",
            "required": ["records"],
            "properties": {
                "records": {
                    "type": "array",
                    "items": { "$ref": "#/components/schemas/RecordView" }
                },
                "cursor": { "type": "string", "description": "Opaque cursor for the next page." }
            }
        },
        "ErrorBody": {
            "type": "object",
            "required": ["error", "message"],
            "properties": {
                "error":   { "type": "string", "description": "ATProto error code." },
                "message": { "type": "string", "description": "Human-readable message." }
            }
        }
    });
    if let Value::Object(map) = baked_in_components {
        for (k, v) in map {
            // Only insert the catch-all `RecordView`/`ListResponse`
            // when no lexicon-derived schema already claimed the name.
            all_components.entry(k).or_insert(v);
        }
    }

    // Hand-mounted integration routes (`getExternal`, `applyLens`)
    // live outside the spec-driven generated tree but the frontend
    // needs typed access. Register them in the OpenAPI doc so the
    // openapi-typescript step picks them up.
    paths.insert(
        "/xrpc/pub.layers.integration.getExternal".to_owned(),
        serde_json::json!({
            "get": {
                "summary": "pub.layers.integration.getExternal",
                "operationId": "getExternal",
                "tags": ["integration"],
                "parameters": [
                    {
                        "name": "uri",
                        "in": "query",
                        "required": true,
                        "schema": { "type": "string" },
                        "description": "AT-URI of the foreign record to fetch."
                    },
                    {
                        "name": "fresh",
                        "in": "query",
                        "required": false,
                        "schema": { "type": "boolean" },
                        "description": "Bypass the cached copy and refetch from the source PDS."
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "content": {
                            "application/json": {
                                "schema": { "$ref": "#/components/schemas/RecordView" }
                            }
                        }
                    },
                    "400": { "$ref": "#/components/responses/Error" },
                    "404": { "$ref": "#/components/responses/Error" },
                    "500": { "$ref": "#/components/responses/Error" }
                }
            }
        }),
    );
    paths.insert(
        "/xrpc/pub.layers.integration.applyLens".to_owned(),
        serde_json::json!({
            "get": {
                "summary": "pub.layers.integration.applyLens",
                "operationId": "applyLens",
                "tags": ["integration"],
                "parameters": [
                    {
                        "name": "uri",
                        "in": "query",
                        "required": true,
                        "schema": { "type": "string" },
                        "description": "AT-URI of the foreign record to lens into Layers shape."
                    },
                    {
                        "name": "fresh",
                        "in": "query",
                        "required": false,
                        "schema": { "type": "boolean" },
                        "description": "Bypass the cached source-record copy and refetch from the upstream PDS."
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Lens result envelope.",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["sourceUri", "targetNsid", "value"],
                                    "properties": {
                                        "sourceUri": { "type": "string" },
                                        "lensUri":   { "type": "string" },
                                        "targetNsid": { "type": "string" },
                                        "value":      { "type": "object" }
                                    }
                                }
                            }
                        }
                    },
                    "400": { "$ref": "#/components/responses/Error" },
                    "404": { "$ref": "#/components/responses/Error" },
                    "500": { "$ref": "#/components/responses/Error" }
                }
            }
        }),
    );

    let document = serde_json::json!({
        "openapi": "3.1.0",
        "info": {
            "title": "Layers AppView",
            "description": "Read-only XRPC catalogue for `pub.layers.*` records.",
            "version": "0.1.0"
        },
        "paths": paths,
        "components": {
            "schemas": all_components,
            "responses": {
                "Error": {
                    "description": "Error envelope.",
                    "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ErrorBody" } } }
                }
            }
        }
    });

    let formatted = format!("{}\n", serde_json::to_string_pretty(&document)?);

    if check_only {
        let actual = std::fs::read_to_string(out).unwrap_or_default();
        if actual == formatted {
            println!("openapi up-to-date: {} routes", queries.len());
            Ok(ExitCode::SUCCESS)
        } else {
            eprintln!("drift detected in {}", out.display());
            eprintln!("run `cargo run -p layers-codegen -- openapi` to update.");
            Ok(ExitCode::from(1))
        }
    } else {
        if let Some(parent) = out.parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("creating {}", parent.display()))?;
        }
        std::fs::write(out, &formatted)
            .with_context(|| format!("writing {}", out.display()))?;
        println!("wrote {} ({} routes)", out.display(), queries.len());
        Ok(ExitCode::SUCCESS)
    }
}

/// Map an XRPC method NSID to its Postgres table.
///
/// Strips the `get|list[ByCollection]` verb to recover the collection
/// kind, then maps that kind to the table name the indexer's
/// `PostgresRecordSink` writes to.
fn table_for_nsid(lxm: &str) -> &'static str {
    let leaf = lxm.rsplit('.').next().unwrap_or(lxm);
    let trimmed = strip_verb(leaf);
    match trimmed {
        "Expression" | "Expressions" => "expressions",
        "Corpus" | "Corpora" => "corpora",
        "Membership" | "Memberships" => "corpus_memberships",
        "Persona" | "Personas" => "personas",
        "Media" => "media_records",
        "Eprint" | "Eprints" => "eprints",
        "DataLink" | "DataLinks" => "data_links",
        "Ontology" | "Ontologies" => "ontologies",
        "TypeDef" | "TypeDefs" => "type_defs",
        "Segmentation" | "Segmentations" => "segmentations",
        "Alignment" | "Alignments" => "alignments",
        "AnnotationLayer" | "AnnotationLayers" => "annotation_layers",
        "ClusterSet" | "ClusterSets" => "cluster_sets",
        "GraphNode" | "GraphNodes" => "graph_nodes",
        "GraphEdge" | "GraphEdges" => "graph_edges",
        "GraphEdgeSet" | "GraphEdgeSets" => "graph_edge_sets",
        "ExperimentDef" | "ExperimentDefs" => "experiment_defs",
        "JudgmentSet" | "JudgmentSets" => "judgment_sets",
        "AgreementReport" | "AgreementReports" => "agreement_reports",
        "Collection" | "Collections" => "resource_collections",
        "CollectionMembership" | "CollectionMemberships" => "resource_collection_memberships",
        "Entry" | "Entries" | "ByCollection" => {
            if lxm.starts_with("pub.layers.changelog.") {
                "changelog_entries"
            } else {
                "resource_entries"
            }
        }
        "Filling" | "Fillings" => "resource_fillings",
        "Template" | "Templates" => "resource_templates",
        "TemplateComposition" | "TemplateCompositions" => "resource_template_compositions",
        "External" | "ExternalRecord" | "ExternalRecords" => "external_records",
        other => panic!("layers-codegen: unhandled NSID `{lxm}` (kind: `{other}`)"),
    }
}

fn strip_verb(s: &str) -> &str {
    for verb in ["list", "get", "search"] {
        if let Some(rest) = s.strip_prefix(verb) {
            return rest;
        }
    }
    s
}

fn cmd_routes(spec: &Path, out: &Path, check_only: bool) -> Result<ExitCode> {
    let raw = std::fs::read_to_string(spec)
        .with_context(|| format!("reading {}", spec.display()))?;
    let spec_v: Value = serde_json::from_str(&raw)
        .with_context(|| format!("parsing {} as json", spec.display()))?;
    let queries = spec_v
        .get("queries")
        .and_then(Value::as_array)
        .ok_or_else(|| anyhow!("queries.json: missing top-level `queries` array"))?;

    let mut body = String::from(
        "// @generated by layers-codegen. do not edit.\n\n\
         //! Generated handlers and route table for the orchestrator, derived\n\
         //! from `orchestrator-spec/queries.json`. Each query in the spec\n\
         //! emits one axum handler function plus one route mount.\n\n\
         #![allow(clippy::too_many_lines, clippy::needless_pass_by_value)]\n\n\
         use axum::Json;\n\
         use axum::Router;\n\
         use axum::extract::{Query, State};\n\
         use axum::middleware::from_fn_with_state;\n\
         use axum::routing::get;\n\
         use serde::Deserialize;\n\n\
         use crate::auth::{Tier, require};\n\
         use crate::error::Result;\n\
         use crate::queries::{\n\
         \x20\x20\x20\x20ByUri, Filter, ListParams, ListResponse, RecordView, clamp_limit, fetch_one, list_table_filtered,\n\
         };\n\
         use crate::state::AppState;\n\n",
    );

    let mut mounts = String::new();
    for q in queries {
        let lxm = q
            .get("lxm")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("query missing `lxm`"))?;
        let name = q
            .get("name")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("query missing `name`"))?;
        let predicate = q
            .get("predicate")
            .and_then(Value::as_str)
            .unwrap_or("");
        let params = q
            .get("params")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let table = table_for_nsid(lxm);

        let is_get = predicate.ends_with("_by_uri");
        if is_get {
            body.push_str(&format!(
                "/// `{lxm}` — fetch by AT-URI from `{table}`.\n\
                 pub async fn {name}(\n\
                 \x20\x20\x20\x20State(state): State<AppState>,\n\
                 \x20\x20\x20\x20Query(q): Query<ByUri>,\n\
                 ) -> Result<Json<RecordView>> {{\n\
                 \x20\x20\x20\x20Ok(Json(fetch_one(&state, \"{table}\", &q.uri).await?))\n\
                 }}\n\n"
            ));
        } else {
            // List path: the handler builds a custom params struct that
            // unions ListParams with whatever filter columns this query
            // declares (e.g. `corpus`, `target`, `mime_type`).
            let filter_params: Vec<&Value> = params
                .iter()
                .filter(|p| {
                    let n = p
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or_default();
                    !matches!(n, "did" | "cursor" | "limit")
                })
                .collect();

            let params_struct_name = format!("{}Params", to_camel(name));

            body.push_str(&format!(
                "/// Query parameters for `{lxm}`.\n\
                 #[derive(Debug, Default, Deserialize)]\n\
                 pub struct {params_struct_name} {{\n\
                 \x20\x20\x20\x20#[serde(default)] pub did: Option<String>,\n"
            ));
            for p in &filter_params {
                let pname = p.get("name").and_then(Value::as_str).unwrap();
                let http_q = p
                    .get("http_query")
                    .and_then(Value::as_str)
                    .unwrap_or(pname);
                body.push_str(&format!(
                    "    /// `{http_q}` filter.\n    #[serde(rename = \"{http_q}\", default)] pub {pname}: Option<String>,\n"
                ));
            }
            body.push_str(
                "    #[serde(default)] pub cursor: Option<String>,\n\
                 \x20\x20\x20\x20#[serde(default)] pub limit: Option<i64>,\n\
                 }\n\n",
            );

            body.push_str(&format!(
                "/// `{lxm}` — list rows from `{table}` with the spec's filters.\n\
                 pub async fn {name}(\n\
                 \x20\x20\x20\x20State(state): State<AppState>,\n\
                 \x20\x20\x20\x20Query(q): Query<{params_struct_name}>,\n\
                 ) -> Result<Json<ListResponse>> {{\n\
                 \x20\x20\x20\x20let limit = clamp_limit(q.limit);\n\
                 \x20\x20\x20\x20let filters = [\n\
                 \x20\x20\x20\x20\x20\x20\x20\x20Filter::opt(\"did\", q.did.as_deref()),\n"
            ));
            for p in &filter_params {
                let pname = p.get("name").and_then(Value::as_str).unwrap();
                let http_q = p
                    .get("http_query")
                    .and_then(Value::as_str)
                    .unwrap_or(pname);
                body.push_str(&format!(
                    "        Filter::opt(\"{http_q}\", q.{pname}.as_deref()),\n"
                ));
            }
            body.push_str(&format!(
                "    ];\n\
                 \x20\x20\x20\x20Ok(Json(\n\
                 \x20\x20\x20\x20\x20\x20\x20\x20list_table_filtered(&state, \"{table}\", &filters, q.cursor.as_deref(), limit).await?,\n\
                 \x20\x20\x20\x20))\n\
                 }}\n\n"
            ));
        }

        mounts.push_str(&format!(
            "        .route(\n\
             \x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\"/xrpc/{lxm}\",\n\
             \x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20get({name}).route_layer(from_fn_with_state(state.clone(), require(Tier::PublicRead, \"{lxm}\"))),\n\
             \x20\x20\x20\x20\x20\x20\x20\x20)\n"
        ));
    }
    body.push_str("/// Mount every XRPC route declared in `orchestrator-spec/queries.json`.\n");
    body.push_str("#[must_use]\n");
    body.push_str("pub fn xrpc_routes(state: AppState) -> Router<AppState> {\n");
    body.push_str("    Router::new()\n");
    body.push_str(&mounts);
    body.push_str("}\n");

    let formatted = idiolect_codegen::rustfmt_source(&body);
    if check_only {
        let actual = std::fs::read_to_string(out).unwrap_or_default();
        if actual == formatted {
            println!("routes up-to-date: {} entries", queries.len());
            Ok(ExitCode::SUCCESS)
        } else {
            eprintln!("drift detected in {}", out.display());
            eprintln!("run `cargo run -p layers-codegen -- routes` to update.");
            Ok(ExitCode::from(1))
        }
    } else {
        if let Some(parent) = out.parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("creating {}", parent.display()))?;
        }
        std::fs::write(out, &formatted)
            .with_context(|| format!("writing {}", out.display()))?;
        println!("wrote {} ({} routes)", out.display(), queries.len());
        Ok(ExitCode::SUCCESS)
    }
}

fn cmd_generate(
    lexicons_dir: &Path,
    rust_out: &Path,
    ts_out: &Path,
    check_only: bool,
) -> Result<ExitCode> {
    let docs = load_lexicons(lexicons_dir)?;
    if docs.is_empty() {
        bail!("no lexicons found under {}", lexicons_dir.display());
    }

    let examples: Vec<Example> = Vec::new();
    let family = layers_family();

    let rust_files: Vec<(PathBuf, String)> = emit::emit_rust(&docs, &examples, &family)
        .context("emitting rust bindings")?
        .into_iter()
        .map(|f| (rust_out.join(&f.path), rustfmt_source(&f.contents)))
        .collect();
    let ts_files: Vec<(PathBuf, String)> = emit::emit_typescript(&docs, &examples, &family)
        .context("emitting typescript bindings")?
        .into_iter()
        .map(|f| (ts_out.join(&f.path), f.contents))
        .collect();

    if check_only {
        let mut drift = Vec::new();
        for (path, expected) in rust_files.iter().chain(ts_files.iter()) {
            match std::fs::read_to_string(path) {
                Ok(actual) if actual == *expected => {}
                Ok(_) => drift.push(path.clone()),
                Err(_) => drift.push(path.clone()),
            }
        }
        if drift.is_empty() {
            println!("codegen up-to-date: {} rust + {} ts files", rust_files.len(), ts_files.len());
            Ok(ExitCode::SUCCESS)
        } else {
            eprintln!("drift detected in {} file(s):", drift.len());
            for p in &drift {
                eprintln!("  {}", p.display());
            }
            eprintln!("run `cargo run -p layers-codegen -- generate` to update.");
            Ok(ExitCode::from(1))
        }
    } else {
        for (path, contents) in rust_files.iter().chain(ts_files.iter()) {
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent)
                    .with_context(|| format!("creating {}", parent.display()))?;
            }
            std::fs::write(path, contents)
                .with_context(|| format!("writing {}", path.display()))?;
        }
        println!(
            "wrote {} rust + {} ts files",
            rust_files.len(),
            ts_files.len()
        );
        Ok(ExitCode::SUCCESS)
    }
}

fn load_lexicons(dir: &Path) -> Result<Vec<lexicon::LexiconDoc>> {
    let mut paths = Vec::new();
    collect_json(dir, &mut paths)?;
    paths.sort();

    let mut docs = Vec::with_capacity(paths.len());
    for path in paths {
        let raw = std::fs::read_to_string(&path)
            .with_context(|| format!("reading {}", path.display()))?;
        let v: Value = serde_json::from_str(&raw)
            .with_context(|| format!("parsing {} as json", path.display()))?;
        match lexicon::parse(&v) {
            Ok(doc) => docs.push(doc),
            Err(err) => {
                // skip files the parser can't model (e.g. defs-only, permission-sets);
                // they have no record-view to emit. record the skip on stderr.
                eprintln!("skip {}: {err:#}", path.display());
            }
        }
    }
    Ok(docs)
}

fn collect_json(dir: &Path, out: &mut Vec<PathBuf>) -> Result<()> {
    for entry in std::fs::read_dir(dir)
        .with_context(|| format!("reading dir {}", dir.display()))?
    {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_json(&path, out)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("json") {
            out.push(path);
        }
    }
    Ok(())
}

fn resolve_repo_root() -> Result<PathBuf> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
        .parent()
        .and_then(Path::parent)
        .map(PathBuf::from)
        .ok_or_else(|| anyhow!("failed to resolve layers workspace root"))
}

fn list_lexicons(dir: &Path) -> Result<()> {
    let mut paths = Vec::new();
    collect_json(dir, &mut paths)?;
    let mut nsids = Vec::new();
    for path in paths {
        let raw = std::fs::read_to_string(&path)?;
        if let Ok(v) = serde_json::from_str::<Value>(&raw) {
            if let Some(id) = v.get("id").and_then(|i| i.as_str()) {
                nsids.push(id.to_owned());
            }
        }
    }
    nsids.sort();
    for nsid in nsids {
        println!("{nsid}");
    }
    Ok(())
}

fn print_help() {
    eprintln!(
        "layers-codegen — emit Rust + TypeScript bindings for pub.layers.* lexicons\n\n\
         USAGE:\n    layers-codegen <SUBCOMMAND>\n\n\
         SUBCOMMANDS:\n    generate    Emit every codegen artefact (records + schema + routes + openapi + frontend)\n    check       Drift gate (non-zero exit if disk differs)\n    routes      Emit just the orchestrator route table\n    openapi     Emit just web/lib/api/openapi.json\n    frontend    Emit web/lib/api/generated/queries/, web/lib/lenses/generated/, and refresh schema.generated.ts\n    lenses      Compile lens DSL specs into dev.panproto.schema.lens record bodies\n    seed        Manage canonical-content seeds for the registry PDS (`seed help` for subcommands)\n    list        Print every pub.layers.* NSID found on disk\n    help        Show this message\n"
    );
}
