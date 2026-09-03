//! Typecheck a lens file: load it as a Migration and compile it against the
//! v0.8.0 (source) and v0.9.0 (target) bundled schemas.

use std::fs;

use anyhow::{Context, Result};
use panproto_mig::Migration;
use panproto_schema::Schema;

fn load_schema(path: &str) -> Result<Schema> {
    serde_json::from_str(&fs::read_to_string(path).with_context(|| format!("read {path}"))?)
        .with_context(|| format!("parse {path}"))
}

fn main() -> Result<()> {
    let base = "/Users/awhite48/Projects/layers-pub/layers-0.9.0/lexicons";
    let v8 = load_schema(&format!("{base}/.schemas/v0.8.0.json"))?;
    let v9 = load_schema(&format!("{base}/.schemas/v0.9.0.json"))?;
    let lens_path = format!("{base}/lenses/v0.8.0-to-v0.9.0.json");
    let mig: Migration = serde_json::from_str(
        &fs::read_to_string(&lens_path).with_context(|| format!("read {lens_path}"))?,
    )
    .with_context(|| format!("parse {lens_path}"))?;

    let digest = "pub.layers.defs#annotationMetadata.digest";
    let value = "pub.layers.defs#contentDigest.value";
    println!(
        "vertex_map entries: {}, edge_map entries: {}",
        mig.vertex_map.len(),
        mig.edge_map.len()
    );
    println!(
        "hand break present (digest -> contentDigest.value): {}",
        mig.vertex_map
            .get(&panproto_gat::Name::from(digest))
            .map(std::string::ToString::to_string)
            .as_deref()
            == Some(value)
    );

    match panproto_mig::compile(&v8, &v9, &mig) {
        Ok(compiled) => {
            println!(
                "compile (typecheck) OK: surviving_verts={}, surviving_edges={}, vertex_remap={}",
                compiled.surviving_verts.len(),
                compiled.surviving_edges.len(),
                compiled.vertex_remap.len()
            );
            Ok(())
        }
        Err(e) => anyhow::bail!("compile FAILED: {e}"),
    }
}
