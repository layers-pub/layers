//! Exploratory harness: test how the v0.8.0 -> v0.9.0 migration handles the
//! digest -> contentDigest clean break, and run the round-trip laws.

use std::fs;
use std::path::Path;

use anyhow::{Context, Result};
use layers_lexicon_vcs::structural_migration;
use panproto_gat::Name;
use panproto_inst::{parse_json, to_json, validate_wtype};
use panproto_lens::{Lens, check_get_put, check_put_get};
use panproto_mig::Migration;
use panproto_schema::Schema;
use serde::Deserialize;

const DIGEST_SRC: &str = "pub.layers.defs#annotationMetadata.digest";
const VALUE_TGT: &str = "pub.layers.defs#contentDigest.value";

#[derive(Deserialize)]
struct Sample {
    collection: String,
    record: serde_json::Value,
}

fn load(path: &str) -> Result<Schema> {
    serde_json::from_str(&fs::read_to_string(path).with_context(|| format!("read {path}"))?)
        .with_context(|| format!("parse {path}"))
}

fn try_compile(label: &str, src: &Schema, tgt: &Schema, mig: &Migration) -> Option<Lens> {
    match panproto_mig::compile(src, tgt, mig) {
        Ok(compiled) => {
            println!("[compile] {label}: OK");
            Some(Lens {
                compiled,
                src_schema: src.clone(),
                tgt_schema: tgt.clone(),
            })
        }
        Err(e) => {
            println!("[compile] {label}: ERROR: {e}");
            None
        }
    }
}

fn main() -> Result<()> {
    let base = "/Users/awhite48/Projects/layers-pub/layers-0.9.0/lexicons";
    let v8 = load(&format!("{base}/.schemas/v0.8.0.json"))?;
    let v9 = load(&format!("{base}/.schemas/v0.9.0.json"))?;

    println!("digest vertex in v8: {}", v8.vertices.contains_key(DIGEST_SRC));
    println!("value vertex in v9:  {}", v9.vertices.contains_key(VALUE_TGT));

    // Variant BASE: pure structural migration.
    let base_mig = structural_migration(&v8, &v9);
    let _ = try_compile("BASE structural", &v8, &v9, &base_mig);

    // Variant A: base + vertex_map[digest -> contentDigest.value].
    let mut a = base_mig.clone();
    a.vertex_map
        .insert(Name::from(DIGEST_SRC), Name::from(VALUE_TGT));
    let lens_a = try_compile("A: +vertex_map digest->value", &v8, &v9, &a);

    // Digest round-trip test on a synthetic v8 record carrying metadata.digest.
    let v8_record = serde_json::json!({
        "$type": "pub.layers.expression.expression",
        "id": "00000000-0000-0000-0000-000000000000",
        "kind": "sentence",
        "createdAt": "1970-01-01T00:00:00+00:00",
        "text": "Someone abhorred.",
        "metadata": { "tool": "explore", "digest": "deadbeefcafe" }
    });
    let root = "pub.layers.expression.expression";
    let inst8 = parse_json(&v8, root, &v8_record).context("parse synthetic v8 record")?;
    let v8_errs = validate_wtype(&v8, &inst8);
    println!("synthetic v8 record validates at v8: {}", v8_errs.is_empty());

    if let Some(lens) = &lens_a {
        match panproto_lens::get(lens, &inst8) {
            Ok((view, comp)) => {
                let view_json = to_json(&v9, &view);
                let verr = validate_wtype(&v9, &view);
                println!("[A] get OK; v9 view validates: {}", verr.is_empty());
                if !verr.is_empty() {
                    println!("    view errors: {}", verr.iter().take(3).map(std::string::ToString::to_string).collect::<Vec<_>>().join(" | "));
                }
                // Show the metadata portion of the view.
                if let Some(md) = view_json.get("metadata") {
                    println!("    view.metadata = {md}");
                }
                match panproto_lens::put(lens, &view, &comp) {
                    Ok(restored) => {
                        let rjson = to_json(&v8, &restored);
                        let same = rjson == to_json(&v8, &inst8);
                        println!("[A] put OK; get-put restores original exactly: {same}");
                        if let Some(md) = rjson.get("metadata") {
                            println!("    restored.metadata = {md}");
                        }
                    }
                    Err(e) => println!("[A] put ERROR: {e}"),
                }
                match check_get_put(lens, &inst8) {
                    Ok(()) => println!("[A] check_get_put(synthetic): PASS"),
                    Err(e) => println!("[A] check_get_put(synthetic): FAIL: {e:?}"),
                }
                match check_put_get(lens, &inst8) {
                    Ok(()) => println!("[A] check_put_get(synthetic): PASS"),
                    Err(e) => println!("[A] check_put_get(synthetic): FAIL: {e:?}"),
                }
            }
            Err(e) => println!("[A] get ERROR: {e}"),
        }
    }

    // Laws over real samples that parse+validate at v8 (additive-change coverage).
    let samples: Vec<Sample> = serde_json::from_str(&fs::read_to_string(
        "/private/tmp/layers-migration-samples.json",
    )?)?;
    if let Some(lens) = &lens_a {
        let (mut ok, mut skip, mut fail) = (0u32, 0u32, 0u32);
        for s in &samples {
            let Ok(inst) = parse_json(&v8, &s.collection, &s.record) else {
                skip += 1;
                continue;
            };
            if !validate_wtype(&v8, &inst).is_empty() {
                skip += 1;
                continue;
            }
            let gp = check_get_put(lens, &inst);
            let pg = check_put_get(lens, &inst);
            if gp.is_ok() && pg.is_ok() {
                ok += 1;
            } else {
                fail += 1;
                println!(
                    "  sample {} get-put={:?} put-get={:?}",
                    s.collection,
                    gp.err(),
                    pg.err()
                );
            }
        }
        println!("[laws over {} samples] pass={ok} fail={fail} skipped(not-v8-valid)={skip}", samples.len());
    }

    let _ = Path::new(base);
    Ok(())
}
