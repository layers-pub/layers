---
sidebar_label: "Spatial Representation"
---

# Spatial Representation

Layers provides composable spatial primitives that fully subsume GeoJSON (RFC 7946), WKT/ISO 19125, ISO-Space (ISO 24617-7), SpatialML, RCC-8, DE-9IM, W3C spatial selectors, COCO/VOC/YOLO annotation formats, and SVG. This guide documents the spatial type system and maps each standard to Layers equivalents.

## Two Kinds of Space

Layers distinguishes **media space** from **semantic space**:

- **Media space** (`boundingBox`, `spatioTemporalAnchor`): *where* in an image or video frame an annotation occurs. Expressed as pixel coordinates. Used for anchoring annotations to media: "this object is at pixel (100, 50) with width 200 and height 150."

- **Semantic space** (`spatialExpression`): *what place or region* a linguistic expression refers to. Expressed as geographic coordinates, named locations, or relative positions. Used for spatial annotation: "this expression refers to downtown Tokyo."

Media space lives on [anchors](../foundations/primitives.md#anchor) (`pub.layers.defs#anchor.spatioTemporalAnchor`). Semantic space lives on [annotations](../lexicons/annotation.md) (`pub.layers.annotation.defs#annotation.spatial`). They are independent: a spatial annotation at pixel (100, 50) in a satellite image might refer to "the Eiffel Tower at 48.8584° N, 2.2945° E."

## Spatial Primitives

Three composable objects in [`pub.layers.defs`](../lexicons/defs.md):

### spatialEntity

The normalized spatial value. Consumers dispatch on which fields are populated:

| Pattern | Fields | Example |
|---------|--------|---------|
| Pixel bounding box | `bbox` | `{x: 100, y: 50, width: 200, height: 150}` |
| Geographic point | `geometry` + `type="point"` + `crs="wgs84"` | `"POINT(37.7749 -122.4194)"` |
| Polygon region | `geometry` + `type="polygon"` | `"POLYGON((0 0, 100 0, 100 100, 0 100, 0 0))"` |
| Line/path | `geometry` + `type="line-string"` | `"LINESTRING(0 0, 50 50, 100 0)"` |
| Circle | `geometry` + `type="circle"` | `"POINT(50 50)"` with radius in features |
| GeoJSON geometry | `geometry` + `geometryFormat="geojson"` | `'{"type":"Point","coordinates":[-122.4194,37.7749]}'` |
| Complex shape | `geometry` + `geometryFormat="svg-path"` | `"M 10 10 L 100 10 L 100 100 Z"` |

The `geometry` field is a string whose format is specified by `geometryFormat` (default: WKT). The `type` field enables dispatch without parsing. The `crs` field specifies the coordinate reference system (`pixel`, `percentage`, `wgs84`, `web-mercator`, or community-defined via `crsUri`).

### spatialModifier

Qualitative modification: `approximate`, `projected`, `interpolated`, `estimated`, `buffered`, `simplified`, `generalized`.

### spatialExpression

The complete spatial annotation, packaging:
- **type**: `location`, `region`, `path`, `direction`, `distance`, `relative`
- **value**: ref to `spatialEntity`
- **modifier**: ref to `spatialModifier`
- **anchorRef**: what this expression is relative to (e.g., a landmark, reference location)
- **function**: the role this place plays in the document (`document-location`, `situation-location`, `origin`, `destination`, etc.)

## Spatial Relations

Spatial relations between annotations use [`pub.layers.graph.graphEdge`](../lexicons/graph.md) with RCC-8 topological relations, directional relations, and distance relations as `edgeType` values.

### RCC-8 (Region Connection Calculus)

The 8 jointly exhaustive and pairwise disjoint topological relations between spatial regions:

| # | Relation | Inverse | Visual | Definition |
|---|----------|---------|--------|------------|
| 1 | `disconnected` | `disconnected` | `A    B` | No common points (symmetric) |
| 2 | `externally-connected` | `externally-connected` | `A)(B` | Share boundary only, interiors don't overlap (symmetric) |
| 3 | `partially-overlapping` | `partially-overlapping` | `A(B)A`/`B(A)B` | Some interior overlap, neither contains the other (symmetric) |
| 4 | `tangential-proper-part` | `tangential-proper-part-inverse` | `(A)__`/`(BB)` | Source inside target, boundaries touch |
| 5 | `non-tangential-proper-part` | `non-tangential-proper-part-inverse` | `_(A)_`/`(BBB)` | Source inside target, no boundary contact |
| 6 | `tangential-proper-part-inverse` | `tangential-proper-part` | `(AA)`/`(B)__` | Source contains target, boundaries touch |
| 7 | `non-tangential-proper-part-inverse` | `non-tangential-proper-part` | `(AAA)`/`_(B)_` | Source contains target, no boundary contact |
| 8 | `spatially-equal` | `spatially-equal` | `(AB)` | Identical spatial extent (symmetric) |

**Symmetric relations**: `disconnected`, `externally-connected`, `partially-overlapping`, and `spatially-equal` are symmetric: `R(A,B)` implies `R(B,A)`. Both edge directions are valid.

**Proper part convention**: `tangential-proper-part(A,B)` means A is inside B. The inverse `tangential-proper-part-inverse(A,B)` means A contains B.

**Point geometry**: For points (zero-area regions), only `disconnected` and `spatially-equal` apply.

**Constraint composition**: RCC-8's composition table (what can be inferred from combining two relations) is an application-level concern, not encoded in the schema. Libraries can compute transitive closure over Layers graph edges.

### DE-9IM / OGC Predicate Mapping

The DE-9IM (Dimensionally Extended 9-Intersection Model) predicates used in PostGIS and JTS map to RCC-8 as follows:

| OGC Predicate | RCC-8 Equivalent | Notes |
|---------------|-------------------|-------|
| `Equals` | `spatially-equal` | Identical extent |
| `Disjoint` | `disconnected` | No intersection |
| `Touches` | `externally-connected` | Boundary contact only |
| `Overlaps` | `partially-overlapping` | Partial interior overlap |
| `Within` | `tangential-proper-part` or `non-tangential-proper-part` | A inside B |
| `Contains` | `tangential-proper-part-inverse` or `non-tangential-proper-part-inverse` | A contains B |
| `Covers` | `tangential-proper-part-inverse` | Contains with boundary sharing |
| `CoveredBy` | `tangential-proper-part` | Within with boundary sharing |
| `Intersects` | Any except `disconnected` | Negation of Disjoint |
| `Crosses` | (none) | Applies to line/point geometries; use `partially-overlapping` or features |

### Directional Relations

ISO-Space orientational relations as `graphEdge.edgeType` values:

| Edge type | Inverse | Frame |
|-----------|---------|-------|
| `north-of` | `south-of` | Absolute (cardinal) |
| `south-of` | `north-of` | Absolute (cardinal) |
| `east-of` | `west-of` | Absolute (cardinal) |
| `west-of` | `east-of` | Absolute (cardinal) |
| `above` | `below` | Vertical |
| `below` | `above` | Vertical |
| `in-front-of` | `behind` | Relative/intrinsic |
| `behind` | `in-front-of` | Relative/intrinsic |
| `left-of` | `right-of` | Relative/intrinsic |
| `right-of` | `left-of` | Relative/intrinsic |

Frame of reference (absolute, relative, intrinsic) can be specified via `graphEdge.properties` features.

### Distance Relations

| Edge type | Meaning |
|-----------|---------|
| `near` | Source is close to target (threshold in `properties`) |
| `far` | Source is distant from target (threshold in `properties`) |
| `adjacent` | Source shares a boundary with target |

Quantitative distances are stored in `graphEdge.properties` (e.g., `{key: "distance", value: "50km"}`).

The `label` field on spatial graphEdges can carry the linguistic spatial signal that triggered the relation (e.g., "in", "near", "above", "between"). Signal annotations themselves use `subkind="spatial-signal"` on annotation layers.

## Composability Examples

**Simple pixel bounding box:**
```json
{
  "subkind": "spatial-expression",
  "label": "person",
  "spatial": {
    "type": "region",
    "value": {
      "bbox": { "x": 100, "y": 50, "width": 200, "height": 150 },
      "crs": "pixel"
    }
  }
}
```

**Geographic point ("located at 37.7749° N, 122.4194° W"):**
```json
{
  "subkind": "location-mention",
  "label": "San Francisco",
  "text": "San Francisco",
  "spatial": {
    "type": "location",
    "value": {
      "geometry": "POINT(37.7749 -122.4194)",
      "type": "point",
      "geometryFormat": "wkt",
      "crs": "wgs84"
    }
  }
}
```

**GeoJSON polygon region:**
```json
{
  "spatial": {
    "type": "region",
    "value": {
      "geometry": "{\"type\":\"Polygon\",\"coordinates\":[[[-122.5,37.7],[-122.4,37.7],[-122.4,37.8],[-122.5,37.8],[-122.5,37.7]]]}",
      "type": "polygon",
      "geometryFormat": "geojson",
      "crs": "wgs84"
    }
  }
}
```

**Approximate location ("somewhere in downtown"):**
```json
{
  "spatial": {
    "type": "location",
    "value": {
      "geometry": "POINT(35.6762 139.6503)",
      "type": "point",
      "crs": "wgs84",
      "uncertainty": "2km"
    },
    "modifier": { "mod": "approximate" }
  }
}
```

**Relative spatial reference ("behind the station"):**
```json
{
  "spatial": {
    "type": "relative",
    "anchorRef": { "localId": { "value": "station-annotation-uuid" } }
  }
}
```

**Path/trajectory ("from Paris to Lyon"):**
```json
{
  "spatial": {
    "type": "path",
    "value": {
      "geometry": "LINESTRING(2.3522 48.8566, 4.8357 45.7640)",
      "type": "line-string",
      "crs": "wgs84"
    },
    "function": "origin"
  }
}
```

**COCO polygon annotation:**
```json
{
  "spatial": {
    "type": "region",
    "value": {
      "geometry": "[100,50,200,50,200,150,150,200,100,150]",
      "type": "polygon",
      "geometryFormat": "coco-polygon",
      "crs": "pixel"
    }
  }
}
```

**Spatial relation (graphEdge):**
```json
{
  "source": { "recordRef": "at://did:plc:.../pub.layers.annotation.annotationLayer/...", "objectId": { "value": "place-1-uuid" } },
  "target": { "recordRef": "at://did:plc:.../pub.layers.annotation.annotationLayer/...", "objectId": { "value": "place-2-uuid" } },
  "edgeType": "north-of",
  "label": "north of",
  "confidence": 950
}
```

---

## Standards Mapping

### GeoJSON (RFC 7946)

GeoJSON is the standard JSON format for encoding geographic data structures. Layers maps all GeoJSON geometry types to `spatialEntity`.

| GeoJSON Type | Layers Equivalent | Notes |
|---|---|---|
| `Point` | `spatialEntity` with `type="point"`, `geometryFormat="geojson"` | Single coordinate position |
| `MultiPoint` | `spatialEntity` with `type="multi-point"`, `geometryFormat="geojson"` | Array of positions |
| `LineString` | `spatialEntity` with `type="line-string"`, `geometryFormat="geojson"` | Ordered positions forming a line |
| `MultiLineString` | `spatialEntity` with `type="multi-line-string"`, `geometryFormat="geojson"` | Array of LineStrings |
| `Polygon` | `spatialEntity` with `type="polygon"`, `geometryFormat="geojson"` | Closed ring(s), exterior + optional holes |
| `MultiPolygon` | `spatialEntity` with `type="multi-polygon"`, `geometryFormat="geojson"` | Array of Polygons |
| `GeometryCollection` | `spatialEntity` with `type="geometry-collection"`, `geometryFormat="geojson"` | Mixed geometry types |
| `coordinates` | `spatialEntity.geometry` | The GeoJSON geometry object as a JSON string |
| CRS (default WGS84) | `spatialEntity.crs="wgs84"` | GeoJSON defaults to WGS84 (EPSG:4326) |
| `bbox` property | `spatialEntity.bbox` or features | Bounding box envelope |
| 3D coordinates | `spatialEntity.dimensions=3` | Longitude, latitude, altitude |

**Completeness:** Full subsumption. Every GeoJSON geometry type has a direct mapping. The GeoJSON geometry object is stored as a JSON string in the `geometry` field with `geometryFormat="geojson"`.

### WKT (Well-Known Text) / ISO 19125

WKT is the OGC standard text representation for geometry objects. It is the default `geometryFormat` for `spatialEntity`.

| WKT Type | Layers Equivalent | Example |
|---|---|---|
| `POINT` | `spatialEntity` with `type="point"` | `POINT(37.7749 -122.4194)` |
| `LINESTRING` | `spatialEntity` with `type="line-string"` | `LINESTRING(0 0, 50 50, 100 0)` |
| `POLYGON` | `spatialEntity` with `type="polygon"` | `POLYGON((0 0, 100 0, 100 100, 0 100, 0 0))` |
| `MULTIPOINT` | `spatialEntity` with `type="multi-point"` | `MULTIPOINT((0 0), (1 1))` |
| `MULTILINESTRING` | `spatialEntity` with `type="multi-line-string"` | `MULTILINESTRING((0 0, 1 1), (2 2, 3 3))` |
| `MULTIPOLYGON` | `spatialEntity` with `type="multi-polygon"` | `MULTIPOLYGON(((0 0, 1 0, 1 1, 0 0)))` |
| `GEOMETRYCOLLECTION` | `spatialEntity` with `type="geometry-collection"` | `GEOMETRYCOLLECTION(POINT(0 0), LINESTRING(0 0, 1 1))` |
| 2D coordinates | `dimensions=2` | `(x y)` |
| 3D coordinates (Z) | `dimensions=3` | `(x y z)` |
| 4D coordinates (ZM) | `dimensions=4` + features | `(x y z m)` with measure value in features |

**Completeness:** Full subsumption. WKT is the default geometry format; any WKT string can be stored directly in the `geometry` field.

### ISO-Space (ISO 24617-7)

ISO-Space is the ISO standard for spatial and spatiotemporal annotation in natural language text. See the [ISO-Space integration doc](../integration/data-models/iso-space.md) for the full type-by-type mapping.

| ISO-Space Element | Layers Equivalent | Notes |
|---|---|---|
| `PLACE` | `annotation` with `subkind="location-mention"` + `spatial` field | Named/nominal place references. `spatial.type="location"` |
| `SPATIAL_ENTITY` (non-place) | `annotation` with `subkind="spatial-expression"` + `spatial` field | General spatial entities |
| `SPATIAL_SIGNAL` | `annotation` with `subkind="spatial-signal"` | Spatial prepositions/connectives ("in", "near", "above") |
| `PATH` | `annotation` with `spatial.type="path"` | Motion paths. `spatial.value.geometry` as WKT LINESTRING |
| `MOTION` | `annotation` with `subkind="situation-mention"` + `arguments` | Motion events with trajector, landmark, path arguments |
| `QSLINK` (qualitative spatial) | `graphEdge` with RCC-8 `edgeType` | Topological relations between spatial entities |
| `OLINK` (orientation) | `graphEdge` with directional `edgeType` | Orientational relations (above, north-of, etc.) |
| `MEASURELINK` | `graphEdge` with distance `edgeType` + `properties` | Metric relations with distance values |
| `MLINK` (motion) | `graphEdge` with `edgeType="causal"` + motion properties | Links between motion events and paths |
| Frame of reference | `graphEdge.properties` features | Intrinsic, relative, or absolute frame |

**Completeness:** Full subsumption. Every ISO-Space element and attribute has a direct or compositional mapping.

### SpatialML (NGA/MITRE)

SpatialML is a markup language for geographic place references in natural language text with geo-coordinate grounding.

| SpatialML Element | Layers Equivalent | Notes |
|---|---|---|
| `PLACE` | `annotation` with `subkind="location-mention"` + `spatial` field | `spatial.type="location"`, geo-coordinates in `spatial.value` |
| `PLACE.gazref` | `annotation.knowledgeRefs` | Gazetteer reference as `knowledgeRef` |
| `PLACE.latLong` | `spatialEntity.geometry` with `crs="wgs84"` | WKT POINT |
| `PLACE.country`/`continent` | `annotation.features` | Administrative hierarchy in features |
| `LINK` | `graphEdge` with RCC-8/directional `edgeType` | Topological and directional relations between places |
| `RLINK` | `graphEdge` with `edgeType` + path properties | Relative location with trajectory information |
| `SIGNAL` | `annotation` with `subkind="spatial-signal"` | Spatial indicator words |

**Completeness:** Full subsumption. SpatialML's geo-coordinate grounding maps directly to `spatialEntity` with WGS84 coordinates.

### W3C Web Annotation Selectors

W3C spatial selectors for identifying regions in images and documents.

| W3C Selector | Layers Equivalent | Notes |
|---|---|---|
| `FragmentSelector` (xywh= pixel) | `spatialEntity.bbox` | `xywh=100,50,200,150` → `{x:100, y:50, width:200, height:150}` |
| `FragmentSelector` (xywh= percent) | `spatialEntity` with `geometry` + `crs="percentage"` | Percentage-based coordinates |
| `SvgSelector` | `spatialEntity` with `geometryFormat="svg-path"` | SVG shapes for non-rectangular regions |
| `ImageApiSelector` (IIIF) | `spatialEntity.bbox` or `geometry` + `crs="percentage"` | IIIF region selectors |

### Computer Vision Formats

| Format | Layers Equivalent | Notes |
|---|---|---|
| **COCO** bbox `[x,y,w,h]` | `spatialEntity.bbox` | Direct mapping (top-left origin, pixel coords) |
| **COCO** polygon | `spatialEntity` with `geometryFormat="coco-polygon"`, `type="polygon"` | Coordinate array as string |
| **COCO** RLE mask | `spatialEntity` with `geometryFormat="coco-rle"`, `type="polygon"` | Run-length encoded segmentation |
| **Pascal VOC** `[xmin,ymin,xmax,ymax]` | `spatialEntity.bbox` | Convert: `width=xmax-xmin`, `height=ymax-ymin` |
| **YOLO** `[x_center,y_center,w,h]` normalized | `spatialEntity` with `type="box"`, `crs="percentage"` | Normalized [0,1] coordinates |

### SVG Shapes

| SVG Element | Layers `spatialEntity.type` | Notes |
|---|---|---|
| `<rect>` | `box` | `bbox` for axis-aligned; `geometry`+`svg-path` for rotated |
| `<circle>` | `circle` | Center + radius in geometry string or features |
| `<ellipse>` | `ellipse` | Center + radii in geometry string or features |
| `<polygon>` | `polygon` | Coordinate list as geometry string |
| `<polyline>` | `line-string` | Open line as geometry string |
| `<path>` | Any | SVG path data in `geometry` with `geometryFormat="svg-path"` |

### RCC-8 (Region Connection Calculus)

All 8 RCC-8 relations are first-class `graphEdge.edgeType` values. See the [Spatial Relations](#spatial-relations) section above for the complete table.

**Inverse convention**: For symmetric relations (`disconnected`, `externally-connected`, `partially-overlapping`, `spatially-equal`), both edge directions are equivalent. For asymmetric relations, use the appropriate direction or its inverse.

### ELAN / Gesture and Sign Language Annotation

| ELAN Concept | Layers Equivalent | Notes |
|---|---|---|
| Spatial tier (gesture annotation) | `annotationLayer` with `subkind="spatial-expression"` | Annotations carry `spatial` field |
| Signing space | `spatialEntity` with `crs="pixel"` | Signing space coordinates relative to video frame |
| Hand position | `spatialEntity` with `type="point"`, `crs="pixel"` | Point in video frame |
| Motion trajectory | `spatialEntity` with `type="line-string"` | Sequence of positions over time |
| Spatial reference in signs | `spatialExpression` with `type="relative"` + `anchorRef` | Spatial reference relative to signer body |

## See Also

- [Primitives](../foundations/primitives.md): spatialExpression, spatialEntity, spatialModifier definitions
- [Temporal Representation](./temporal-representation.md): the parallel temporal type system
- [Multimodal Annotation](./multimodal-annotation.md): spatial anchoring in images and video
- [Knowledge Grounding](./knowledge-grounding.md): spatial relations as graph edges
- [Defs](../lexicons/defs.md): full type definitions for spatial primitives
- [Graph](../lexicons/graph.md): RCC-8 and directional edge types
- [Annotation](../lexicons/annotation.md): the `spatial` field on annotations
- [ISO-Space Integration](../integration/data-models/iso-space.md): detailed ISO-Space mapping
