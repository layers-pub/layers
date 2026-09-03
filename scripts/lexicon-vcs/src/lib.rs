//! Shared migration construction for Layers lexicon tooling.

use std::collections::{HashMap, HashSet, VecDeque};

use panproto_gat::Name;
use panproto_mig::Migration;
use panproto_schema::Schema;

/// Build the identity-on-surviving-structure migration between two schemas.
#[must_use]
pub fn structural_migration(old: &Schema, new: &Schema) -> Migration {
    let vertex_map = old
        .vertices
        .keys()
        .filter(|id| new.vertices.contains_key(*id))
        .map(|id| (id.clone(), id.clone()))
        .collect();

    let mut edge_map = HashMap::new();
    for edge in old.edges.keys() {
        if new.edges.contains_key(edge) {
            edge_map.insert(edge.clone(), edge.clone());
            continue;
        }
        if !new.vertices.contains_key(&edge.src) || !new.vertices.contains_key(&edge.tgt) {
            continue;
        }
        if let Some(matching) = new.edges.keys().find(|candidate| {
            candidate.src == edge.src && candidate.tgt == edge.tgt && candidate.name == edge.name
        }) {
            edge_map.insert(edge.clone(), matching.clone());
        }
    }

    let hyper_edge_map = old
        .hyper_edges
        .keys()
        .filter(|id| new.hyper_edges.contains_key(*id))
        .map(|id| (id.clone(), id.clone()))
        .collect();

    let mut label_map = HashMap::new();
    for (hyper_edge_id, old_hyper_edge) in &old.hyper_edges {
        let Some(new_hyper_edge) = new.hyper_edges.get(hyper_edge_id) else {
            continue;
        };
        for (label, vertex_id) in &old_hyper_edge.signature {
            if !new.vertices.contains_key(vertex_id) {
                continue;
            }
            if let Some((new_label, _)) = new_hyper_edge
                .signature
                .iter()
                .find(|(_, candidate)| *candidate == vertex_id)
            {
                label_map.insert((hyper_edge_id.clone(), label.clone()), new_label.clone());
            }
        }
    }

    Migration {
        vertex_map,
        edge_map,
        hyper_edge_map,
        label_map,
        resolver: HashMap::new(),
        hyper_resolver: HashMap::new(),
        expr_resolvers: HashMap::new(),
        domain: None,
        codomain: None,
    }
}

/// Build a migration restricted to structure reachable from one record root.
#[must_use]
pub fn structural_migration_for_root(old: &Schema, new: &Schema, root: &str) -> Migration {
    if !old.vertices.contains_key(root) || !new.vertices.contains_key(root) {
        return Migration::empty();
    }

    let root = Name::from(root);
    let mut reachable = HashSet::from([root.clone()]);
    let mut queue = VecDeque::from([root.clone()]);
    let mut edge_map = HashMap::new();
    let mut vertex_map = HashMap::from([(root.clone(), root)]);

    while let Some(parent) = queue.pop_front() {
        for edge in old.outgoing_edges(&parent) {
            let Some(matching) = matching_edge(new, edge) else {
                continue;
            };
            let source_target = resolve_ref(old, &edge.tgt);
            let target_target = resolve_ref(new, &matching.tgt);
            vertex_map.insert(source_target.clone(), target_target);
            edge_map.insert(edge.clone(), matching);
            if reachable.insert(source_target.clone()) {
                queue.push_back(source_target);
            }
        }
    }

    let hyper_edge_map = old
        .hyper_edges
        .keys()
        .filter(|id| new.hyper_edges.contains_key(*id))
        .map(|id| (id.clone(), id.clone()))
        .collect();

    Migration {
        vertex_map,
        edge_map,
        hyper_edge_map,
        label_map: HashMap::new(),
        resolver: HashMap::new(),
        hyper_resolver: HashMap::new(),
        expr_resolvers: HashMap::new(),
        domain: None,
        codomain: None,
    }
}

fn resolve_ref(schema: &Schema, vertex: &Name) -> Name {
    let mut current = vertex.clone();
    let mut visited = HashSet::new();
    while visited.insert(current.clone()) {
        let Some(definition) = schema.vertices.get(&current) else {
            break;
        };
        if definition.kind.as_ref() != "ref" {
            break;
        }
        let Some(edge) = schema
            .outgoing_edges(&current)
            .iter()
            .find(|edge| edge.kind.as_ref() == "ref")
        else {
            break;
        };
        current = edge.tgt.clone();
    }
    current
}

fn matching_edge(new: &Schema, edge: &panproto_schema::Edge) -> Option<panproto_schema::Edge> {
    if new.edges.contains_key(edge) {
        return Some(edge.clone());
    }
    if !new.vertices.contains_key(&edge.src) || !new.vertices.contains_key(&edge.tgt) {
        return None;
    }
    new.edges
        .keys()
        .find(|candidate| {
            candidate.src == edge.src && candidate.tgt == edge.tgt && candidate.name == edge.name
        })
        .cloned()
}
