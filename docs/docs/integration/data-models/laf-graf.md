# LAF/GrAF (ISO 24612)

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>Linguistic Annotation Framework and Graph Annotation Format (LAF/GrAF)</dd>
<dt>Origin</dt>
<dd>ISO TC 37/SC 4</dd>
<dt>Specification</dt>
<dd>ISO 24612:2012</dd>
<dt>Key Reference</dt>
<dd><a href="https://link.springer.com/article/10.1007/s10579-014-9268-1">Ide & Suderman 2014</a></dd>
</dl>
</div>

## Overview

LAF is the ISO standard for linguistic annotation interchange. It defines a three-layer architecture: (1) a **media layer** containing primary data, (2) an **anchoring layer** mapping annotations to regions of the primary data, and (3) an **annotation layer** containing labeled nodes and edges forming a directed graph. GrAF is the concrete XML serialization of LAF. The model is theory-neutral and representation-neutral by design.

## Architectural Mapping

### LAF Three-Layer Architecture

| LAF Layer | Layers Equivalent | Notes |
|---|---|---|
| Media layer (primary data) | `pub.layers.expression.expression` + `pub.layers.media.media` | The expression record holds text; media records hold audio/video/image. |
| Anchoring layer (regions) | `pub.layers.defs#anchor` (polymorphic) | LAF's anchoring to regions of primary data maps to Layers's polymorphic `anchor` type: `span` (character offsets), `tokenRef`, `tokenRefSequence`, `temporalSpan`, `spatioTemporalAnchor`, `pageAnchor`, `externalTarget`. |
| Annotation layer (graph) | `pub.layers.annotation.annotationLayer` + `pub.layers.graph` | Labeled nodes and edges. Layers provides both within-layer graph structures (`annotation` with `parentId`/`childIds`/`headIndex`/`arguments`) and cross-layer/cross-document graph structures (`pub.layers.graph.graphEdgeSet`). |

### LAF Data Model Primitives

| LAF Concept | Layers Equivalent | Notes |
|---|---|---|
| **Region** | `pub.layers.defs#anchor` | A contiguous area of primary data. LAF regions are defined by anchors into the media layer. Layers's `span`, `temporalSpan`, `pageAnchor` etc. serve the same purpose. |
| **Node** | `pub.layers.annotation.defs#annotation` | A labeled point in the annotation graph. In Layers, each annotation is a node with optional anchoring and feature structure. |
| **Edge** | `annotation.headIndex`, `annotation.parentId`, `annotation.arguments`, or `pub.layers.graph.graphEdge` | Directed connections between nodes. Within a single annotation layer, edges are represented via `headIndex` (dependency), `parentId`/`childIds` (constituency), or `argumentRef` (predicate-argument). Across layers, `pub.layers.graph.graphEdge` provides typed directed edges. |
| **Feature Structure** | `pub.layers.defs#featureMap` | LAF's attribute-value feature structures on nodes and edges map to Layers's `featureMap` (typed key-value pairs). |
| **Annotation** | `pub.layers.annotation.defs#annotation` | A node-feature structure pair. The `label`, `value`, `features`, and typed fields (`tokenIndex`, `anchor`, etc.) on a Layers annotation constitute its feature structure. |
| **Annotation Space** | `pub.layers.annotation.annotationLayer` | LAF annotation spaces (sets of nodes/edges from a single producer) map to annotation layers. Multiple layers can coexist over the same expression. |
| **Annotation Document** | `pub.layers.annotation.annotationLayer` (record) | A serialized annotation space. In Layers, each annotation layer is an ATProto record. |
| **Link** | `annotation.anchor` | The connection between a node and a region of primary data. |

### GrAF XML Elements

| GrAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<graph>` | `pub.layers.annotation.annotationLayer` | Root element of an annotation document. |
| `<node xml:id="...">` | `pub.layers.annotation.defs#annotation` with `uuid` | Identified annotation node. |
| `<edge from="..." to="...">` | `annotation.headIndex`, `argumentRef`, or `graphEdge` | Directed edge between nodes. |
| `<link targets="...">` | `annotation.anchor` | Associates a node with regions of primary data. |
| `<region anchors="...">` | `pub.layers.defs#span` or other anchor type | Specifies offsets into primary data. |
| `<fs>` (feature structure) | `pub.layers.defs#featureMap` | Attribute-value pairs on nodes. |
| `<f name="..." value="...">` | `pub.layers.defs#feature` | Single feature. |
| `<a>` (annotation) | `pub.layers.annotation.defs#annotation` | Node + feature structure + optional link. |

### LAF Standoff Principles

LAF mandates that annotations are stored separately from primary data, referencing it by anchors. Layers follows this principle exactly:

1. Primary data is in `pub.layers.expression.expression` (text) and `pub.layers.media.media` (audio/video/image)
2. Document structure (sections, sentences, paragraphs) is expressed via `pub.layers.expression.expression` records with `parentRef` chains, separate from primary data
3. Tokenization is in `pub.layers.segmentation.segmentation` records, with optional `expressionRef` scoping each tokenization to a specific sub-expression
4. All annotations are in `pub.layers.annotation.annotationLayer` records, referencing primary data via `anchor` objects
5. Multiple annotation layers from different producers coexist independently

### LAF Compositionality

LAF requires that annotation graphs be composable: independent annotations from different sources can be combined. Layers achieves this through:

1. **Separate records**: Each annotation layer is an independent ATProto record
2. **Shared anchoring**: All layers reference the same expression via its AT-URI
3. **UUID cross-references**: Annotations reference each other by UUID, enabling cross-layer composition
4. **No interference**: Adding a new annotation layer never modifies existing layers

