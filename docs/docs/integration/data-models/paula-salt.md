# PAULA / Salt / ANNIS

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>PAULA, Salt, and ANNIS: multi-layer corpus annotation architecture</dd>
<dt>Origin</dt>
<dd>Humboldt University Berlin / corpus-tools.org</dd>
<dt>Specification</dt>
<dd><a href="https://corpus-tools.org/salt/">corpus-tools.org/salt</a></dd>
<dt>Key Reference</dt>
<dd>Zeldes et al. 2009; <a href="https://hal.science/inria-00527799">Zipser & Romary 2010</a></dd>
</dl>
</div>

## Overview

Salt is a graph-based meta-model for linguistic annotation that serves as the common intermediate representation for the Pepper converter framework and the ANNIS corpus search system. PAULA is Salt's XML serialization. Salt models annotations as a directed, labeled graph with multiple annotation layers over shared primary data (text or audio). Salt explicitly supports multiple concurrent annotation layers, timeline-based alignment for spoken data, and hierarchical/relational structures.

## Salt Meta-Model Mapping

### Core Graph Model

| Salt Concept | Layers Equivalent | Notes |
|---|---|---|
| `SDocument` | `pub.layers.expression` | Root document container. |
| `SDocumentGraph` | All annotation layers + segmentation for an expression | The set of all annotations over a document. |
| `SCorpus` | `pub.layers.corpus` | Corpus container. |
| `SCorpusGraph` | Corpus membership records | Corpus hierarchy. |
| `STextualDS` (textual data source) | `pub.layers.expression.text` | Primary text data. The SofA. |
| `SMedialDS` (media data source) | `pub.layers.media` | Audio/video primary data. |
| `STimeline` | Implicit in `pub.layers.defs#temporalSpan` | Salt's timeline for spoken data alignment. Time points map to millisecond values. |

### Annotation Nodes

| Salt Node Type | Layers Equivalent | Notes |
|---|---|---|
| `SToken` | `pub.layers.expression` (kind: `token`) | Token node with text span. |
| `SSpan` | `pub.layers.annotation#annotation` with `anchor.tokenRefSequence` | Span over tokens (e.g., NP, entity mention). |
| `SStructure` | `pub.layers.annotation#annotation` with `parentId`/`childIds` | Hierarchical node (constituency tree node, discourse unit). |

### Annotation Edges

| Salt Edge Type | Layers Equivalent | Notes |
|---|---|---|
| `STextualRelation` | `token.textSpan` | Token-to-text anchoring. `sStart`/`sEnd` → `span.start`/`span.ending`. |
| `STimelineRelation` | Temporal anchoring via `annotation.anchor.temporalSpan` | Token-to-timeline anchoring for spoken data. |
| `SSpanningRelation` | `annotation.anchor.tokenRefSequence` | Span-to-token membership. |
| `SDominanceRelation` | `annotation.parentId`/`annotation.childIds` | Parent-child edges in hierarchical structures (constituency trees). |
| `SPointingRelation` | `pub.layers.graph#graphEdge` or `annotation.headIndex`/`argumentRef` | Directed edge between nodes (dependency arcs, coreference links, discourse relations). |
| `SOrderRelation` | Token ordering via `tokenIndex` | Sequential ordering of tokens. |
| `SMedialRelation` | `annotation.anchor.temporalSpan` | Node-to-media timeline anchoring. |

### Annotations on Nodes/Edges

| Salt Feature | Layers Equivalent | Notes |
|---|---|---|
| `SAnnotation` (on node) | `annotation.label`, `annotation.value`, or `annotation.features` | Key-value annotations on nodes. |
| `SAnnotation` (on edge) | `graphEdge.properties` or `annotation.label` (for dependency labels) | Key-value annotations on edges. |
| `SMetaAnnotation` | `pub.layers.defs#annotationMetadata` + `featureMap` | Document and corpus-level metadata. |
| `SLayer` | `pub.layers.annotation#annotationLayer` | Named annotation layers grouping nodes and edges. Salt layers map directly to Layers annotation layers. |

### Multi-Layer Architecture

Salt explicitly supports multiple annotation layers over the same primary data, which is the core of Layers's design:

| Salt Pattern | Layers Pattern | Notes |
|---|---|---|
| Multiple `SLayer` over same `STextualDS` | Multiple `annotationLayer` records referencing same `expression` | Independent annotation layers from different sources. |
| Cross-layer references | `argumentRef.layerRef` + `argumentRef.objectId` | Salt allows edges between nodes in different layers; Layers supports this via cross-layer argument references. |
| Layer-specific node types | `annotationLayer.kind`/`subkind` | Salt layers can contain different node types; Layers discriminates by kind/subkind. |

### PAULA XML Elements

| PAULA Element | Layers Equivalent | Notes |
|---|---|---|
| `<paula>` (document) | `pub.layers.expression` | Document root. |
| `<body>` (primary data) | `expression.text` | Primary text. |
| `<markList>` (token/span markables) | `pub.layers.expression` tokens + annotation spans | Token and span definitions. |
| `<mark>` | `token` or `annotation` | Individual markable. |
| `<structList>` | `annotationLayer` with hierarchical annotations | Structural annotations (trees). |
| `<struct>` | `annotation` with `parentId`/`childIds` | Structural node. |
| `<relList>` | `annotationLayer` with `kind="relation"` or `pub.layers.graph` | Relation annotations. |
| `<rel>` | `graphEdge` or `annotation` with `headIndex` | Individual relation. |
| `<featList>` | `featureMap` | Feature annotations. |

### ANNIS Query Compatibility

ANNIS provides AQL (ANNIS Query Language) for searching across annotation layers. Layers's appview can provide equivalent query capabilities by indexing annotation layers in Elasticsearch and PostgreSQL:

| ANNIS Feature | Layers Appview Equivalent | Notes |
|---|---|---|
| Token search | Elasticsearch full-text + token index | Text and token-level search. |
| Span search | Elasticsearch on annotation layers | Span annotation queries. |
| Tree queries (dominance) | PostgreSQL recursive queries on `parentId`/`childIds` | Tree structure traversal. |
| Pointing relation queries | PostgreSQL/Neo4j on graph relations | Relation queries. |
| Cross-layer queries | JOIN across annotation layer tables | Multi-layer query composition. |
| Frequency analysis | Elasticsearch aggregations | Statistical analysis over annotations. |

