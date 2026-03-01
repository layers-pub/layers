# ISO-Space (ISO 24617-7)

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>ISO-Space (ISO 24617-7, ISO 24617-14)</dd>
<dt>Origin</dt>
<dd>ISO TC 37/SC 4; Brandeis University (ISOspace)</dd>
<dt>Specification</dt>
<dd>ISO 24617-7:2020 (Spatial information); ISO 24617-14:2023 (Spatial semantics)</dd>
<dt>Key Reference</dt>
<dd><a href="https://www.iso.org/standard/76442.html">ISO 24617-7:2020</a></dd>
</dl>
</div>

## Overview

ISO-Space is the ISO standard framework for annotating spatial and spatiotemporal information in natural language text. It provides markup for places, spatial entities, spatial signals (prepositions and connectives), paths, motion events, and four types of spatial links: qualitative spatial links (QSLINK) using RCC-8 topological relations, orientation links (OLINK) for directional relations, measure links (MEASURELINK) for metric/distance relations, and motion links (MLINK) connecting motion events to their paths.

Layers fully subsumes ISO-Space through three mechanisms:
1. **Structured spatial annotations.** `spatialExpression`, `spatialEntity`, and `spatialModifier` in `pub.layers.defs` capture all place and spatial entity attributes.
2. **Annotation subkinds.** `location-mention`, `spatial-expression`, `spatial-signal`, `situation-mention` discriminate ISO-Space element types.
3. **Graph edges.** RCC-8 topological relations, directional relations, and distance relations as `graphEdge.edgeType` values capture all QSLINK, OLINK, and MEASURELINK relations.

## Type-by-Type Mapping

### Spatial Entities

| ISO-Space Element | Layers Equivalent | Notes |
|---|---|---|
| `PLACE` | `annotation` with `subkind="location-mention"` + `spatial` field | Named/nominal place references. `spatial.type="location"`. Geo-coordinates in `spatial.value.geometry` with `crs="wgs84"`. Gazetteer references in `knowledgeRefs`. |
| `PLACE.type` (COUNTRY, STATE, CITY, etc.) | `annotation.label` | The place type as the primary label |
| `PLACE.gazref` | `annotation.knowledgeRefs` | Gazetteer reference as `knowledgeRef` with appropriate `source` (e.g., `"geonames"`, `"osm"`) |
| `PLACE.latLong` | `spatialEntity.geometry` with `crs="wgs84"` | WKT POINT: `"POINT(lat lon)"` |
| `PLACE.dcl` (document creation location) | `spatialExpression.function="document-location"` | Parallel to TimeML's `functionInDocument` |
| `SPATIAL_ENTITY` (non-place) | `annotation` with `subkind="spatial-expression"` + `spatial` field | Non-place spatial entities (objects with spatial extent). `spatial.type` varies by entity nature. |
| `SPATIAL_ENTITY.dimensionality` | `spatialEntity.dimensions` | 2 or 3 |
| `SPATIAL_ENTITY.form` | `annotation.features` | Shape description (e.g., "linear", "areal", "volumetric") |

### Spatial Signals

| ISO-Space Element | Layers Equivalent | Notes |
|---|---|---|
| `SPATIAL_SIGNAL` | `annotation` with `subkind="spatial-signal"` | Spatial prepositions and connectives ("in", "near", "above", "between") |
| `SPATIAL_SIGNAL.type` (TOPOLOGICAL, DIRECTIONAL, METRIC) | `annotation.label` | The signal type as label |
| Text content | `annotation.text` | The signal text |

### Paths and Motion

| ISO-Space Element | Layers Equivalent | Notes |
|---|---|---|
| `PATH` | `annotation` with `spatial.type="path"` | Motion paths. `spatial.value.geometry` as WKT LINESTRING. `spatial.value.type="line-string"`. |
| `PATH.beginID` / `PATH.endID` | `annotation.arguments` with `role="origin"` / `role="destination"` | Path endpoints as argument references |
| `PATH.midIDs` | `annotation.arguments` with `role="waypoint"` | Intermediate points |
| `MOTION` | `annotation` with `subkind="situation-mention"` + `arguments` | Motion events. Arguments include trajector, landmark, path, goal, source. |
| `MOTION.motion_type` (MANNER, PATH) | `annotation.label` | Motion type as label |
| `MOTION.motion_class` (MOVE, MOVE_EXTERNAL, MOVE_INTERNAL) | `annotation.features` key `motion-class` | ISO-Space motion classification |
| `MOTION.motion_sense` (LITERAL, FICTIVE, INTRINSIC_CHANGE) | `annotation.features` key `motion-sense` | Literal vs. figurative motion |

### Spatial Links (Relations)

| ISO-Space Element | Layers Equivalent | Notes |
|---|---|---|
| `QSLINK` (qualitative spatial) | `pub.layers.graph.graphEdge` with RCC-8 `edgeType` | Topological relations. `relType` maps to specific RCC-8 edge type. |
| `QSLINK.relType=DC` | `graphEdge` with `edgeType="disconnected"` | Disconnected |
| `QSLINK.relType=EC` | `graphEdge` with `edgeType="externally-connected"` | Externally connected |
| `QSLINK.relType=PO` | `graphEdge` with `edgeType="partially-overlapping"` | Partially overlapping |
| `QSLINK.relType=TPP` | `graphEdge` with `edgeType="tangential-proper-part"` | Tangential proper part |
| `QSLINK.relType=NTPP` | `graphEdge` with `edgeType="non-tangential-proper-part"` | Non-tangential proper part |
| `QSLINK.relType=TPPi` | `graphEdge` with `edgeType="tangential-proper-part-inverse"` | Tangential proper part inverse |
| `QSLINK.relType=NTPPi` | `graphEdge` with `edgeType="non-tangential-proper-part-inverse"` | Non-tangential proper part inverse |
| `QSLINK.relType=EQ` | `graphEdge` with `edgeType="spatially-equal"` | Spatially equal |
| `OLINK` (orientation) | `pub.layers.graph.graphEdge` with directional `edgeType` | Orientational relations |
| `OLINK.relType` (ABOVE, BELOW, LEFT, RIGHT, IN_FRONT, BEHIND, NORTH, SOUTH, EAST, WEST) | Mapped directional `edgeType` | `ABOVE` → `above`, `IN_FRONT` → `in-front-of`, `NORTH` → `north-of`, etc. |
| `OLINK.frame_type` (INTRINSIC, RELATIVE, ABSOLUTE) | `graphEdge.properties` feature `frame-type` | Reference frame specification |
| `OLINK.referencePt` | `graphEdge.properties` feature `reference-point` | Reference point for computing orientation |
| `MEASURELINK` | `pub.layers.graph.graphEdge` with distance `edgeType` | Metric relations |
| `MEASURELINK.relType` (DISTANCE) | `graphEdge` with `edgeType="near"`, `"far"`, or `"adjacent"` | Qualitative distance; quantitative value in `properties` |
| `MEASURELINK.value` | `graphEdge.properties` feature `distance` | Distance value as string (e.g., "50km", "3 miles") |
| `MEASURELINK.unit` | `graphEdge.properties` feature `distance-unit` | Unit of measurement |
| `MLINK` (motion link) | `pub.layers.graph.graphEdge` with `edgeType="causal"` or `"related-to"` | Links between motion events and spatial entities/paths |
| `MLINK.figure` | `graphEdge.source` | The moving entity |
| `MLINK.ground` | `graphEdge.target` | The reference entity or path |

### Signals on Links

| ISO-Space Element | Layers Equivalent | Notes |
|---|---|---|
| Link `signalID` | `graphEdge.label` | Reference to the spatial signal annotation that triggered the relation |
| Link `trigger` | `graphEdge.properties` feature `trigger` | The triggering element (motion verb, spatial preposition) |

## Conversion Notes

An ISO-Space-annotated document can be converted to Layers records as follows:

1. Create a `pub.layers.expression.expression` record with `kind="document"` from the source text
2. For each `PLACE`, create an annotation in an `annotationLayer` with `kind="span"`, `subkind="location-mention"`, `formalism="iso-space"`. Populate the `spatial` field with a `spatialExpression` containing the geo-coordinates, place type, and document function
3. For each `SPATIAL_ENTITY` (non-place), create an annotation with `subkind="spatial-expression"` and populate the `spatial` field
4. For each `SPATIAL_SIGNAL`, create an annotation with `subkind="spatial-signal"`
5. For each `PATH`, create an annotation with `spatial.type="path"` and `spatial.value.geometry` as WKT LINESTRING
6. For each `MOTION`, create an annotation with `subkind="situation-mention"` and arguments for trajector, landmark, path, goal, source
7. For each `QSLINK`, create a `graphEdge` with the mapped RCC-8 relation as `edgeType`
8. For each `OLINK`, create a `graphEdge` with the mapped directional relation as `edgeType`, with frame of reference in `properties`
9. For each `MEASURELINK`, create a `graphEdge` with a distance `edgeType` and distance value in `properties`
10. For each `MLINK`, create a `graphEdge` linking the motion event to its spatial arguments

All ISO-Space IDs map to Layers UUIDs. Cross-references use `objectRef` with `localId` (same record) or `recordRef` + `objectId` (cross-record).

