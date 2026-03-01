# FOVEA

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>Frame-Oriented Visual Event Annotator (FOVEA)</dd>
<dt>Origin</dt>
<dd>Johns Hopkins University HLTCOE</dd>
<dt>Specification</dt>
<dd><a href="https://github.com/parafovea/fovea">github.com/parafovea/fovea</a></dd>
<dt>Key Reference</dt>
<dd><a href="https://fovea.video/docs/">fovea.video/docs/</a></dd>
</dl>
</div>

## Overview

FOVEA is a video annotation system built around persona-based ontology construction, rich temporal and spatial modeling, entity/situation world models, claim extraction, and collaborative annotation with role-based access control. Layers was directly inspired by FOVEA's persona and ontology system.

## Type-by-Type Mapping

### Ontology System

| FOVEA Type | Layers Equivalent | Notes |
|---|---|---|
| `Persona` | `pub.layers.persona.persona` (record) | Direct mapping. `name`, `description`, `domain` all transfer. FOVEA's `role` and `informationNeed` map to `features`. `ontologyRefs` links to specific ontologies this persona uses. |
| `EntityType` | `pub.layers.ontology.typeDef` with `typeKind="entity-type"` | `name` → `name`; `gloss` → `gloss`; `constraints` → `features`; `wikidataId` → `knowledgeRefs[].identifier` with `source="wikidata"`. |
| `EventType` | `pub.layers.ontology.typeDef` with `typeKind="situation-type"` | `roles` → `allowedRoles` (array of `roleSlot` references). `parentEventId` → `parentTypeRef`. |
| `RoleType` | `pub.layers.ontology.typeDef` with `typeKind="role-type"` | `allowedFillerTypes` → `allowedValues` or `features`. |
| `EventRole` | `pub.layers.ontology.defs#roleSlot` | `roleTypeId` → `roleSlot` reference; `optional` → `required` (inverted); `minOccurrences`/`maxOccurrences` → `features`. |
| `RelationType` | `pub.layers.ontology.typeDef` with `typeKind="relation-type"` | `sourceTypes`/`targetTypes` → `features` (standardized keys: `domain`, `range`); `symmetric`/`transitive`/`reflexive` → `features` (standardized boolean keys); `inverse` → `features` (AT-URI of the inverse relation typeDef). |
| `OntologyRelation` | `pub.layers.graph.graphEdge` | Instance of a typed relation between ontology-level objects. |
| `TypeConstraint` | `pub.layers.ontology.typeDef.allowedValues` + `features` | `allowedTypes`, `requiredProperties`, `valueRange` all expressible via features. |
| `GlossItem` | `pub.layers.ontology.typeDef.gloss` (string) + `knowledgeRefs` | FOVEA's rich-text gloss with embedded references to types/objects is represented as a string gloss plus structured `knowledgeRefs` for cross-references. For richer inline markup, `features` can store structured gloss data. |

### World Model (Domain Objects)

FOVEA separates **ontology types** (what kinds of things exist) from **world instances** (specific entities/situations discovered in data). Layers handles world instances differently:

| FOVEA Type | Layers Equivalent | Notes |
|---|---|---|
| `Entity` (world object) | `pub.layers.graph.graphNode` with `nodeType="entity"` + `pub.layers.annotation.clusterSet` | FOVEA's world-level entities are modeled in Layers as: (1) `graphNode` records representing the entity in the property graph, with `label`, `properties`, and `knowledgeRefs` for grounding to external KBs (Wikidata, etc.); (2) `clusterSet` records that group all mentions of an entity across annotations; (3) `graphEdge` records linking mentions to graph nodes via `edgeType="grounding"` or `edgeType="instance-of"`. |
| `Event` (world object) | `pub.layers.graph.graphNode` with `nodeType="situation"` + `pub.layers.annotation.clusterSet` with `kind="situation-coreference"` | Same pattern as entities. Situation instances are `graphNode` records; annotations link to them via `graphEdge`. |
| `EntityTypeAssignment` | `pub.layers.annotation.defs#annotation.ontologyTypeRef` | Persona-specific type assignments are handled by creating separate `annotationLayer` records per persona, each with its own `ontologyRef`. |
| `EventInterpretation` | `pub.layers.annotation.defs#annotation` with `ontologyTypeRef` + `arguments` | Per-persona situation interpretation with typed participants via `argumentRef`. |
| `Location` | `pub.layers.defs#spatialExpression` with `type="location"` or `pub.layers.defs#boundingBox` | Geographic coordinates (GPS, cartesian) use `spatialExpression` with `spatialEntity.geometry` as WKT POINT and `crs="wgs84"`. For spatial annotations in images/video, Layers uses `boundingBox` and `spatioTemporalAnchor`. |
| `EntityCollection` | `pub.layers.annotation.clusterSet` with appropriate `kind` | FOVEA's collection types (`group`, `kind`, `functional`, `stage`, `portion`, `variant`) map to `clusterSet.kind` (community-expandable via `kindUri`). `aggregateProperties` → `features`. |
| `EventCollection` | `pub.layers.annotation.clusterSet` + `features` | Situation groupings with structure. `EventStructureNode` hierarchies can be represented via nested features or graph relations. |

### Temporal Model

| FOVEA Type | Layers Equivalent | Notes |
|---|---|---|
| `Time` (instant/interval) | `pub.layers.defs#temporalEntity` (for calendar time) or `pub.layers.defs#temporalSpan` (for media time) | FOVEA's `TimeInstant` maps to `temporalEntity.instant`; `TimeInterval` maps to `temporalEntity.intervalStart`/`intervalEnd`. For media-anchored time, `temporalSpan` with `start`/`ending` in milliseconds. |
| `Time.videoReferences` | `pub.layers.defs#temporalSpan` | Direct mapping. Frame numbers convert to milliseconds via frame rate. |
| `Time.vagueness` | `pub.layers.defs#temporalModifier` + `pub.layers.defs#temporalEntity.earliest`/`latest` | Temporal vagueness maps to `temporalModifier.mod` (`approximate`, `early`, `late`, etc.) and uncertainty bounds (`earliest`/`latest`). `granularity` is a first-class field on `temporalEntity`. |
| `Time.deictic` | `pub.layers.defs#temporalExpression.anchorRef` | Deictic temporal references use `anchorRef` pointing to the deictic center (document creation time, speech time, etc.). |
| `RecurrenceRule` (RFC 5545) | `pub.layers.defs#temporalEntity.recurrence` | ISO 8601 repeating intervals (e.g., `R/P1W` for weekly). More complex RFC 5545 rules use `features`. |
| `HabitualPattern` | `pub.layers.defs#temporalEntity.recurrence` + `features` | Habitual frequency as repeating interval; typicality in features. |
| `CyclicalPattern` | `pub.layers.defs#temporalEntity.recurrence` + `features` | Phase-based temporal patterns. Recurrence captures the cycle; phase metadata in features. |
| `TimeCollection` | `pub.layers.annotation.clusterSet` + `features` | Collections of temporal references with pattern metadata. |

### Spatial Model and Video Annotation

| FOVEA Type | Layers Equivalent | Notes |
|---|---|---|
| `BoundingBox` | `pub.layers.defs#boundingBox` | Direct mapping: `x`, `y`, `width`, `height`. FOVEA adds `frameNumber`, `confidence`, `isKeyframe`. Layers handles frame number via `keyframe.timeMs` (converted from frame number) and confidence via `annotation.confidence`. |
| `BoundingBoxSequence` | `pub.layers.defs#spatioTemporalAnchor` | `boxes` → `keyframes` (each keyframe has `timeMs` and `bbox`); `interpolationSegments` → `interpolation` (linear, step, cubic); `visibilityRanges` → representable via features. |
| `InterpolationSegment` | `pub.layers.defs#spatioTemporalAnchor.interpolation` + `features` | Layers supports `linear`, `step`, and `cubic` interpolation. FOVEA's `bezier`, `ease-in`, `ease-out`, `parametric` are representable as `cubic` with control points in features, or via community-defined `interpolationUri` values. |
| `ObjectAnnotation` | `pub.layers.annotation.defs#annotation` with `anchor.spatioTemporalAnchor` | Links a spatial region to a world object. `linkedEntityId` → `annotation.knowledgeRefs` or `clusterSet` membership. |
| `TypeAnnotation` | `pub.layers.annotation.defs#annotation` with `ontologyTypeRef` | Assigns an ontology type to a spatial region. Persona-specificity is achieved by having separate annotation layers per persona. |

### Claims and Propositions

| FOVEA Type | Layers Equivalent | Notes |
|---|---|---|
| `Claim` | `pub.layers.annotation.defs#annotation` with `kind="span"` and appropriate `subkind` | Claims are text spans with structured metadata. The `subkind` can be community-defined (e.g., `"claim"`, `"proposition"`, `"hypothesis"`). `text` → `annotation.text`; `gloss` → `annotation.features`; `confidence` → `annotation.confidence`. |
| `Claim.parentClaimId` | `annotation.parentId` + `annotation.childIds` | Claim hierarchies use the same tree structure as constituency parses. |
| `Claim.claimerType`/`claimerGloss` | `annotation.arguments` with `role="claimer"` | The claimer is a semantic argument of the claim, modeled via `argumentRef`. |
| `Claim.textSpans` (discontiguous) | `anchor.tokenRefSequence` | Discontiguous spans use `tokenRefSequence.tokenIndexes`. |
| `Claim` (as graph node) | `pub.layers.graph.graphNode` with `nodeType="claim"` | Claims can also be modeled as standalone graph nodes when they represent propositions that exist independently of specific text spans. Properties store claim metadata. |
| `ClaimRelation` | `pub.layers.graph.graphEdge` or `pub.layers.annotation.defs#annotation` with `kind="relation"` | Typed relations between claims (supports, contradicts, refines, generalizes) map to graph edges or relation-type annotations. Edge types include `supports`, `contradicts`, and community-defined types via `edgeTypeUri`. |
| `VideoSummary` | `pub.layers.expression.expression` + `pub.layers.annotation` layers | A summary is itself an expression with annotations linking it to the source video and extracted claims. |

### Collaboration Model

| FOVEA Type | Layers Equivalent | Notes |
|---|---|---|
| `User` | ATProto DID | Decentralized identity. No centralized user database. |
| `Project` | Corpus (`pub.layers.corpus.corpus`) | A project is a named collection of expressions with shared ontologies. |
| `ProjectMembership` | ATProto social graph | Access control is handled by ATProto's decentralized identity layer, not by Layers records. |
| `ResourceShare` | ATProto record permissions | Sharing is native to ATProto. Records are public by default in user PDSes. |
| `RBAC` | Appview-level access control | Layers delegates access control to the appview implementation, not the data model. |

## Features Not in FOVEA (Layers Extensions)

- **Text annotation**: FOVEA is video-first; Layers provides full stand-off text annotation (character spans, tokenizations, linguistic layers)
- **Interlinear glossing**: Multiple tokenizations + alignment records
- **Syntactic parsing**: Constituency, dependency, CCG parse representations
- **Discourse annotation**: RST, PDTB, SDRT relation types
- **Linguistic judgment experiments**: Structured experiment framework with agreement metrics
- **Eprint linkage**: Academic paper references
- **W3C Web Annotation interoperability**: Selector types for web annotation ecosystem
- **Community-expandable enums**: URI+slug pattern across all fields

