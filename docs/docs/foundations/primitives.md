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
  localId?: uuid                // uuid ({value: string}): UUID of an object within the same record
  recordRef?: AtUri             // Reference to an ATProto record
  objectId?: uuid               // uuid ({value: string}): UUID of an object within the recordRef'd record
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
  // Polymorphic: at least one anchoring field should be present.
  // Consumers dispatch on which field(s) are populated.
  textSpan?: span                          // Character/byte span in text
  tokenRef?: tokenRef                       // Single token reference
  tokenRefSequence?: tokenRefSequence       // Sequence of token references
  temporalSpan?: temporalSpan               // Temporal span in audio/video
  spatioTemporalAnchor?: spatioTemporalAnchor  // Spatio-temporal region in video
  pageAnchor?: pageAnchor                    // Page and region in a paged document
  externalTarget?: externalTarget            // External resource target (web page, document, etc.)
}
```

W3C selectors are not carried directly on the anchor; they live inside `externalTarget` (see [W3C Selectors](#w3c-selectors)).

**Fields**:
- `textSpan`: the `span` type `{byteStart: integer, byteEnd: integer, charStart?: integer, charEnd?: integer}` (UTF-8 byte offsets; optional character offsets).
- `tokenRef`: `{tokenizationId: uuid, tokenIndex: integer}` referencing a token by tokenization id and 0-based index.
- `tokenRefSequence`: `{tokenizationId: uuid, tokenIndexes: integer[], anchorTokenIndex?: integer}` referencing possibly non-contiguous token indices within one tokenization.
- `temporalSpan`: `{start: integer, ending: integer}` in milliseconds (audio, video).
- `spatioTemporalAnchor`: `{temporalSpan, keyframes?: keyframe[], interpolation?}` where each `keyframe` is `{timeMs, bbox, features?}` (region tracked through video).
- `pageAnchor`: `{page: integer, boundingBox?: boundingBox, textSpan?: span}` where `boundingBox` is `{x, y, width, height}` (region in a paged document).
- `externalTarget`: external URL or resource identifier (carries an optional W3C selector).

**W3C Compatibility**: Anchors can include W3C selectors (textQuoteSelector, textPositionSelector, fragmentSelector) for compatibility with Web Annotation clients.

## constraint

DSL-agnostic expression for specifying constraints, conditions, or patterns:

```typescript
constraint = {
  expression: string             // The constraint expression (required)
  expressionFormat?: "python-expr" | "json-logic" | "regex" | "sparql-filter" | "type-ref" | "custom"
  expressionFormatUri?: AtUri    // AT-URI of the expression format definition node
  scope?: "slot" | "template" | "cross-template" | "global"
  scopeUri?: AtUri               // AT-URI of the scope definition node
  context?: string[]             // Names of slots/variables this constraint ranges over (max 32)
  description?: string           // Human-readable description
}
```

**Use cases**:
- Dependency constraint: `{expressionFormat: "python-expr", expression: "parent.dep_type == 'nsubj'"}`
- Pattern constraint: `{expressionFormat: "regex", expression: "^[A-Z].*"}`
- Semantic constraint: `{expressionFormat: "sparql-filter", expression: "?x rdf:type :Person"}`

## agentRef

Composable agent identity that separates **who** from **what framework** they use and **what software**:

```typescript
agentRef = {
  did?: string                  // Decentralized identifier
  id?: string                   // Opaque identifier (max 512 chars)
  name?: string                 // Human-readable name (max 512 chars)
  knowledgeRef?: knowledgeRef   // Link to external authority (e.g., ORCID)
}
```

agentRef identifies only **who** produced the data. The interpretive framework (persona) and the software used (tool) are separate fields on [annotationMetadata](#annotationmetadata), alongside the agent.

**Why separate fields?**
- Consumers dispatch on which field(s) are populated: `did` for ATProto-native agents, `id` for anonymized or platform-specific identifiers, `knowledgeRef` for externally grounded agents (ORCID, HuggingFace model card, Wikidata).
- Keeping persona and tool out of the identity reference means the same agent can annotate under different frameworks and with different software without multiplying identities.

**Example**:
```json
{
  "did": "did:key:z6MkhaXgBZDvotzL5oJQWZxv8KhfZXv...",
  "name": "Alice Chen"
}
```

## annotationMetadata

Three-way provenance tracking: agent + persona + tool, plus confidence and digest:

```typescript
annotationMetadata = {
  tool: string                  // Software that produced the annotation, e.g. "spaCy 3.7" (max 512 chars)
  agent?: agentRef              // Who ran the tool (human or model)
  timestamp?: string (ISO 8601) // When the annotation was produced
  confidence?: integer          // 0-1000 confidence score (integer-scaled to avoid floats)

  personaRef?: AtUri            // Persona/framework the annotation was produced under

  dependencies?: objectRef[]    // Upstream records this was derived from (max 32)

  digest?: string               // Content hash, "<algorithm>:<hex>" form, e.g. "sha256:9f86d081..." (max 160 chars)
}
```

`tool` is the only required field. The three provenance concerns stay distinct: `agent` (who did it), `personaRef` (under what framework), and `tool` (with what software).

**Use cases**:
- Human annotation: agent is the annotator, tool is the annotation interface (e.g., "Inception 24.1").
- Model prediction: agent is the model (e.g., a neural network), personaRef could link to a persona describing the model's training data/framework.
- Provenance chain: a semantic role annotation lists its dependency parse and POS tagger outputs in `dependencies`, enabling reproducibility and invalidation tracking.
- Adjudication: notes on why annotators agreed/disagreed go in the annotation's own `features` featureMap.

## licensing / licenseRef

Complete licensing terms for a released artifact. Most top-level produces (corpus, annotation layer, experiment definition, persona, etc.) carry a `licensing` value; the expression record is the exception, linking papers via `eprintRefs` without its own licensing. It represents single, dual/choose-one, composite (all-apply), exception (WITH), and component-scoped licensing via an SPDX license expression plus per-license detail, mirroring a DataCite rightsList.

```typescript
licensing = {
  expression?: string           // SPDX license expression encoding the relationship between licenses (OR for choose-one, AND for composite, WITH for exceptions), e.g. "MIT OR Apache-2.0", "CC-BY-4.0 AND LicenseRef-LDC-User-Agreement". Optional when a single license applies.
  licenses: licenseRef[]         // The licenses named by the expression, or the single governing license (>= 1)
}

licenseRef = {
  spdx: string                  // SPDX identifier slug (required); knownValues include "CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0", "MIT", "Apache-2.0", "BSD-3-Clause", "LDC-User-Agreement", "proprietary", "custom"
  spdxUri?: AtUri               // Canonical AT-URI of the license definition node (URI+slug pattern; spdxUri is authoritative, spdx is the fallback)
  name?: string                 // Human-readable license name
  url?: string                  // URL of the full license text (DataCite rightsURI)
  attribution?: string          // Required attribution/credit text for downstream users
  notes?: string                // Additional licensing notes, restrictions, or usage terms
  appliesTo?: string            // Component this license covers when an artifact mixes licenses by part (e.g., "annotations", "underlying-text", "code", "media"); omit when it covers the whole artifact
}
```

**Use cases**:
- Single license: `{licenses: [{spdx: "CC-BY-4.0"}]}`.
- Dual/choose-one: `{expression: "MIT OR Apache-2.0", licenses: [{spdx: "MIT"}, {spdx: "Apache-2.0"}]}`.
- Composite: `{expression: "CC-BY-4.0 AND LicenseRef-LDC-User-Agreement", licenses: [{spdx: "CC-BY-4.0", appliesTo: "annotations"}, {spdx: "LDC-User-Agreement", appliesTo: "underlying-text"}]}`.

`spdx`/`spdxUri` follow the same [URI+slug pattern](./flexible-enums.md) as every other enumerated field: consumers check `spdxUri` first and fall back to the `spdx` slug.

## reproducibilityInfo

How to reproduce a dataset or the data produced from an eprint. Data-producing releases (corpus, annotation layer, cluster set, segmentation, alignment, experiment definition, graph edge set) carry a `reproducibility` value; eprint data links reuse the same type.

```typescript
reproducibilityInfo = {
  codeUri?: string              // URI of the code repository
  commitHash?: string           // Git commit hash
  command?: string              // Command to reproduce the data
  environment?: string          // Environment specification (Docker image, conda env, etc.)
  randomSeed?: integer          // Random seed used
}
```

**Use cases**:
- A silver treebank records the model code repository, commit, and the exact decode command in `reproducibility`.
- An experiment definition records the conda environment and random seed used to generate its stimulus lists.

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

**Temporal relations** between annotations use [`pub.layers.graph.graphEdge`](../lexicons/graph.md) with Allen's 13 interval relations as `edgeType` values: `before`, `after`, `meets`, `met-by`, `overlaps`, `overlapped-by`, `starts`, `started-by`, `during`, `contains`, `finishes`, `finished-by`, `equals`.

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
  dimensions?: integer            // 2, 3, or 4 (minimum 2, maximum 4)
  uncertainty?: string            // "50m" | "10px" | "0.001deg"
}

spatialModifier = {
  mod?: string                    // "approximate" | "projected" | "interpolated" | "estimated" | ...
}
```

**Dispatch convention**: Consumers check which `spatialEntity` fields are populated: `bbox` only means a pixel bounding box, `geometry` + `type` means a typed geometry string, `geometry` + `geometryFormat` tells consumers how to parse the string.

**Spatial relations** between annotations use [`pub.layers.graph.graphEdge`](../lexicons/graph.md) with RCC-8 topological relations as `edgeType` values: `disconnected`, `externally-connected`, `partially-overlapping`, `tangential-proper-part`, `non-tangential-proper-part`, `tangential-proper-part-inverse`, `non-tangential-proper-part-inverse`, `spatially-equal`. Directional relations: `north-of`, `south-of`, `east-of`, `west-of`, `above`, `below`, `in-front-of`, `behind`, `left-of`, `right-of`. Distance relations: `near`, `far`, `adjacent`.

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
  source: string                // KB name; knownValues include "wikidata", "framenet", "wordnet", "propbank", "verbnet", "unimorph", "glottolog", "cldr", "orcid", "ror", "openalex", "crossref", "dblp", "semantic-scholar", "custom"
  sourceUri?: AtUri             // URI to KB authority record
  identifier: string            // KB-specific identifier (e.g., "Q76" for Wikidata)
  uri?: string                  // Full URI (e.g., "http://www.wikidata.org/entity/Q76")
  label?: string                // Human-readable label from KB
}
```

The bibliographic sources (`orcid`, `ror`, `openalex`, `crossref`, `dblp`, `semantic-scholar`) ground researchers, organizations, works, and venues, so the same primitive that links a named entity to Wikidata links a citation's author to their ORCID record. See [Knowledge Grounding](../guides/knowledge-grounding.md#grounding-bibliographic-creators) for the bibliographic workflow.

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
  key: string                   // Feature name/key (max 256 chars)
  value: string                 // Feature value as string (max 4096 chars)
}

featureMap = {
  entries: feature[]
}
```

All feature values are strings. Consumers parse typed values based on the key's semantics (e.g., a value of `"0.95"` under a key conventionally holding a probability is parsed as a number). This keeps the wire format uniform and avoids cross-language type-coercion ambiguity; see the [feature key conventions](../lexicons/media.md#feature-key-conventions) for how typed semantics attach to keys.

**Use cases**:
- POS tag with additional morphological features: `{key: "number", value: "plural"}`
- Named entity with additional attributes: `{key: "entity_type_confidence", value: "0.95"}`
- Semantic role with frame-specific features.

## alignmentLink

Many-to-many sequence correspondence for linking parallel annotations:

```typescript
alignmentLink = {
  sourceIndices?: integer[]     // Indices into the source sequence
  targetIndices?: integer[]     // Indices into the target sequence
  confidence?: integer          // Alignment confidence (0-1000)
  label?: string                // Optional label (e.g., alignment type, max 256 chars)
  knowledgeRefs?: knowledgeRef[] // Knowledge graph references for this link (max 8)
  features?: featureMap         // Open-ended per-link attributes
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
  exact: string                 // Exact text match
  prefix?: string               // Context before match
  suffix?: string               // Context after match
}

textPositionSelector = {
  byteStart: number             // UTF-8 byte offset
  byteEnd: number
  charStart?: number            // Optional character offset (for character-offset datasets)
  charEnd?: number
}

fragmentSelector = {
  value: string                 // Fragment identifier (e.g., "xywh=100,50,200,150")
  conformsTo?: string           // Media type (e.g., "http://www.w3.org/TR/media-frags/")
}
```

These can be included alongside Layers-native anchors to support Web Annotation clients and downstream tools.

## Primitives Summary

These primitives recur throughout all Layers lexicons. All record types compose from the same set. featureMap and the [URI+slug pattern](./flexible-enums.md) allow custom attributes and values without schema changes. W3C selectors provide compatibility with existing annotation ecosystems. The polymorphic anchor supports text, audio, video, image, and paged documents. knowledgeRef links annotations to external KBs and authority records.

For detailed guides on how these primitives work together, see [Temporal Representation](../guides/temporal-representation.md), [Spatial Representation](../guides/spatial-representation.md), [Multimodal Annotation](../guides/multimodal-annotation.md), and [Knowledge Grounding](../guides/knowledge-grounding.md).
