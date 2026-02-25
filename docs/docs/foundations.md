---
sidebar_position: 2
---

# Foundations

## Design Principles

Layers is guided by ten principles that ensure it remains modular, interoperable, and extensible:

### 1. Theory-Neutral

Layers makes no commitment to any linguistic theory. All labels, categories, types, and formalisms are represented as **data values**, not schema. This allows researchers working in different theoretical frameworks to use the same schema to represent their annotations.

> A part-of-speech tag is stored as a string value (e.g., `"NOUN"`, `"V_TRANS"`, `"PART_SPEECH"`) with an optional `typeUri` pointing to an authority record. The schema does not privilege one tagset (Penn Treebank, Universal Dependencies, EAGLES) over another.

### 2. Abstract and Modular

Rather than defining dozens of specialized record types (OneRecord for POS tagging, AnotherRecord for NER, ThirdRecord for SRL), Layers defines a **single annotation type** discriminated by enumerated `kind` and `subkind` fields. All annotation logic flows through the same schema, reducing duplication and making composition transparent.

> A token-level POS tag, a span-level named entity, and a sentence-level sentiment annotation all use the same `pub.layers.annotation.annotation` record type, differing only in `kind` ("token", "span", "sentence"), `subkind` ("pos-tag", "named-entity", "sentiment"), and their anchors.

### 3. Stand-Off Architecture

Annotations never modify source text or assume a mutable document. Instead, annotations **reference source by offset, UUID, or temporal span**. This ensures source data remains immutable and annotations can accumulate, contradict, and coexist without conflicts.

> A token annotation references its source via an anchor specifying text offsets `{start: 45, end: 52}` in a source document. A revision to the source document gets a new UUID; annotations can track both the source UUID and the offsets for robustness.

### 4. Recursive Composition

Annotations can reference other annotations across layers and records. This allows **layered analysis**: part-of-speech tags reference tokens, syntactic constituents reference tokens and other constituents, semantic role annotations reference constituents, etc.

> A semantic role annotation can anchor to a syntactic constituent (itself an annotation) rather than directly to text. If the constituent boundaries change (e.g., due to a parse revision), the semantic role annotation remains linked to the constituent, not the text.

### 5. Multimodal Support

Annotations apply to text, audio, video, image, and paged documents through a **polymorphic anchor type**. The same annotation schema works across modalities by switching the anchor kind (textSpan, temporalSpan, spatioTemporalAnchor, pageAnchor, etc.). See the [Multimodal Annotation guide](./guides/multimodal-annotation.md) for practical examples.

> A speech transcription uses temporal anchors `{start: 12.5, end: 15.3}` in seconds; a POS tag in that transcription anchors to the same time span. An image analysis uses spatial anchors `{x: 100, y: 50, width: 200, height: 150}`; a caption annotation anchors the same way.

### 6. Knowledge-Grounded

Every major annotation type includes a `knowledgeRefs` field for linking to external knowledge bases. A named entity annotation can link to a Wikidata entry; a frame label can link to FrameNet; a dependency type can link to a Universal Dependencies authority record. See the [Knowledge Grounding guide](./guides/knowledge-grounding.md) for the full entity grounding workflow.

> A named entity annotation with label "Obama" includes a knowledgeRef to Wikidata Q76 (Barack Hussein Obama). Tools can then resolve the entity to structured data, infer properties, or link to other corpora mentioning the same entity.

### 7. Eprint-Linked

Layers integrates with eprint platforms (including chive.pub, a decentralized eprint service built on ATProto). Annotation datasets and corpus releases are published as eprints; individual annotations can reference back to associated publications. Researchers can find annotation datasets by searching for papers, or browse all annotations on a paper.

> A named entity corpus release is published as an eprint with full metadata (authors, abstract, publication venue). Annotation records link back to the eprint via an `eprintUri`. Researchers can discover the corpus by searching the publication platform.

### 8. Interoperable

Layers uses **W3C Web Annotation selectors** (textQuoteSelector, textPositionSelector, fragmentSelector) for compatibility with at.margin and other Web Annotation clients. At the same time, it is **ATProto-native**, using DIDs, AT-URIs, and records to integrate with the broader ATProto ecosystem.

> An annotation uses both a `textPositionSelector` (for Web Annotation compatibility) and a `tokenRef` (for ATProto integration). Clients can consume it either way.

### 9. Decentralized

All annotation data lives in **user-controlled Personal Data Servers (PDSes)**. There is no central database or authoritative archive. Users publish annotation records to their PDSes; appviews index and search across records from multiple users. If an appview is shut down or deletes its database, no user data is lost.

> A researcher annotates a corpus and publishes annotation records to their PDS. An appview indexes those records and makes them searchable. The researcher retains full ownership and can revoke access, migrate to a different PDS, or delete records at any time.

### 10. Community-Expandable Enums

All enumerated fields use a **dual pattern**: a `fooUri` field pointing to an ATProto record (the canonical reference) and a `foo` string field containing a slug (for human readability and fallback). See [Flexible Enums](#flexible-enums) below for a detailed explanation with examples. Consumers check the URI first; if not recognized, they fall back to the slug. Known values are documented but not enforced.

This allows the community to **mint new values without schema changes**: someone creates a new linguistic category as a knowledge graph node, uses its AT-URI in their annotations, and the schema accommodates it transparently.

> A `kind` field always has a corresponding `kindUri`. Standard values like "token" have known URIs, but anyone can create a new kind node and use its URI. Consumers recognize both standard and custom kinds through the same mechanism.

---

## Primitives

All Layers lexicons are built from a small set of abstract primitives defined in **pub.layers.defs**. These primitives are theory-neutral, composable, and support multimodal annotation.

### objectRef

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

### anchor

Polymorphic attachment point that specifies where an annotation applies. Different anchor kinds support different modalities. See the [Multimodal Annotation guide](./guides/multimodal-annotation.md) for practical examples across text, audio, video, image, and paged documents.

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

### constraint

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

### agentRef

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

### annotationMetadata

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

### temporalExpression

Composable temporal annotation that separates **what time**, **how precise**, and **what role** into independent pieces. Fully subsumes TimeML/ISO-TimeML TIMEX3, OWL-Time, Allen's Interval Algebra, and ISO 8601. See the [Temporal Representation guide](./guides/temporal-representation.md) for full coverage with standards mapping tables.

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

**Temporal relations** between annotations use [`graphEdge`](./lexicons/graph.md) with Allen's 13 interval relations as `edgeType` values: `before`, `after`, `meets`, `met-by`, `overlaps`, `overlapped-by`, `starts`, `started-by`, `during`, `contains`, `finishes`, `finished-by`, `equals`.

**Use cases**:
- Simple date: `{type: "date", value: {instant: "2024-03-15", granularity: "day"}}`
- Vague duration: `{type: "duration", value: {duration: "PT3H"}, modifier: {mod: "approximate"}}`
- Weekly recurrence: `{type: "set", value: {recurrence: "R/P1W"}}`
- Relative time: `{type: "relative", value: {duration: "P3D"}, anchorRef: {localId: "dct_annotation_uuid"}}`
- Document creation time: `{type: "date", value: {instant: "2024-01-15"}, function: "creation-time"}`

### spatialExpression

Composable spatial annotation that separates **what place**, **how precise**, and **what role** into independent pieces. Fully subsumes ISO-Space (ISO 24617-7), SpatialML, GeoJSON, WKT, RCC-8, and W3C spatial selectors. See the [Spatial Representation guide](./guides/spatial-representation.md) for full coverage with standards mapping tables.

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

**Spatial relations** between annotations use [`graphEdge`](./lexicons/graph.md) with RCC-8 topological relations as `edgeType` values: `disconnected`, `externally-connected`, `partially-overlapping`, `tangential-proper-part`, `non-tangential-proper-part`, `tangential-proper-part-inverse`, `non-tangential-proper-part-inverse`, `spatially-equal`. Directional relations: `north-of`, `south-of`, `east-of`, `west-of`, `above`, `below`, `in-front-of`, `behind`, `left-of`, `right-of`. Distance relations: `near`, `far`, `adjacent`.

**Use cases**:
- Pixel bounding box: `{type: "region", value: {bbox: {x: 100, y: 50, width: 200, height: 150}}}`
- Geographic point: `{type: "location", value: {geometry: "POINT(37.7749 -122.4194)", type: "point", crs: "wgs84"}}`
- Approximate location: `{type: "location", value: {geometry: "POINT(48.8566 2.3522)", type: "point", crs: "wgs84"}, modifier: {mod: "approximate"}}`
- WKT polygon: `{type: "region", value: {geometry: "POLYGON((0 0, 100 0, 100 100, 0 100, 0 0))", type: "polygon", geometryFormat: "wkt"}}`
- Relative spatial ref: `{type: "relative", anchorRef: {localId: "landmark_annotation_uuid"}}`

### knowledgeRef

Reference to an external knowledge base (Wikidata, FrameNet, WordNet, etc.). See the [Knowledge Grounding guide](./guides/knowledge-grounding.md) for the full entity grounding workflow and graph integration.

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

### featureMap / feature

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

### alignmentLink

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

### W3C Selectors

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

### Primitives Summary

These primitives recur throughout all Layers lexicons. All record types compose from the same set. featureMap and the [URI+slug pattern](#flexible-enums) allow custom attributes and values without schema changes. W3C selectors provide compatibility with existing annotation ecosystems. The polymorphic anchor supports text, audio, video, image, and paged documents. knowledgeRef links annotations to external KBs and authority records.

For detailed guides on how these primitives work together, see [Temporal Representation](./guides/temporal-representation.md), [Spatial Representation](./guides/spatial-representation.md), [Multimodal Annotation](./guides/multimodal-annotation.md), and [Knowledge Grounding](./guides/knowledge-grounding.md).

---

## Flexible Enums

### The Problem with Fixed Enums

Traditional schema design uses fixed enums to constrain field values:

```typescript
annotation = {
  kindEnum: "token" | "span" | "sentence" | "document"
  // If you need a new kind, update the schema
}
```

This approach fails for a community-driven, decentralized system:

1. **Lock-in**: New kinds require schema changes, coordination, and versioning.
2. **Incompleteness**: No single enum covers all use cases across all linguistic theories.
3. **Fragility**: Tools that see an unknown kind either fail or ignore it.
4. **Authority**: No single entity can control value assignment in a decentralized system.

### The Solution: URI + Slug Pattern

Layers solves this with a **dual pattern** for every enumerated field:

```typescript
annotation = {
  // Canonical reference: AT-URI to a knowledge graph node
  kindUri?: string              // e.g., "at://did:plc:layers/kinds/token"

  // Fallback slug: human-readable string with known values documented
  kind: string                  // e.g., "token", "span", "custom-kind"
}
```

**How it works**:

1. **Producers** (tools creating annotations) can use either:
   - Standard `kindUri` + `kind` (e.g., `kindUri: "at://did:plc:layers/kinds/token"`, `kind: "token"`)
   - Custom `kindUri` pointing to their own knowledge graph node (e.g., `kindUri: "at://did:plc:my-theory/kinds/noun-phrase"`, `kind: "noun-phrase"`)

2. **Consumers** (tools reading annotations) check in order:
   - Is `kindUri` recognized? Use it (canonical source of truth).
   - Unknown `kindUri`? Fall back to `kind` slug (best effort).
   - Unknown `kind`? Skip or warn; do not fail.

3. **Documentation** lists known values as `knownValues`, but does not enforce them:

```typescript
annotation = {
  kindUri?: string  // @uri
  kind: string      // knownValues: "token" | "span" | "sentence" | "document"
}
```

### Examples

#### Standard Kind (Built-in)

```json
{
  "kindUri": "at://did:plc:layers/kinds/token",
  "kind": "token"
}
```

#### Custom Kind (User-Defined)

A linguist working in Montague semantics creates their own kind:

```json
{
  "kindUri": "at://did:plc:my-montague-theory/kinds/intensional-object",
  "kind": "intensional-object"
}
```

Tools that recognize the URI handle it accordingly. Tools that don't understand Montague semantics fall back to the slug (best effort) or skip.

#### Tag Sets

The same pattern applies to tag sets. A POS tagger trained on Penn Treebank uses:

```json
{
  "typeUri": "at://did:plc:ptb/pos-tags",
  "type": "NN",
  "tagSetUri": "at://did:plc:ptb",
  "tagSet": "penn-treebank"
}
```

A different tagger trained on Universal Dependencies uses:

```json
{
  "typeUri": "at://did:plc:ud/pos-tags",
  "type": "NOUN",
  "tagSetUri": "at://did:plc:ud",
  "tagSet": "universal-dependencies"
}
```

Both are valid; no schema conflict.

### Extensibility Without Coordination

The result is bottom-up extensibility without coordination:

1. Anyone can create a knowledge graph node for a new kind, tag set, or category.
2. Use its AT-URI in their annotations.
3. Publish the annotations to their PDS.
4. Other tools either recognize the URI or gracefully degrade.
5. Over time, popular new values get documented and added to `knownValues` (if desired).

This avoids central authority over value assignment, eliminates schema versioning for new values, and prevents breaking changes to existing consumers.

### Downside: Ambiguity and Noise

The cost is potential ambiguity: the same linguistic concept might be represented with multiple URIs (e.g., "noun" in 5 different frameworks). Consumers must:

- Implement KB linking to resolve concepts across URIs.
- Tolerate incomplete understanding (some annotations are richer than others).
- Use appviews or indexes to cluster semantically equivalent annotations.

This ambiguity is an expected consequence of supporting multiple linguistic theories and practices simultaneously.

### Reference Semantics

For machines to understand when two `kind` values are semantically equivalent, they should use **knowledge graph linking**:

- Each knowledge graph node for a kind (e.g., "token", "noun") links to external KBs (Wikidata, linguistic ontologies).
- Tools can compare URIs or follow `knowledgeRef` links to determine equivalence.
- A `knowledgeRef` on an annotation explicitly grounds it in external authority:

```json
{
  "kindUri": "at://did:plc:my-theory/kinds/token",
  "kind": "token",
  "knowledgeRefs": [
    {
      "source": "wikidata",
      "identifier": "Q2716717",  // Lexical token (Wikidata concept)
      "uri": "https://www.wikidata.org/entity/Q2716717"
    }
  ]
}
```

### Pattern Across All Lexicons

This pattern is systematic across Layers:

| Field | URI Field | Slug Field | Known Values |
|-------|-----------|-----------|---------------|
| kind | kindUri | kind | "token", "span", "sentence", "document" |
| type | typeUri | type | Depends on context (POS, entity type, etc.) |
| format | formatUri | format | "json", "xml", "text", "binary" |
| role | roleUri | role | "agent", "patient", "theme", ... |

Consumers should handle both fields transparently; producers should populate at least the slug.

### Implementation Guidance

#### For Schema Tools

When generating types from Layers lexicons, represent this pattern:

```typescript
// TypeScript
export interface Annotation {
  kindUri?: string;  // @uri
  kind: string;  // @knownValues ["token", "span", "sentence", "document"]
}

// JSON Schema
{
  "type": "object",
  "properties": {
    "kindUri": {"type": "string", "format": "uri"},
    "kind": {"type": "string", "enum": ["token", "span", "sentence", "document"]}
  },
  "required": ["kind"]
}
```

Note: The enum is documentation, not validation. Unknown `kind` values should not cause validation failure.

#### For Applications

```typescript
// Pseudo-code
function resolveKind(annotation: Annotation): KindDefinition {
  if (annotation.kindUri) {
    try {
      return lookupKindUri(annotation.kindUri);
    } catch (e) {
      // Fall back to slug
    }
  }

  // Resolve slug
  const knownKinds = {...};
  return knownKinds[annotation.kind] || UnknownKind;
}
```
