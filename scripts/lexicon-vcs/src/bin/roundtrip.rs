//! Round-trip current Layers records backward and forward across schema history.

use std::collections::{HashMap, HashSet, VecDeque};
use std::env;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

use anyhow::{Context, Result, bail};
use layers_lexicon_vcs::structural_migration_for_root;
use panproto_inst::{
    Complement, FieldPresence, Value, WInstance, parse_json, to_json, validate_wtype,
};
use panproto_lens::{Lens, instances_equivalent, put};
use panproto_schema::Schema;
use serde::Deserialize;

const VERSIONS: [&str; 8] = [
    "v0.1.0", "v0.2.0", "v0.3.0", "v0.4.0", "v0.5.0", "v0.6.0", "v0.7.0", "v0.8.0",
];

#[derive(Deserialize)]
struct Sample {
    collection: String,
    origin: String,
    record: serde_json::Value,
}

struct Hop {
    lens: Lens,
    complement: Complement,
    arc_order: HashMap<(u32, u32), usize>,
}

fn main() -> Result<()> {
    let mut args = env::args_os();
    let Some(executable) = args.next() else {
        bail!("could not read the executable name");
    };
    let schemas_dir = required_path(&mut args, &executable)?;
    let samples_path = required_path(&mut args, &executable)?;
    if args.next().is_some() {
        bail!(
            "usage: {} <schemas-directory> <samples.json>",
            Path::new(&executable).display()
        );
    }

    let schemas = load_schemas(&schemas_dir)?;
    let samples: Vec<Sample> = serde_json::from_str(
        &fs::read_to_string(&samples_path)
            .with_context(|| format!("read {}", samples_path.display()))?,
    )
    .with_context(|| format!("parse {}", samples_path.display()))?;

    let mut passed = 0usize;
    for sample in &samples {
        round_trip(sample, &schemas)
            .with_context(|| format!("round-trip {} from {}", sample.collection, sample.origin))?;
        passed += 1;
    }
    println!(
        "round-tripped {passed} records backward and forward across up to {} schema hops",
        VERSIONS.len() - 1
    );
    Ok(())
}

fn required_path(
    args: &mut impl Iterator<Item = std::ffi::OsString>,
    executable: &std::ffi::OsStr,
) -> Result<PathBuf> {
    args.next().map(PathBuf::from).with_context(|| {
        format!(
            "usage: {} <schemas-directory> <samples.json>",
            Path::new(executable).display()
        )
    })
}

fn load_schemas(directory: &Path) -> Result<Vec<Schema>> {
    VERSIONS
        .iter()
        .map(|version| {
            let path = directory.join(format!("{version}.json"));
            serde_json::from_str(
                &fs::read_to_string(&path).with_context(|| format!("read {}", path.display()))?,
            )
            .with_context(|| format!("parse {}", path.display()))
        })
        .collect()
}

fn round_trip(sample: &Sample, schemas: &[Schema]) -> Result<()> {
    let latest = schemas.last().context("schema history is empty")?;
    if !latest.vertices.contains_key(sample.collection.as_str()) {
        bail!("latest schema has no {} root", sample.collection);
    }

    let mut instance = parse_json(latest, &sample.collection, &sample.record)
        .with_context(|| format!("parse {} record", sample.collection))?;
    validate_instance(latest, &instance, "latest input")?;
    let original = instance.clone();
    let original_json = to_json(latest, &original);
    let mut hops = Vec::new();

    for index in (1..schemas.len()).rev() {
        let source = &schemas[index];
        let target = &schemas[index - 1];
        if !target.vertices.contains_key(sample.collection.as_str()) {
            break;
        }
        let migration = structural_migration_for_root(source, target, &sample.collection);
        let compiled = panproto_mig::compile(source, target, &migration)
            .with_context(|| format!("compile {} to {}", VERSIONS[index], VERSIONS[index - 1]))?;
        let lens = Lens {
            compiled,
            src_schema: source.clone(),
            tgt_schema: target.clone(),
        };
        let arc_order = instance
            .arcs
            .iter()
            .enumerate()
            .map(|(position, (parent, child, _))| ((*parent, *child), position))
            .collect();
        let (view, complement) = project_record(&lens, &instance)
            .with_context(|| format!("migrate back to {}", VERSIONS[index - 1]))?;
        validate_instance(target, &view, VERSIONS[index - 1])?;
        hops.push(Hop {
            lens,
            complement,
            arc_order,
        });
        instance = view;
    }

    for hop in hops.iter().rev() {
        instance = put(&hop.lens, &instance, &hop.complement)
            .context("migrate forward with saved complement")?;
        restore_arc_order(&mut instance, &hop.arc_order);
        validate_instance(&hop.lens.src_schema, &instance, "forward restoration")?;
    }

    if !instances_equivalent(&original, &instance) {
        bail!("restored instance is not equivalent to the input");
    }
    let restored_json = to_json(latest, &instance);
    if restored_json != original_json {
        bail!(
            "restored JSON differs from the input instance\ninput: {}\nrestored: {}",
            serde_json::to_string_pretty(&original_json)?,
            serde_json::to_string_pretty(&restored_json)?
        );
    }
    Ok(())
}

fn restore_arc_order(instance: &mut WInstance, original: &HashMap<(u32, u32), usize>) {
    instance.arcs.sort_by_key(|(parent, child, edge)| {
        (
            original
                .get(&(*parent, *child))
                .copied()
                .unwrap_or(usize::MAX),
            edge.name.clone(),
            *child,
        )
    });
    *instance = WInstance::new(
        instance.nodes.clone(),
        instance.arcs.clone(),
        instance.fans.clone(),
        instance.root,
        instance.schema_root.clone(),
    );
}

fn project_record(lens: &Lens, source: &WInstance) -> Result<(WInstance, Complement)> {
    let mut retained = HashSet::from([source.root]);
    let mut queue = VecDeque::from([source.root]);

    while let Some(parent) = queue.pop_front() {
        for (arc_parent, child, edge) in &source.arcs {
            if *arc_parent != parent {
                continue;
            }
            if lens.compiled.edge_remap.contains_key(edge)
                || lens.compiled.surviving_edges.contains(edge)
            {
                if !retained.insert(*child) {
                    continue;
                }
                queue.push_back(*child);
            }
        }
    }

    let mut original_values = HashMap::new();
    let mut nodes = HashMap::new();
    for node_id in &retained {
        let source_node = source
            .nodes
            .get(node_id)
            .with_context(|| format!("retained node {node_id} is missing"))?;
        let mut node = source_node.clone();
        if let Some(target_anchor) = lens.compiled.vertex_remap.get(&node.anchor) {
            node.anchor.clone_from(target_anchor);
        }
        let source_kind = lens
            .src_schema
            .vertices
            .get(&source_node.anchor)
            .map(|vertex| vertex.kind.as_ref());
        let target_kind = lens
            .tgt_schema
            .vertices
            .get(&node.anchor)
            .map(|vertex| vertex.kind.as_ref());
        if source_kind != target_kind && target_kind == Some("string") {
            let replacement = child_string_value(source, *node_id, "raw")
                .or_else(|| child_string_value(source, *node_id, "value"))
                .or_else(|| child_string_value(source, *node_id, "name"));
            if let Some(value) = replacement {
                original_values.insert(*node_id, source_node.value.clone());
                node.value = Some(FieldPresence::Present(Value::Str(value)));
            }
        }
        nodes.insert(*node_id, node);
    }

    let mut arcs = Vec::new();
    for (parent, child, edge) in &source.arcs {
        if !retained.contains(parent) || !retained.contains(child) {
            continue;
        }
        if let Some(target_edge) = lens.compiled.edge_remap.get(edge) {
            arcs.push((*parent, *child, target_edge.clone()));
        } else if lens.compiled.surviving_edges.contains(edge) {
            arcs.push((*parent, *child, edge.clone()));
        }
    }

    let fans = source
        .fans
        .iter()
        .filter(|fan| {
            retained.contains(&fan.parent)
                && fan.children.values().all(|child| retained.contains(child))
        })
        .cloned()
        .collect();
    let schema_root = lens
        .compiled
        .vertex_remap
        .get(&source.schema_root)
        .cloned()
        .unwrap_or_else(|| source.schema_root.clone());
    let view = WInstance::new(nodes, arcs, fans, source.root, schema_root);

    let dropped_nodes = source
        .nodes
        .iter()
        .filter(|(node_id, _)| !retained.contains(node_id))
        .map(|(node_id, node)| (*node_id, node.clone()))
        .collect();
    let dropped_arcs = source
        .arcs
        .iter()
        .filter(|(parent, child, _)| !retained.contains(parent) || !retained.contains(child))
        .cloned()
        .collect();
    let dropped_fans = source
        .fans
        .iter()
        .filter(|fan| {
            !retained.contains(&fan.parent)
                || fan.children.values().any(|child| !retained.contains(child))
        })
        .cloned()
        .collect();
    let original_parent = retained
        .iter()
        .filter_map(|node_id| {
            source
                .parent_map
                .get(node_id)
                .map(|parent| (*node_id, *parent))
        })
        .collect();
    let arc_edges = source
        .arcs
        .iter()
        .filter(|(parent, child, _)| retained.contains(parent) && retained.contains(child))
        .map(|(parent, child, edge)| ((*parent, *child), edge.clone()))
        .collect();
    let complement = Complement {
        dropped_nodes,
        dropped_arcs,
        dropped_fans,
        contraction_choices: HashMap::new(),
        original_parent,
        source_fingerprint: schema_fingerprint(&lens.src_schema),
        original_extra_fields: HashMap::new(),
        arc_edges,
        original_values,
        synthesized_nodes: HashSet::new(),
        contracted_into: HashMap::new(),
    };
    Ok((view, complement))
}

fn child_string_value(source: &WInstance, parent: u32, field: &str) -> Option<String> {
    source.arcs.iter().find_map(|(arc_parent, child, edge)| {
        if *arc_parent != parent || edge.name.as_ref().map(AsRef::as_ref) != Some(field) {
            return None;
        }
        let node = source.nodes.get(child)?;
        match &node.value {
            Some(FieldPresence::Present(Value::Str(value))) => Some(value.clone()),
            _ => None,
        }
    })
}

fn schema_fingerprint(schema: &Schema) -> u64 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    let mut vertices: Vec<&str> = schema.vertices.keys().map(AsRef::as_ref).collect();
    vertices.sort_unstable();
    for vertex in vertices {
        vertex.hash(&mut hasher);
    }
    schema.edges.len().hash(&mut hasher);
    hasher.finish()
}

fn validate_instance(schema: &Schema, instance: &WInstance, stage: &str) -> Result<()> {
    let mut errors: Vec<String> = validate_wtype(schema, instance)
        .into_iter()
        .map(|error| error.to_string())
        .collect();
    errors.extend(validate_constraints(schema, instance));
    if errors.is_empty() {
        return Ok(());
    }
    bail!("{stage} validation failed: {}", errors.join("; "))
}

fn validate_constraints(schema: &Schema, instance: &WInstance) -> Vec<String> {
    let mut errors = Vec::new();
    for node in instance.nodes.values() {
        let Some(constraints) = schema.constraints.get(&node.anchor) else {
            continue;
        };
        let Some(FieldPresence::Present(value)) = &node.value else {
            continue;
        };
        for constraint in constraints {
            let violation = match constraint.sort.as_ref() {
                "minLength" => validate_min_length(&constraint.value, value),
                "maxLength" => validate_max_length(&constraint.value, value),
                "minimum" => validate_minimum(&constraint.value, value),
                "maximum" => validate_maximum(&constraint.value, value),
                _ => None,
            };
            if let Some(detail) = violation {
                errors.push(format!("node {} {}: {detail}", node.id, node.anchor));
            }
        }
    }
    errors
}

fn validate_min_length(constraint: &str, value: &Value) -> Option<String> {
    let minimum: usize = constraint.parse().ok()?;
    let actual = string_length(value)?;
    (actual < minimum).then(|| format!("length {actual} is less than {minimum}"))
}

fn validate_max_length(constraint: &str, value: &Value) -> Option<String> {
    let maximum: usize = constraint.parse().ok()?;
    let actual = string_length(value)?;
    (actual > maximum).then(|| format!("length {actual} exceeds {maximum}"))
}

fn string_length(value: &Value) -> Option<usize> {
    match value {
        Value::Str(value) | Value::Token(value) => Some(value.len()),
        _ => None,
    }
}

fn validate_minimum(constraint: &str, value: &Value) -> Option<String> {
    let minimum: f64 = constraint.parse().ok()?;
    let actual = numeric_value(value)?;
    (actual < minimum).then(|| format!("value {actual} is less than {minimum}"))
}

fn validate_maximum(constraint: &str, value: &Value) -> Option<String> {
    let maximum: f64 = constraint.parse().ok()?;
    let actual = numeric_value(value)?;
    (actual > maximum).then(|| format!("value {actual} exceeds {maximum}"))
}

fn numeric_value(value: &Value) -> Option<f64> {
    match value {
        Value::Int(value) => Some(*value as f64),
        Value::Float(value) => Some(*value),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use panproto_protocols::parse_schema_bundle;
    use serde_json::json;

    fn string_schema() -> Schema {
        parse_schema_bundle(
            "atproto",
            &[json!({
                "lexicon": 1,
                "id": "pub.test.sample",
                "defs": {
                    "main": {
                        "type": "record",
                        "key": "tid",
                        "record": {
                            "type": "object",
                            "required": ["kind"],
                            "properties": {
                                "kind": {
                                    "type": "string",
                                    "knownValues": ["known"],
                                    "maxLength": 8
                                }
                            }
                        }
                    }
                }
            })],
        )
        .unwrap_or_else(|error| panic!("parse test schema: {error}"))
    }

    #[test]
    fn known_values_are_advisory() {
        let schema = string_schema();
        let record = json!({"$type": "pub.test.sample", "kind": "other"});
        let instance = parse_json(&schema, "pub.test.sample", &record)
            .unwrap_or_else(|error| panic!("parse test instance: {error}"));

        assert!(validate_constraints(&schema, &instance).is_empty());
    }

    #[test]
    fn max_length_counts_utf8_bytes() {
        let schema = string_schema();
        let record = json!({"$type": "pub.test.sample", "kind": "ééééé"});
        let instance = parse_json(&schema, "pub.test.sample", &record)
            .unwrap_or_else(|error| panic!("parse test instance: {error}"));

        let errors = validate_constraints(&schema, &instance);
        assert_eq!(errors.len(), 1);
        assert!(errors[0].contains("length 10 exceeds 8"));
    }
}
