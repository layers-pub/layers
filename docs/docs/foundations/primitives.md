---
sidebar_label: "Primitives"
sidebar_position: 3
---

# Primitives

All Layers lexicons are built from a small set of abstract primitives defined in **pub.layers.defs**. These primitives are theory-neutral, composable, and support multimodal annotation.

## objectRef

Universal cross-referencing mechanism for resolving objects by multiple pathways:

```typescript
objectRef = {
  localId?: string              // Local ID within a record (e.g., "token_0")
  recordRef?: AtUri             // Reference to an ATProto record
  objectId?: string             // Opaque object identifier
  knowledgeRef?: knowledgeRef   // External knowledge base reference
}
```

**Use cases**:
- A token annotation references a token via localId and recordRef.
- A syntactic constituent references both a source token (via localId) and a constituent in another record (via recordRef).
- A named entity links to Wikidata via knowledgeRef.

## anchor

Polymorphic attachment point that specifies where an annotation applies. Different anchor kinds support different modalities. See the [Multimodal Annotation guide](../guides/multimodal-annotation.md) for practical examples across text, audio, video, image, and paged documents.

```typescript
anchor = {
  kind: "textSpan" | "tokenRef" | "tokenRefSequence" | "temporalSpan" |
         "spatioTemporalAnchor" | "pageAnchor" | "externalTarget" | string
  value: any  // Type depends on kind

  // Common fields
  sourceUri?: AtUri             // Reference to source document/media
  selector?: W3CSelector | objectRef  // W3C selector or local reference
}
```

**Kinds**:
- `textSpan`: `{start: number, end: number}` byte/character offsets in text.
- `tokenRef`: single token identifier (localId or recordRef).
- `tokenRefSequence`: `{tokens: objectRef[]}` ordered sequence of tokens.
- `temporalSpan`: `{start: number, end: number}` time in seconds (audio, video).
- `spatioTemporalAnchor`: `{x, y, width, height, start, end}` region in video.
- `pageAnchor`: `{page: number, x, y, width, height}` region in paged document.
- `externalTarget`: external URL or resource identifier.

**W3C Compatibility**: Anchors can include W3C selectors (textQuoteSelector, textPositionSelector, fragmentSelector) for compatibility with Web Annotation clients.

## constraint

DSL-agnostic expression for specifying constraints, conditions, or patterns:

```typescript
constraint = {
  expressionFormat: "xpath" | "jmespath" | "sparql" | "regex" | string
  expression: string
  scope?: string                 // "document" | "sentence" | "record" | etc.
  context?: any                  // Additional context for evaluation
  isNegative?: boolean           // Negation
}
```

**Use cases**:
- Dependency constraint: `{expressionFormat: "xpath", expression: "parent/dep_type='nsubj'"}`
- Pattern constraint: `{expressionFormat: "regex", expression: "^[A-Z].*"}`
- Semantic constraint: `{expressionFormat: "sparql", expression: "?x rdf:type :Person"}`

## agentRef

Composable agent identity that separates **who** from **what framework** they use and **what software**:

```typescript
agentRef = {
  did?: string                  // Decentralized identifier
  id?: string                   // Opaque identifier
  name?: string                 // Human-readable name
  knowledgeRef?: knowledgeRef   // Link to external authority (e.g., ORCID)

  personaRef?: AtUri            // Link to persona record (framework, theory, background)
  tool?: {
    name: string                // Tool name (e.g., "spaCy", "BERT", "Manual")
    version?: string
    sourceUri?: string          // URI to tool source/docs
  }
}
```

**Why separate fields?**
- An annotator might have a DID, a persona (their linguistic background/framework), and use a specific annotation tool (Inception, Prodigy, custom script).
- Linking to Persona and Tool metadata separately enables discovery and reproducibility.

**Example**:
```json
{
  "did": "did:key:z6MkhaXgBZDvotzL5oJQWZxv8KhfZXv...",
  "name": "Alice Chen",
  "personaRef": "at://did:plc:personas/alice-chen#1980-2025",
  "tool": {
    "name": "Inception",
    "version": "24.1"
  }
}
```

## annotationMetadata

Three-way provenance tracking: agent + persona + tool, plus confidence and digest:

```typescript
annotationMetadata = {
  agent: agentRef               // Who created the annotation
  timestamp: string (ISO 8601)  // When
  confidence?: number           // 0.0–1.0 confidence score

  personaUri?: AtUri            // Explicit link to persona
  toolUri?: AtUri               // Link to tool record

  digest?: {
    algorithm: "sha256" | string
    value: string               // Hash of annotation data
  }

  dependencies?: objectRef[]    // Upstream records this was derived from

  metadata?: featureMap         // Additional key-value data
}
```

**Use cases**:
- Human annotation: agent is the annotator, tool is the annotation interface.
- Model prediction: agent is the model (e.g., a neural network), personaUri could link to a persona describing the model's training data/framework.
- Provenance chain: a semantic role annotation lists its dependency parse and POS tagger outputs in `dependencies`, enabling reproducibility and invalidation tracking.
- Adjudication: metadata includes notes on why annotators agreed/disagreed.

## temporalExpression

Composable temporal annotation that separates **what time**, **how precise**, and **what role** into independent pieces. Fully subsumes TimeML/ISO-TimeML TIMEX3, OWL-Time, Allen's Interval Algebra, and ISO 8601. See the [Temporal Representation guide](../guides/temporal-representation.md) for full coverage with standards mapping tables.

```typescript
temporalExpression = {
  type?: string                   // "date" | "time" | "duration" | "set" | "interval" | "relative"
  value?: temporalEntity          // The normalized temporal value
  modifier?: temporalModifier     // Qualitative modification (approximate, early, late, etc.)
  anchorRef?: objectRef           // What this is relative to (DCT, another temporal expression)
  function?: string               // Document role: "creation-time" | "publication-time" | etc.
}

temporalEntity = {
  instant?: string                // ISO 8601 point: "2024-03-15T14:30:00Z"
  intervalStart?: string          // ISO 8601 interval start
  intervalEnd?: string            // ISO 8601 interval end
  duration?: string               // ISO 8601 duration: "P3Y", "PT2H30M"
  earliest?: string               // Lower bound for vague times
  latest?: string                 // Upper bound for vague times
  granularity?: string            // "year" | "month" | "day" | "hour" | "second" | ...
  calendar?: string               // "gregorian" | "hijri" | "hebrew" | "unix" | ...
  recurrence?: string             // ISO 8601 repeating: "R/P1W" (weekly)
}

temporalModifier = {
  mod?: string                    // "approximate" | "early" | "mid" | "late" | "before" | "after" | ...
}
```

**Dispatch convention**: Consumers check which `temporalEntity` fields are populated: `instant` only means a point, `intervalStart`+`intervalEnd` means a bounded interval, `duration` only means a pure duration, `earliest`+`latest` means uncertain bounds, `recurrence` means a repeating pattern.

**Temporal relations** between annotations use [`graphEdge`](../lexicons/graph.md) with Allen's 13 interval relations as `edgeType` values: `before`, `after`, `meets`, `met-by`, `overlaps`, `overlapped-by`, `starts`, `started-by`, `during`, `contains`, `finishes`, `finished-by`, `equals`.

**Use cases**:
- Simple date: `{type: "date", value: {instant: "2024-03-15", granularity: "day"}}`
- Vague duration: `{type: "duration", value: {duration: "PT3H"}, modifier: {mod: "approximate"}}`
- Weekly recurrence: `{type: "set", value: {recurrence: "R/P1W"}}`
- Relative time: `{type: "relative", value: {duration: "P3D"}, anchorRef: {localId: "dct_annotation_uuid"}}`
- Document creation time: `{type: "date", value: {instant: "2024-01-15"}, function: "creation-time"}`

## spatialExpression

Composable spatial annotation that separates **what place**, **how precise**, and **what role** into independent pieces. Fully subsumes ISO-Space (ISO 24617-7), SpatialML, GeoJSON, WKT, RCC-8, and W3C spatial selectors. See the [Spatial Representation guide](../guides/spatial-representation.md) for full coverage with standards mapping tables.

```typescript
spatialExpression = {
  type?: string                   // "location" | "region" | "path" | "direction" | "distance" | "relative"
  value?: spatialEntity           // The normalized spatial value
  modifier?: spatialModifier      // Qualitative modification (approximate, projected, etc.)
  anchorRef?: objectRef           // What this is relative to (landmark, reference location)
  function?: string               // Document role: "document-location" | "situation-location" | etc.
}

spatialEntity = {
  bbox?: boundingBox              // Pixel bounding box (image/video)
  geometry?: string               // WKT, GeoJSON, SVG path, COCO polygon string
  type?: string                   // "point" | "box" | "polygon" | "line-string" | "circle" | ...
  geometryFormat?: string         // "wkt" | "geojson" | "svg-path" | "coco-polygon" | ...
  crs?: string                    // "pixel" | "percentage" | "wgs84" | "web-mercator" | ...
  dimensions?: number             // 2 or 3
  uncertainty?: string            // "50m" | "10px" | "0.001deg"
}

spatialModifier = {
  mod?: string                    // "approximate" | "projected" | "interpolated" | "estimated" | ...
}
```

**Dispatch convention**: Consumers check which `spatialEntity` fields are populated: `bbox` only means a pixel bounding box, `geometry` + `type` means a typed geometry string, `geometry` + `geometryFormat` tells consumers how to parse the string.

**Spatial relations** between annotations use [`graphEdge`](../lexicons/graph.md) with RCC-8 topological relations as `edgeType` values: `disconnected`, `externally-connected`, `partially-overlapping`, `tangential-proper-part`, `non-tangential-proper-part`, `tangential-proper-part-inverse`, `non-tangential-proper-part-inverse`, `spatially-equal`. Directional relations: `north-of`, `south-of`, `east-of`, `west-of`, `above`, `below`, `in-front-of`, `behind`, `left-of`, `right-of`. Distance relations: `near`, `far`, `adjacent`.

**Use cases**:
- Pixel bounding box: `{type: "region", value: {bbox: {x: 100, y: 50, width: 200, height: 150}}}`
- Geographic point: `{type: "location", value: {geometry: "POINT(37.7749 -122.4194)", type: "point", crs: "wgs84"}}`
- Approximate location: `{type: "location", value: {geometry: "POINT(48.8566 2.3522)", type: "point", crs: "wgs84"}, modifier: {mod: "approximate"}}`
- WKT polygon: `{type: "region", value: {geometry: "POLYGON((0 0, 100 0, 100 100, 0 100, 0 0))", type: "polygon", geometryFormat: "wkt"}}`
- Relative spatial ref: `{type: "relative", anchorRef: {localId: "landmark_annotation_uuid"}}`

## knowledgeRef

Reference to an external knowledge base (Wikidata, FrameNet, WordNet, etc.). See the [Knowledge Grounding guide](../guides/knowledge-grounding.md) for the full entity grounding workflow and graph integration.

```typescript
knowledgeRef = {
  source: string                // KB name (e.g., "wikidata", "framenet", "wordnet")
  sourceUri?: AtUri             // URI to KB authority record
  identifier: string            // KB-specific identifier (e.g., "Q76" for Wikidata)
  uri?: string                  // Full URI (e.g., "http://www.wikidata.org/entity/Q76")
  label?: string                // Human-readable label from KB
}
```

**Example**:
```json
{
  "source": "wikidata",
  "identifier": "Q76",
  "uri": "http://www.wikidata.org/entity/Q76",
  "label": "Barack Hussein Obama"
}
```

## featureMap / feature

Open-ended key-value extensibility for annotation-specific attributes:

```typescript
feature = {
  key: string
  value: string | number | boolean | any
  confidence?: number
  metadata?: featureMap
}

featureMap = {
  features: feature[]
}
```

**Use cases**:
- POS tag with additional morphological features: `{key: "number", value: "plural"}`
- Named entity with additional attributes: `{key: "entity_type_confidence", value: 0.95}`
- Semantic role with frame-specific features.

## alignmentLink

Many-to-many sequence correspondence for linking parallel annotations:

```typescript
alignmentLink = {
  source: objectRef[]           // Source sequence of objects
  target: objectRef[]           // Target sequence of objects
  alignmentType: string         // "1-1" | "1-n" | "n-1" | "n-m" | string
  confidence?: number           // Alignment confidence
  metadata?: annotationMetadata
}
```

**Use cases**:
- Aligning tokens across language pairs in a parallel corpus.
- Linking syntactic constituents across different parse trees.
- Mapping annotation boundaries across annotation schemes.

## W3C Selectors

Layers supports W3C Web Annotation selectors for compatibility with existing tools:

```typescript
textQuoteSelector = {
  type: "TextQuoteSelector"
  exact: string                 // Exact text match
  prefix?: string               // Context before match
  suffix?: string               // Context after match
}

textPositionSelector = {
  type: "TextPositionSelector"
  start: number                 // Byte/character offset
  end: number
}

fragmentSelector = {
  type: "FragmentSelector"
  value: string                 // Fragment identifier (e.g., "xywh=100,50,200,150")
  conformsTo?: string           // Media type (e.g., "http://www.w3.org/TR/media-frags/")
}
```

These can be included alongside Layers-native anchors to support Web Annotation clients and downstream tools.

## Primitives Summary

These primitives recur throughout all Layers lexicons. All record types compose from the same set. featureMap and the [URI+slug pattern](./flexible-enums.md) allow custom attributes and values without schema changes. W3C selectors provide compatibility with existing annotation ecosystems. The polymorphic anchor supports text, audio, video, image, and paged documents. knowledgeRef links annotations to external KBs and authority records.

For detailed guides on how these primitives work together, see [Temporal Representation](../guides/temporal-representation.md), [Spatial Representation](../guides/spatial-representation.md), [Multimodal Annotation](../guides/multimodal-annotation.md), and [Knowledge Grounding](../guides/knowledge-grounding.md).
