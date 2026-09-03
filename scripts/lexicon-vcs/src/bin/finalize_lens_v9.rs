//! Emit the final v0.8.0 -> v0.9.0 lens: the auto-derived structural
//! migration (identity on all surviving/additive structure) plus the one
//! hand-authored clean-break entry that nests the old flat
//! `annotationMetadata.digest` string into the new `contentDigest.value`
//! field. Serialized exactly like the seven existing adjacent lenses.

use std::fs;

use anyhow::{Context, Result};
use layers_lexicon_vcs::structural_migration;
use panproto_gat::Name;
use panproto_schema::Schema;

fn load_schema(path: &str) -> Result<Schema> {
    serde_json::from_str(&fs::read_to_string(path).with_context(|| format!("read {path}"))?)
        .with_context(|| format!("parse {path}"))
}

fn main() -> Result<()> {
    let base = "/Users/awhite48/Projects/layers-pub/layers-0.9.0/lexicons";
    let v8 = load_schema(&format!("{base}/.schemas/v0.8.0.json"))?;
    let v9 = load_schema(&format!("{base}/.schemas/v0.9.0.json"))?;

    // Auto-derived additive coverage: identity on every surviving vertex/edge.
    let mut migration = structural_migration(&v8, &v9);

    // Hand-authored clean break (NOT auto-derived): the removed flat digest
    // string maps to the structured contentDigest object's value field.
    let digest = Name::from("pub.layers.defs#annotationMetadata.digest");
    let value = Name::from("pub.layers.defs#contentDigest.value");
    assert!(v8.vertices.contains_key(&digest), "digest missing in v0.8.0");
    assert!(v9.vertices.contains_key(&value), "value missing in v0.9.0");
    migration.vertex_map.insert(digest, value);

    // Typecheck: the augmented migration must be a valid theory morphism.
    let compiled = panproto_mig::compile(&v8, &v9, &migration)
        .context("compile augmented v0.8.0 -> v0.9.0 lens")?;
    println!(
        "typecheck OK: vertex_map={}, edge_map={}, surviving_verts={}, surviving_edges={}",
        migration.vertex_map.len(),
        migration.edge_map.len(),
        compiled.surviving_verts.len(),
        compiled.surviving_edges.len()
    );

    let path = format!("{base}/lenses/v0.8.0-to-v0.9.0.json");
    fs::write(
        &path,
        serde_json::to_string_pretty(&migration).context("serialize lens")?,
    )
    .with_context(|| format!("write {path}"))?;
    println!("wrote {path}");
    Ok(())
}
