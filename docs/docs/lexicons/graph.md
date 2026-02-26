---
sidebar_label: "Graph"
---

# pub.layers.graph

Generic typed property graph for knowledge representation and cross-referencing. Provides standalone graph nodes, typed directed edges between any Layers objects (within or across expressions, or to external knowledge graph nodes), and batch edge sets for efficient bulk operations. Enables cross-document coreference, intertextual linking, knowledge grounding, expression graphs (reply threads, translation chains, revision histories), temporal ordering (Allen's Interval Algebra), spatial relations (RCC-8 Region Connection Calculus), and arbitrary typed relationships.

## Types

### graphNode
**Type:** Record

A standalone graph node for entities, concepts, situations, or other objects that don't have another Layers record. Existing Layers records (expressions, annotations, typeDefs) are implicitly nodes via `objectRef`. This record is only needed for nodes that exist purely in the graph.

| Field | Type | Description |
|-------|------|-------------|
| `nodeTypeUri` | at-uri | AT-URI of the node type definition node. Community-expandable via knowledge graph. |
| `nodeType` | string | Node type slug (fallback). Known values: `entity`, `concept`, `situation`, `state`, `time`, `location`, `claim`, `proposition`, `custom` |
| `label` | string | Human-readable node label. |
| `properties` | ref | Ref: `pub.layers.defs#featureMap` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `createdAt` | datetime | Record creation timestamp. |

### graphEdge
**Type:** Record

A single directed, typed edge between any two Layers objects. Supports multidigraphs (multiple edges between the same pair of nodes) and cycles. Source and target can be any combination of local annotations (by UUID), remote records (by AT-URI), or external knowledge graph nodes (by `knowledgeRef`).

| Field | Type | Description |
|-------|------|-------------|
| `source` | ref | Source node. Ref: `pub.layers.defs#objectRef` |
| `target` | ref | Target node. Ref: `pub.layers.defs#objectRef` |
| `edgeTypeUri` | at-uri | AT-URI of the edge type definition node. Community-expandable via knowledge graph. |
| `edgeType` | string | Edge type slug (fallback). See edge type categories below. |
| `label` | string | Optional edge label. For temporal edges, can carry the linguistic signal/connective (e.g., "before", "since"). For spatial edges, can carry the spatial signal (e.g., "in", "near", "above"). |
| `ordinal` | integer | Optional ordering among edges of the same type from the same source. |
| `confidence` | integer | Confidence score 0-10000. |
| `properties` | ref | Ref: `pub.layers.defs#featureMap` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `createdAt` | datetime | Record creation timestamp. |

#### Edge type categories

**Communication:** `reply-to`, `quote`, `repost`, `translation-of`, `continuation`, `summary-of`, `revision-of`, `correction-of`

**Semantic:** `coreference`, `causal`, `part-of`, `member-of`, `type-of`, `same-as`, `related-to`, `derived-from`

**Argumentation:** `supports`, `contradicts`

**Discourse:** `discourse`, `bridging`

**Ontological:** `grounding`, `instance-of`, `denotes`, `describes`, `specializes`, `elaborates`

**Meta:** `produced-by`, `described-in`, `annotates`, `see-also`

**Temporal: Allen's Interval Algebra (13 basic relations)**

| Edge type | Inverse | Definition |
|-----------|---------|------------|
| `before` | `after` | Source ends before target starts (with gap) |
| `after` | `before` | Source starts after target ends (with gap) |
| `meets` | `met-by` | Source ends exactly when target starts |
| `met-by` | `meets` | Source starts exactly when target ends |
| `overlaps` | `overlapped-by` | Source starts before target, ends during target |
| `overlapped-by` | `overlaps` | Source starts during target, ends after target |
| `starts` | `started-by` | Source and target start together, source ends first |
| `started-by` | `starts` | Source and target start together, target ends first |
| `during` | `contains` | Source is entirely within target |
| `contains` | `during` | Target is entirely within source |
| `finishes` | `finished-by` | Source and target end together, source starts later |
| `finished-by` | `finishes` | Source and target end together, target starts later |
| `equals` | `equals` | Source and target have identical start and end |

**Temporal: TimeML extensions.** `simultaneous` (looser than `equals`, allows partial overlap in practice)

**Aspectual (TimeML ALINK):** `initiates`, `culminates`, `terminates`, `continues`, `reinitiates`

**Spatial: RCC-8 Region Connection Calculus (8 basic topological relations)**

| Edge type | Inverse | Definition |
|-----------|---------|------------|
| `disconnected` | `disconnected` | No common points (symmetric) |
| `externally-connected` | `externally-connected` | Share boundary only, interiors don't overlap (symmetric) |
| `partially-overlapping` | `partially-overlapping` | Some interior overlap, neither contains the other (symmetric) |
| `tangential-proper-part` | `tangential-proper-part-inverse` | Source is inside target, boundaries touch |
| `non-tangential-proper-part` | `non-tangential-proper-part-inverse` | Source is inside target, no boundary contact |
| `tangential-proper-part-inverse` | `tangential-proper-part` | Source contains target, boundaries touch |
| `non-tangential-proper-part-inverse` | `non-tangential-proper-part` | Source contains target, no boundary contact |
| `spatially-equal` | `spatially-equal` | Identical spatial extent (symmetric) |

**Spatial: Directional (ISO-Space orientational).** `north-of`, `south-of`, `east-of`, `west-of`, `above`, `below`, `in-front-of`, `behind`, `left-of`, `right-of`

**Spatial: Distance (ISO-Space metric).** `near`, `far`, `adjacent`

**Generic:** `custom`

### graphEdgeSet
**Type:** Record

A batch of typed, directed edges for efficient bulk operations. All edges in the set share the same edge type and optional expression context. Use `graphEdge` for individual edges; use `graphEdgeSet` for bulk imports, model outputs, or annotations that produce many edges at once.

| Field | Type | Description |
|-------|------|-------------|
| `expression` | at-uri | Optional primary expression context. |
| `edgeTypeUri` | at-uri | AT-URI of the edge type definition node. Community-expandable via knowledge graph. |
| `edgeType` | string | Edge type slug shared by all edges in this set (fallback). Same categories as `graphEdge.edgeType`. |
| `edges` | array | The edges. Array of ref: `#graphEdgeEntry` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features (e.g., extraction method, model version). Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### graphEdgeEntry
**Type:** Object

A single directed edge within a `graphEdgeSet`. Can optionally override the set-level edge type.

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | ref | Ref: `pub.layers.defs#uuid` |
| `edgeTypeUri` | at-uri | AT-URI of the edge type definition node. Overrides the set-level type if present. Community-expandable via knowledge graph. |
| `edgeType` | string | Edge type slug (fallback). |
| `source` | ref | Source node. Ref: `pub.layers.defs#objectRef` |
| `target` | ref | Target node. Ref: `pub.layers.defs#objectRef` |
| `confidence` | integer | Confidence score 0-10000. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
