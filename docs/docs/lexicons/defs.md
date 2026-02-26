---
sidebar_label: "Defs"
---

# pub.layers.defs

Shared definitions for the Layers lexicons. Provides abstract anchoring primitives, W3C Web Annotation-compatible selectors (for at.margin/Semble interoperability), alignment links, and universal metadata types.

## Types

### uuid
**Type:** Object

A universally unique identifier for cross-referencing annotation objects.

| Field | Type | Description |
|-------|------|-------------|
| `value` | string | The UUID string value. |

### span
**Type:** Object

A contiguous span of text defined by character offsets into a source text.

| Field | Type | Description |
|-------|------|-------------|
| `start` | integer | Inclusive start character offset (0-indexed). |
| `ending` | integer | Exclusive end character offset. |

### tokenRef
**Type:** Object

A reference to a specific token within a tokenization, by index.

| Field | Type | Description |
|-------|------|-------------|
| `tokenizationId` | ref | UUID of the tokenization containing the referenced token. Ref: `#uuid` |
| `tokenIndex` | integer | 0-based index of the token within its tokenization. |

### tokenRefSequence
**Type:** Object

A sequence of token references, possibly non-contiguous, within a single tokenization.

| Field | Type | Description |
|-------|------|-------------|
| `tokenizationId` | ref | UUID of the tokenization containing the referenced tokens. Ref: `#uuid` |
| `tokenIndexes` | array | 0-based indices of the tokens. |
| `anchorTokenIndex` | integer | Optional head/anchor token index within the sequence. |

### temporalSpan
**Type:** Object

A temporal span within a media source, defined by start and end times in milliseconds.

| Field | Type | Description |
|-------|------|-------------|
| `start` | integer | Start time in milliseconds. |
| `ending` | integer | End time in milliseconds. |

### boundingBox
**Type:** Object

A spatial bounding box for image or video frame annotation.

| Field | Type | Description |
|-------|------|-------------|
| `x` | integer | X coordinate of top-left corner in pixels. |
| `y` | integer | Y coordinate of top-left corner in pixels. |
| `width` | integer | Width in pixels. |
| `height` | integer | Height in pixels. |

### spatioTemporalAnchor
**Type:** Object

Combined spatial and temporal anchor for video annotation with keyframe-based tracking.

| Field | Type | Description |
|-------|------|-------------|
| `temporalSpan` | ref | Ref: `#temporalSpan` |
| `keyframes` | array | Keyframes defining spatial positions at specific times. Array of ref: `#keyframe` |
| `interpolationUri` | at-uri | AT-URI of the interpolation mode definition node. Community-expandable via knowledge graph. |
| `interpolation` | string | Interpolation mode slug (fallback when interpolationUri unavailable). Known values: `linear`, `step`, `cubic` |

### keyframe
**Type:** Object

A spatial annotation at a specific time point.

| Field | Type | Description |
|-------|------|-------------|
| `timeMs` | integer | Time in milliseconds. |
| `bbox` | ref | Ref: `#boundingBox` |
| `features` | ref | Per-keyframe features (e.g., visibility, occlusion percentage, confidence, pose data). Ref: `#featureMap` |

### temporalEntity
**Type:** Object

A normalized temporal value representing a point, interval, duration, or uncertain range in calendar/clock time. Subsumes OWL-Time `TemporalEntity` (Instant, Interval, Duration) and TimeML TIMEX3 `value`. Consumers dispatch on which fields are populated: `instant` only (point), `intervalStart`+`intervalEnd` (bounded interval), `duration` only (pure duration), `earliest`+`latest` (uncertain bounds), `recurrence` (repeating pattern).

| Field | Type | Description |
|-------|------|-------------|
| `instant` | string | Point in time as ISO 8601 datetime (e.g., `2024-03-15`, `2024-03-15T14:30:00Z`). Maps to OWL-Time Instant. |
| `intervalStart` | string | Interval start as ISO 8601 datetime. Maps to OWL-Time `hasBeginning`. |
| `intervalEnd` | string | Interval end as ISO 8601 datetime. Maps to OWL-Time `hasEnd`. |
| `duration` | string | ISO 8601 duration (e.g., `P3Y`, `PT2H30M`, `P1DT12H`). Maps to OWL-Time `hasTemporalDuration`. |
| `earliest` | string | Lower bound for uncertain or vague times, as ISO 8601 datetime. |
| `latest` | string | Upper bound for uncertain or vague times, as ISO 8601 datetime. |
| `granularityUri` | at-uri | AT-URI of the granularity definition node. Community-expandable. |
| `granularity` | string | Temporal granularity. Maps to OWL-Time `unitType`. Known values: `millennium`, `century`, `decade`, `year`, `quarter`, `month`, `week`, `day`, `hour`, `minute`, `second`, `millisecond`, `custom` |
| `calendarUri` | at-uri | AT-URI of the calendar system definition node. Community-expandable. |
| `calendar` | string | Calendar system. Maps to OWL-Time TRS. Known values: `gregorian`, `julian`, `hijri`, `hebrew`, `iso-week`, `unix`, `japanese-imperial`, `buddhist`, `coptic`, `custom` |
| `recurrence` | string | ISO 8601 repeating interval (e.g., `R/P1W` for weekly, `R5/P1D` for 5 daily repetitions). |
| `features` | ref | Ref: `#featureMap` |

### temporalModifier
**Type:** Object

Qualitative modification of a temporal value. Subsumes TimeML TIMEX3 `mod` attribute.

| Field | Type | Description |
|-------|------|-------------|
| `modUri` | at-uri | AT-URI of the temporal modifier definition node. Community-expandable. |
| `mod` | string | Temporal modifier. Maps to TimeML TIMEX3 `mod`. Known values: `approximate`, `early`, `mid`, `late`, `start`, `end`, `before`, `after`, `on-or-before`, `on-or-after`, `less-than`, `more-than`, `custom` |
| `features` | ref | Ref: `#featureMap` |

### temporalExpression
**Type:** Object

A complete temporal annotation packaging the expression type, normalized value, modifier, anchoring, and document function. Subsumes the full TimeML TIMEX3 tag and OWL-Time `GeneralDateTimeDescription`. Attach to annotation objects via the `temporal` field.

| Field | Type | Description |
|-------|------|-------------|
| `typeUri` | at-uri | AT-URI of the temporal expression type definition node. Community-expandable. |
| `type` | string | Temporal expression type. Maps to TimeML TIMEX3 `type`. Known values: `date`, `time`, `duration`, `set`, `interval`, `relative`, `custom` |
| `value` | ref | The normalized temporal value. Ref: `#temporalEntity` |
| `modifier` | ref | Qualitative modifier (approximate, early, late, etc.). Ref: `#temporalModifier` |
| `anchorRef` | ref | What this expression is relative to (document creation time, another temporal expression, a situation). Maps to TimeML `anchorTimeID`. Ref: `#objectRef` |
| `functionUri` | at-uri | AT-URI of the document function definition node. Community-expandable. |
| `function` | string | Document function. Maps to TimeML `functionInDocument`. Known values: `creation-time`, `publication-time`, `expiration-time`, `modification-time`, `release-time`, `reception-time`, `none`, `custom` |
| `features` | ref | Ref: `#featureMap` |

### spatialEntity
**Type:** Object

A normalized spatial value representing a point, region, line, or complex geometry. Parallel to `temporalEntity`. Subsumes GeoJSON geometry types, WKT primitives, and ISO 19107 spatial schema. Consumers dispatch on which fields are populated: `bbox` only (pixel bounding box), `geometry`+`type` (parsed geometry string), `geometry`+`geometryFormat` (format-specific parsing).

| Field | Type | Description |
|-------|------|-------------|
| `bbox` | ref | Structured pixel bounding box (axis-aligned rectangle). The most common case for image/video annotation. Ref: `#boundingBox` |
| `geometry` | string | Geometry as a string in the format specified by `geometryFormat`. WKT examples: `POINT(37.7749 -122.4194)`, `POLYGON((0 0, 100 0, 100 100, 0 100, 0 0))`. Default format is WKT. |
| `typeUri` | at-uri | AT-URI of the geometry type definition node. Community-expandable. |
| `type` | string | Geometry type slug for dispatch without parsing. Known values: `point`, `box`, `polygon`, `multi-polygon`, `line-string`, `multi-line-string`, `circle`, `ellipse`, `multi-point`, `geometry-collection`, `custom` |
| `geometryFormatUri` | at-uri | AT-URI of the geometry format definition node. Community-expandable. |
| `geometryFormat` | string | Format of the geometry string. Default is WKT. Known values: `wkt`, `geojson`, `svg-path`, `coco-polygon`, `coco-rle`, `custom` |
| `crsUri` | at-uri | AT-URI of the coordinate reference system definition node. Community-expandable. |
| `crs` | string | Coordinate reference system. Known values: `pixel`, `percentage`, `wgs84`, `web-mercator`, `custom` |
| `dimensions` | integer | Number of coordinate dimensions (2 for planar, 3 for volumetric/elevation). |
| `uncertainty` | string | Spatial precision or uncertainty radius as string with units (e.g., `50m`, `10px`, `0.001deg`). |
| `features` | ref | Ref: `#featureMap` |

### spatialModifier
**Type:** Object

Qualitative modification of a spatial value. Parallel to `temporalModifier`. Indicates precision, derivation method, or processing applied to a spatial entity.

| Field | Type | Description |
|-------|------|-------------|
| `modUri` | at-uri | AT-URI of the spatial modifier definition node. Community-expandable. |
| `mod` | string | Spatial modifier. Known values: `approximate`, `projected`, `interpolated`, `estimated`, `buffered`, `simplified`, `generalized`, `custom` |
| `features` | ref | Ref: `#featureMap` |

### spatialExpression
**Type:** Object

A complete spatial annotation packaging the expression type, normalized value, modifier, anchoring, and document function. Parallel to `temporalExpression`. Subsumes ISO-Space place annotations (ISO 24617-7), SpatialML PLACE elements, and general spatial semantic annotation. Attach to annotation objects via the `spatial` field.

| Field | Type | Description |
|-------|------|-------------|
| `typeUri` | at-uri | AT-URI of the spatial expression type definition node. Community-expandable. |
| `type` | string | Spatial expression type. Maps to ISO-Space spatial entity types. Known values: `location`, `region`, `path`, `direction`, `distance`, `relative`, `custom` |
| `value` | ref | The normalized spatial value. Ref: `#spatialEntity` |
| `modifier` | ref | Qualitative modifier (approximate, projected, interpolated, etc.). Ref: `#spatialModifier` |
| `anchorRef` | ref | What this expression is relative to (a landmark, reference location, trajector). For relative spatial expressions. Ref: `#objectRef` |
| `functionUri` | at-uri | AT-URI of the document function definition node. Community-expandable. |
| `function` | string | Document function. What role this place plays in the document. Known values: `document-location`, `publication-location`, `situation-location`, `origin`, `destination`, `waypoint`, `none`, `custom` |
| `features` | ref | Ref: `#featureMap` |

### pageAnchor
**Type:** Object

Anchor to a specific page and region in a paged document (PDF, etc.). Compatible with page-level annotation models used by publication platforms.

| Field | Type | Description |
|-------|------|-------------|
| `page` | integer | 0-indexed page number. |
| `boundingBox` | ref | Ref: `#boundingBox` |
| `textSpan` | ref | Character offsets within the page text. Ref: `#span` |

### textQuoteSelector
**Type:** Object

W3C TextQuoteSelector: select text by quoting it with surrounding context. Compatible with at.margin.annotation and the W3C Web Annotation Data Model.

| Field | Type | Description |
|-------|------|-------------|
| `exact` | string | The exact text to match. |
| `prefix` | string | Text immediately before the selection. |
| `suffix` | string | Text immediately after the selection. |

### textPositionSelector
**Type:** Object

W3C TextPositionSelector: select by character offsets. Semantically equivalent to pub.layers.defs#span but named for W3C compatibility with at.margin.

| Field | Type | Description |
|-------|------|-------------|
| `start` | integer | Starting character position (0-indexed, inclusive). |
| `end` | integer | Ending character position (exclusive). |

### fragmentSelector
**Type:** Object

W3C FragmentSelector: select by URI fragment identifier.

| Field | Type | Description |
|-------|------|-------------|
| `value` | string | Fragment identifier value. |
| `conformsTo` | uri | Specification the fragment conforms to. |

### externalTarget
**Type:** Object

Target for annotating external resources (web pages, documents, etc.). Compatible with at.margin's target model and the W3C Web Annotation Data Model.

| Field | Type | Description |
|-------|------|-------------|
| `source` | uri | The URI of the external resource being annotated. |
| `sourceHash` | string | SHA256 hash of normalized URI for indexing. |
| `title` | string | Title of the resource at annotation time. |
| `selector` | union | W3C selector for identifying the specific segment within the resource. Union of refs: `#textQuoteSelector`, `#textPositionSelector`, `#fragmentSelector` |

### anchor
**Type:** Object

Abstract anchor: how an annotation attaches to its source data. This is a polymorphic type; at least one anchoring field should be present. Consumers dispatch on which field(s) are populated.

| Field | Type | Description |
|-------|------|-------------|
| `textSpan` | ref | Character-offset span in the expression text. Ref: `#span` |
| `tokenRef` | ref | Single token reference. Ref: `#tokenRef` |
| `tokenRefSequence` | ref | Sequence of token references (possibly non-contiguous). Ref: `#tokenRefSequence` |
| `temporalSpan` | ref | Temporal span in audio/video. Ref: `#temporalSpan` |
| `spatioTemporalAnchor` | ref | Spatio-temporal region in video. Ref: `#spatioTemporalAnchor` |
| `pageAnchor` | ref | Page and region in a paged document. Ref: `#pageAnchor` |
| `externalTarget` | ref | External resource target (web page, document, etc.). Ref: `#externalTarget` |

### alignmentLink
**Type:** Object

A single link in an alignment between two parallel sequences. Maps element(s) in a source sequence to element(s) in a target sequence. Supports many-to-many correspondence for interlinear glossing, parallel text alignment, cross-tokenization mapping, etc.

| Field | Type | Description |
|-------|------|-------------|
| `sourceIndices` | array | Indices into the source sequence. Array of integers |
| `targetIndices` | array | Indices into the target sequence. Array of integers |
| `confidence` | integer | Alignment confidence 0-10000. |
| `label` | string | Optional label for the alignment link (e.g., alignment type). |
| `knowledgeRefs` | array | Knowledge graph references for this link. Array of ref: `#knowledgeRef` |
| `features` | ref | Ref: `#featureMap` |

### agentRef
**Type:** Object

A composable reference to any agent (human annotator, ML model, crowd worker, expert panel, etc.) that produced data. Separates the identity of the producer from the interpretive framework (persona) and the software used (tool).

| Field | Type | Description |
|-------|------|-------------|
| `did` | did | ATProto DID of the agent, if the agent has one. |
| `id` | string | Arbitrary string identifier (anonymized crowdworker ID, platform username, model version string, etc.). |
| `name` | string | Human-readable display name for the agent. |
| `knowledgeRef` | ref | External knowledge graph reference for the agent (e.g., ORCID for a human, HuggingFace model card for an ML model, Wikidata for an organization). Ref: `#knowledgeRef` |

### annotationMetadata
**Type:** Object

Metadata about who or what produced an annotation, when, and with what confidence. The three key provenance fields are: agent (who did it), personaRef (under what framework), and tool (with what software).

| Field | Type | Description |
|-------|------|-------------|
| `agent` | ref | The agent (human or model) that produced this annotation. Distinct from personaRef and tool. Ref: `#agentRef` |
| `tool` | string | Name or identifier of the software tool used to produce this annotation (e.g., 'spaCy 3.7', 'brat 1.3', 'ELAN 6.4'). |
| `timestamp` | datetime | When the annotation was produced. |
| `confidence` | integer | Confidence score scaled 0-10000. 10000 = maximum confidence. |
| `personaRef` | at-uri | Reference to the persona/annotation framework under which this annotation was produced. |
| `digest` | string | Content hash for integrity verification. |
| `dependencies` | array | References to upstream records this annotation was derived from (provenance chain). Array of ref: `#objectRef` |

### knowledgeRef
**Type:** Object

A reference to an external knowledge base entry. Supports ATProto-native knowledge bases (e.g., chive.pub, with AT-URI nodes), non-ATProto knowledge bases (e.g., Wikidata, FrameNet), and user/persona-specific knowledge bases in user PDSes.

| Field | Type | Description |
|-------|------|-------------|
| `sourceUri` | at-uri | AT-URI of the knowledge base type definition node. Community-expandable via knowledge graph. |
| `source` | string | Knowledge base source slug (fallback when sourceUri unavailable). Known values: `chive.pub`, `wikidata`, `wordnet`, `framenet`, `propbank`, `verbnet`, `unimorph`, `glottolog`, `cldr`, `custom` |
| `identifier` | string | The identifier within the knowledge base (e.g., Wikidata QID, chive.pub node URI, Glottolog languoid ID). |
| `uri` | uri | Optional full URI for the knowledge base entry. |
| `label` | string | Human-readable label for the referenced entity. |

### featureMap
**Type:** Object

An open-ended set of typed key-value features that can be attached to any annotation. Provides maximum extensibility without committing to any label set or linguistic theory.

| Field | Type | Description |
|-------|------|-------------|
| `entries` | array | The feature entries. Array of ref: `#feature` |

### feature
**Type:** Object

A single key-value feature.

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Feature name/key. |
| `value` | string | Feature value as string. Consumers may parse typed values based on the key's semantics. |

### constraint
**Type:** Object

An abstract constraint expression. Used for type constraints on role slots, slot-level constraints in templates, cross-slot agreement constraints, and any other declarative restriction. The expression field holds a DSL string whose format is identified by expressionFormat/expressionFormatUri.

| Field | Type | Description |
|-------|------|-------------|
| `expression` | string | The constraint expression (e.g., 'self.pos == "VERB"', 'subject.features.number == verb.features.number'). |
| `expressionFormatUri` | at-uri | AT-URI of the expression format definition node. Community-expandable via knowledge graph. |
| `expressionFormat` | string | Expression format slug (fallback when expressionFormatUri unavailable). Known values: `python-expr`, `json-logic`, `regex`, `sparql-filter`, `type-ref`, `custom` |
| `scopeUri` | at-uri | AT-URI of the scope definition node. Community-expandable via knowledge graph. |
| `scope` | string | Constraint scope slug (fallback when scopeUri unavailable). Known values: `slot`, `template`, `cross-template`, `global` |
| `context` | array | Names of the slots or variables this constraint ranges over (for cross-slot and cross-template constraints). Array of strings |
| `description` | string | Human-readable description of the constraint. |

### objectRef
**Type:** Object

A composable reference to any Layers object, whether local (same record, by UUID), remote (different record, by AT-URI + optional object UUID), or external (knowledge graph entry). This is the universal cross-referencing primitive; consumers dispatch on which field(s) are populated.

| Field | Type | Description |
|-------|------|-------------|
| `localId` | ref | UUID of an object within the same record. Ref: `#uuid` |
| `recordRef` | at-uri | AT-URI of a Layers record in another user's PDS or another record in the same PDS. |
| `objectId` | ref | UUID of a specific object within the record referenced by recordRef. Ref: `#uuid` |
| `knowledgeRef` | ref | Reference to an external knowledge graph node (Wikidata, chive.pub, FrameNet, etc.). Ref: `#knowledgeRef` |
