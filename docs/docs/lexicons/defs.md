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

A contiguous span of text defined by UTF-8 byte offsets into a source text.

| Field | Type | Description |
|-------|------|-------------|
| `byteStart` | integer | Inclusive start byte offset (0-indexed). |
| `byteEnd` | integer | Exclusive end byte offset. |
| `charStart` | integer | Optional inclusive start character offset (0-indexed). |
| `charEnd` | integer | Optional exclusive end character offset. |

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

A temporal span within a media source, defined by start and end times. Times are signed and session-relative: they may be negative when a stream began before the session clock origin (per BIDS `StartTime`). `start` and `ending` remain required; the nanosecond fields, when present, are authoritative over the millisecond fields.

| Field | Type | Description |
|-------|------|-------------|
| `start` | integer | Start time in milliseconds, signed and session-relative (may be negative when it precedes the clock origin). |
| `ending` | integer | End time in milliseconds, signed and session-relative. |
| `startNanos` | integer | Exact signed start in nanoseconds, session-relative; authoritative over `start` where both are present. |
| `endingNanos` | integer | Exact signed end in nanoseconds, session-relative; authoritative over `ending` where both are present. |
| `scope` | ref | Which medium, session clock, stream, and track this span is measured against. Absent means the single medium reachable from the annotated expression. Ref: `#mediaScope` |

### boundingBox
**Type:** Object

A spatial bounding box for image or video frame annotation.

| Field | Type | Description |
|-------|------|-------------|
| `x` | integer | X coordinate of top-left corner in pixels. |
| `y` | integer | Y coordinate of top-left corner in pixels. |
| `width` | integer | Width in pixels. |
| `height` | integer | Height in pixels. |
| `unitUri` | at-uri | AT-URI of the coordinate unit definition node (a `unit` typeDef under `layers-core.ontology.layers.pub`). Community-expandable via knowledge graph. |
| `unit` | string | Coordinate unit slug (fallback when `unitUri` unavailable). Absent means pixel. Known values: `pixel`, `per-mille-normalized` |
| `scope` | ref | Which medium, session clock, stream, and track this box is measured against. Absent means the single medium reachable from the annotated expression. Ref: `#mediaScope` |
| `page` | integer | 0-indexed page this box lies on, for paged media. |
| `frameIndex` | integer | 0-indexed frame this box lies on, for framed media. |
| `timeNanos` | integer | Signed time in nanoseconds, session-relative, at which this box applies. |

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
| `geometryFormat` | string | Format of the geometry string. Default is WKT. Known values: `wkt`, `geojson`, `svg-path`, `coco-polygon`, `coco-rle`, `page-xml-coords`, `alto-polygon`, `custom` |
| `crsUri` | at-uri | AT-URI of the coordinate reference system definition node. Community-expandable. |
| `crs` | string | Coordinate reference system. Determines how coordinates in `geometry`/`bbox` are read. Known values: `pixel`, `percentage`, `wgs84`, `web-mercator`, `per-mille-normalized`, `mni152-nlin-2009c`, `mni305`, `talairach`, `acpc`, `scanner-ras`, `fsaverage`, `individual-t1`, `voxel-index`, `world-metric`, `custom` |
| `dimensions` | integer | Number of coordinate dimensions (2 for planar, 3 for volumetric/elevation). |
| `uncertainty` | string | Spatial precision or uncertainty radius as string with units (e.g., `50m`, `10px`, `0.001deg`). |
| `scope` | ref | Which medium, session clock, stream, and track this region is measured against. Absent means the single medium reachable from the annotated expression. Ref: `#mediaScope` |
| `page` | integer | 0-indexed page this region lies on, for paged media. |
| `frameIndex` | integer | 0-indexed frame this region lies on, for framed media. |
| `timeNanos` | integer | Signed time in nanoseconds, session-relative, at which this region applies. |
| `readingOrder` | integer | 0-indexed reading order of this region among sibling regions on the same page or surface. |
| `roleUri` | at-uri | AT-URI of the spatial-region role definition node (a `role` typeDef under `layers-annotation.ontology.layers.pub`). Community-expandable. |
| `role` | string | Spatial-region role slug (fallback when `roleUri` unavailable), naming what layout or anatomical part this region is. Known values: `text-region`, `text-line`, `baseline`, `word`, `glyph`, `column`, `margin-note`, `figure`, `table`, `instance-mask`, `interest-area`, `articulator-contour`, `region-of-interest`, `custom` |
| `articulatorUri` | at-uri | AT-URI of the articulator definition node (an `articulator` typeDef under `layers-annotation.ontology.layers.pub`). Community-expandable. |
| `articulator` | string | Articulator slug (fallback when `articulatorUri` unavailable), naming the body part this region tracks. Known values: `dominant-hand`, `non-dominant-hand`, `both-hands`, `head`, `torso`, `face`, `eyebrows`, `mouth`, `eye-gaze`, `tongue`, `lips`, `jaw`, `velum`, `custom` |
| `maskMediaRef` | at-uri | AT-URI of a `pub.layers.media.media` record carrying a pixel or voxel mask for this region. |
| `parcelRef` | ref | Reference to an atlas parcel grounding this region (e.g., an Uberon or atlas node). Ref: `#knowledgeRef` |
| `sensors` | array | Sensors whose positions define this region; each `objectRef` has `recordRef` the media record and `objectId` a `sensorSpec` uuid. Array of ref: `#objectRef` |
| `features` | ref | Ref: `#featureMap` |

This same type doubles as an anchor when it appears under `anchor.spatialRegion`: the alias keeps anchor-use distinct from the `annotation.spatial` content-use of the type. The stereotaxic `crs` values (`mni152-nlin-2009c`, `talairach`, `scanner-ras`, `voxel-index`, and the rest) and the `articulator` vocabulary are what let a single spatial type carry a brain parcel, a manuscript text-line, and a signing hand without a bespoke shape for each.

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

W3C TextPositionSelector: select by UTF-8 byte offsets. Semantically equivalent to pub.layers.defs#span but named for W3C compatibility with at.margin.

| Field | Type | Description |
|-------|------|-------------|
| `byteStart` | integer | Starting byte position (0-indexed, inclusive). |
| `byteEnd` | integer | Ending byte position (exclusive). |
| `charStart` | integer | Optional starting character position (0-indexed, inclusive). |
| `charEnd` | integer | Optional ending character position (exclusive). |

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

Abstract anchor: how an annotation attaches to its source data. This is a polymorphic type; at least one anchoring field should be present. Consumers dispatch on which field(s) are populated. The union carries ten members: `textSpan`, `tokenRef`, `tokenRefSequence`, `temporalSpan`, `spatioTemporalAnchor`, `pageAnchor`, `externalTarget`, `boundingBox`, `spatialRegion`, and `signalSpan`.

| Field | Type | Description |
|-------|------|-------------|
| `textSpan` | ref | Character-offset span in the expression text. Ref: `#span` |
| `tokenRef` | ref | Single token reference. Ref: `#tokenRef` |
| `tokenRefSequence` | ref | Sequence of token references (possibly non-contiguous). Ref: `#tokenRefSequence` |
| `temporalSpan` | ref | Temporal span in audio/video. Ref: `#temporalSpan` |
| `spatioTemporalAnchor` | ref | Spatio-temporal region in video. Ref: `#spatioTemporalAnchor` |
| `pageAnchor` | ref | Page and region in a paged document. Ref: `#pageAnchor` |
| `externalTarget` | ref | External resource target (web page, document, etc.). Ref: `#externalTarget` |
| `boundingBox` | ref | Static spatial region in an image or single frame. Imposes no temporal span; for a region that tracks over time use `spatioTemporalAnchor`. Ref: `#boundingBox` |
| `spatialRegion` | ref | Normalized spatial region used as an anchor (aliased so anchor-use is distinct from the `annotation.spatial` content-use of the same type). Ref: `#spatialEntity` |
| `signalSpan` | ref | Sample-indexed or time-indexed span over one or more channels of a continuous signal (EEG, MEG, audio waveform, sensor stream, etc.). Ref: `#signalSpan` |

The `boundingBox`, `spatialRegion`, and `signalSpan` members are additive to a writer (the union has no `required` array) but a silent drop to a reader that has not learned them. Any consumer that dispatches by hand over the anchor union must handle cases for `boundingBox`, `spatialRegion`, and `signalSpan`; the two hand-written dispatch sites in the reference stack are `lairs/media/anchors.py` and `web/components/annotations/registry.tsx`.

### mediaScope
**Type:** Object

Which medium, session clock, stream, and track a temporal, spatial, or signal anchor is measured against. Absent scope on any anchor means the single medium reachable from the annotated expression, which is the single-stream reading of a record with no scope. Present scope is what makes an anchor address one stream of a synchronized, multi-stream acquisition session.

| Field | Type | Description |
|-------|------|-------------|
| `mediaRef` | at-uri | AT-URI of the `pub.layers.media.media` record this anchor addresses. |
| `mediaCid` | cid | CID pinning the exact version of the media record. |
| `sessionRef` | at-uri | AT-URI of the `pub.layers.acquisition.session` whose clock the sample and nanosecond times are on. |
| `stream` | ref | The session stream this anchor is on; `recordRef` is the `sessionRef` and `objectId` is the stream uuid (`acquisition.defs#stream`). Ref: `#objectRef` |
| `trackIndex` | integer | 0-indexed track within the medium (e.g., an audio track or a subtitle track). |

### frequencyBand
**Type:** Object

A frequency band selected by a signal anchor, for time-frequency annotation of neural and physiological data.

| Field | Type | Description |
|-------|------|-------------|
| `bandUri` | at-uri | AT-URI of the frequency band definition node. Community-expandable via knowledge graph. |
| `band` | string | Frequency band slug (fallback when `bandUri` unavailable). Known values: `delta`, `theta`, `alpha`, `mu`, `beta`, `low-gamma`, `high-gamma`, `ripple`, `broadband`, `f0`, `f1`, `f2`, `f3`, `f4`, `custom` |
| `lowMilliHz` | integer | Lower bound of the band in millihertz. |
| `highMilliHz` | integer | Upper bound of the band in millihertz. |

### signalSpan
**Type:** Object

A sample-indexed or time-indexed span over one or more channels of a continuous signal: EEG, MEG, iEEG, an audio waveform, an fNIRS stream, an fMRI run, a sensor trace. An unscoped sample index is meaningless, so `scope` is required. `startSample` and `endSample` are signed (a span may precede the clock origin); `startNanos`/`endingNanos` carry the session-relative clock time, and `startSample` wins where both a sample and a nanosecond start are present. Channels and sensors are addressed by `objectRef` into the media record's `signalChannel`/`sensorSpec` uuids, which is why those carry a required `uuid`.

| Field | Type | Description |
|-------|------|-------------|
| `scope` | ref | Which medium, session clock, stream, and track the sample and nanosecond indices are measured against. Required. Ref: `#mediaScope` |
| `startSample` | integer | Inclusive 0-indexed start sample, signed (may precede the clock origin). |
| `endSample` | integer | Exclusive end sample, signed. |
| `startNanos` | integer | Signed start on the stream or session clock, session-relative and never UTC-epoch. Authoritative when `startSample` is absent; `startSample` wins where both are present. |
| `endingNanos` | integer | Signed end on the stream or session clock, session-relative. |
| `channels` | array | Channels this span covers; each `objectRef` has `recordRef` the media record and `objectId` a `signalChannel` uuid. Empty or absent means all channels. Array of ref: `#objectRef` |
| `channelNames` | array | Advisory channel-name fallback; `channels` wins where both are present. Array of string. |
| `sensors` | array | Sensors this span covers; each `objectRef` has `recordRef` the media record and `objectId` a `sensorSpec` uuid. Array of ref: `#objectRef` |
| `frequencyBand` | ref | Frequency band this span selects, for time-frequency annotation. Ref: `#frequencyBand` |
| `volumeIndexStart` | integer | Inclusive 0-indexed start volume, for volumetric time series (e.g., fMRI runs). |
| `volumeIndexEnd` | integer | Exclusive end volume, for volumetric time series. |
| `epochIndex` | integer | 0-indexed epoch within an epoched signal. |
| `region` | ref | Spatial region this span applies to, reusing the promoted spatial anchor (no separate voxel-region type is introduced). Ref: `#spatialEntity` |

### alignmentLink
**Type:** Object

A single link in an alignment between two parallel sequences. Maps element(s) in a source sequence to element(s) in a target sequence. Supports many-to-many correspondence for interlinear glossing, parallel text alignment, cross-tokenization mapping, etc.

| Field | Type | Description |
|-------|------|-------------|
| `sourceIndices` | array | Indices into the source sequence. Array of integers |
| `targetIndices` | array | Indices into the target sequence. Array of integers |
| `confidence` | integer | Alignment confidence 0-1000. |
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
| `agent` | ref | The agent (human or model) that produced this annotation. Distinct from `personaRef` (the interpretive framework) and `tool` (the software). Ref: `#agentRef` |
| `tool` | string | Name or identifier of the software tool used to produce this annotation (e.g., 'spaCy 3.7', 'brat 1.3', 'ELAN 6.4'). Distinct from `agent` (who ran the tool). Display fallback when `toolRef` is unavailable. Required. |
| `toolRef` | ref | Grounded reference to the software tool, typically via `rrid` (a Research Resource Identifier). Distinct from `agent` (who ran the tool). Ref: `#knowledgeRef` |
| `timestamp` | datetime | When the annotation was produced. |
| `confidence` | integer | Confidence score scaled 0-1000. 1000 = maximum confidence. |
| `personaRef` | at-uri | Reference to the persona/annotation framework under which this annotation was produced. |
| `contentDigest` | ref | Structured content hash for integrity verification of this annotation. Ref: `#contentDigest` |
| `dependencies` | array | References to upstream records this annotation was derived from (provenance chain). Array of ref: `#objectRef` |

The content digest is a structured `contentDigest` object (`{algorithmUri?, algorithm, value}`), so a verifier dispatches on `algorithm` without string-splitting.

### licenseRef
**Type:** Object

Detail for a single license. Follows the URI+slug pattern (`spdxUri` is the canonical knowledge-graph node, `spdx` is the human-readable fallback) and mirrors one entry of a DataCite rightsList (`rightsIdentifier` + `rightsURI`).

| Field | Type | Description |
|-------|------|-------------|
| `spdxUri` | at-uri | AT-URI of the license definition node. Community-expandable via knowledge graph. |
| `spdx` | string | SPDX license identifier (fallback when spdxUri unavailable). Non-SPDX terms use `proprietary` or `custom` and ground the full text via spdxUri/url. Known values: `CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC-BY-NC-4.0`, `CC-BY-NC-SA-4.0`, `CC-BY-ND-4.0`, `CC-BY-NC-ND-4.0`, `MIT`, `Apache-2.0`, `BSD-3-Clause`, `GPL-3.0-only`, `LGPL-3.0-only`, `LDC-User-Agreement`, `ELRA-END-USER`, `proprietary`, `custom` |
| `name` | string | Human-readable license name (e.g., 'Creative Commons Attribution 4.0 International'). |
| `url` | uri | URL of the full license text (DataCite rightsURI). |
| `attribution` | string | Required attribution / credit text for downstream users. |
| `notes` | string | Additional licensing notes, restrictions, or usage terms. |
| `appliesToUri` | at-uri | AT-URI of the license-component definition node (a `license-component` typeDef under `layers-core.ontology.layers.pub`). Community-expandable. |
| `appliesTo` | string | Component this license covers when an artifact mixes licenses by part (fallback when `appliesToUri` unavailable). Omit when the license covers the whole artifact. Known values: `whole`, `annotations`, `underlying-text`, `underlying-media`, `code`, `documentation`, `ontology`, `derived-data`, `custom` |

### licensing
**Type:** Object

Complete licensing terms for a released artifact. Represents single, dual/multi (choose-one), composite (all-apply), exception (WITH), and component-scoped licensing. The SPDX license expression encodes the boolean relationship between licenses; the licenses array carries per-license detail. Mirrors a DataCite rightsList.

| Field | Type | Description |
|-------|------|-------------|
| `expression` | string | SPDX license expression encoding the relationship between licenses: `OR` for dual/multi-licensing (the licensee chooses one), `AND` for composite terms (all apply), `WITH` for exceptions. Examples: `MIT OR Apache-2.0`, `CC-BY-4.0 AND LicenseRef-LDC-User-Agreement`. Optional when a single license applies. |
| `licenses` | array | The individual licenses named by the expression, or the single governing license. Each entry may scope itself to a component via `appliesTo`. Array of ref: `#licenseRef` |

### reproducibilityInfo
**Type:** Object

Information about how to reproduce a dataset or the data produced from an eprint. Shared by data-producing produces (corpus, annotation layers, experiments, catalog collections, acquisition sessions) and eprint data links.

| Field | Type | Description |
|-------|------|-------------|
| `codeUri` | uri | URI of the code repository. |
| `commitHash` | string | Git commit hash for reproducibility. |
| `command` | string | Command to reproduce the data. |
| `environment` | string | Environment specification (Docker image, conda env, etc.). |
| `randomSeed` | integer | Random seed used. |
| `name` | string | Human-readable name of the pipeline, model, or procedure that produced the data. |
| `version` | string | Version string of the pipeline, model, or procedure. |
| `softwareRefs` | array | Grounded references to the software used, typically via `rrid` (Research Resource Identifiers). Array of ref: `#knowledgeRef` |
| `operatingSystem` | string | Operating system the procedure ran on. |
| `container` | object | The container or environment image the procedure ran in: `typeUri` (at-uri); `type` (known values `docker`, `singularity`, `apptainer`, `podman`, `conda`, `nix`, `custom`); `tag`; `uri`; `digest` (ref `#contentDigest`). |
| `funding` | array | Grants or awards that funded the work producing this data. Array of ref: `#fundingRef` |
| `ethicsApprovals` | array | Ethics or IRB approvals covering the work producing this data. Array of ref: `#ethicsApproval` |

### knowledgeRef
**Type:** Object

A reference to an external knowledge base entry. Supports ATProto-native knowledge bases (e.g., chive.pub, with AT-URI nodes), non-ATProto knowledge bases (e.g., Wikidata, FrameNet), and user/persona-specific knowledge bases in user PDSes.

| Field | Type | Description |
|-------|------|-------------|
| `sourceUri` | at-uri | AT-URI of the knowledge base type definition node. Community-expandable via knowledge graph. |
| `source` | string | Knowledge base source slug (fallback when sourceUri unavailable). Known values: `chive.pub`, `wikidata`, `wordnet`, `framenet`, `propbank`, `verbnet`, `unimorph`, `glottolog`, `cldr`, `iso639-3`, `orcid`, `ror`, `openalex`, `crossref`, `dblp`, `semantic-scholar`, `doi`, `handle`, `islrn`, `datacite`, `ldc`, `elra`, `lindat`, `openneuro`, `dandi`, `paradisec`, `talkbank`, `ncbi-taxonomy`, `rrid`, `cognitive-atlas`, `cogpo`, `hed`, `uberon`, `mesh`, `clinicaltrials`, `custom` |
| `identifier` | string | The identifier within the knowledge base (e.g., Wikidata QID, chive.pub node URI, Glottolog languoid ID). |
| `uri` | uri | Optional full URI for the knowledge base entry. |
| `label` | string | Human-readable label for the referenced entity. |

### contentDigest
**Type:** Object

A structured content hash for integrity verification. The algorithm and the value are separate fields, so a verifier dispatches on `algorithm` without string-splitting, and `media.media.contentDigest` can hash externally hosted bytes the record CID does not cover.

| Field | Type | Description |
|-------|------|-------------|
| `algorithmUri` | at-uri | AT-URI of the digest algorithm definition node. Community-expandable via knowledge graph. |
| `algorithm` | string | Digest algorithm slug (fallback when `algorithmUri` unavailable). Known values: `sha256`, `sha512`, `blake3`, `md5`, `custom` |
| `value` | string | The digest as lowercase hexadecimal. |

Required: `algorithm`, `value`.

### fundingRef
**Type:** Object

A grant or award that funded a piece of work. A shared def (not inlined) so acquisition sessions and `reproducibilityInfo` reuse one shape. The funding body grounds through `knowledgeRef` rather than a free-text name.

| Field | Type | Description |
|-------|------|-------------|
| `awardId` | string | Grant or award number. |
| `title` | string | Title of the grant or award. |
| `funderRef` | ref | The funding body, grounded via `ror` or the Crossref Funder Registry. Ref: `#knowledgeRef` |
| `uri` | uri | URI of the award record. |

Required: `awardId`.

### ethicsApproval
**Type:** Object

A human-subjects or animal-care approval. A shared def (not inlined) reused by `acquisition.defs#consent`, `acquisition.session`, and `reproducibilityInfo`. The approving board grounds through `knowledgeRef`.

| Field | Type | Description |
|-------|------|-------------|
| `protocolId` | string | Protocol or approval number. |
| `bodyRef` | ref | The approving board, grounded via `ror`; `clinicaltrials` for a registered trial. Ref: `#knowledgeRef` |
| `bodyName` | string | Advisory name of the approving board; `bodyRef` wins where both are present. |
| `approvedAt` | datetime | When the approval was granted. |
| `expiresAt` | datetime | When the approval expires. |
| `uri` | uri | URI of the approval record. |

Required: `protocolId`.

### languageRef
**Type:** Object

A structured language reference: the richer companion to a bare BCP-47 tag in a `languages` array. Present when a tag alone cannot name the variety (a sub-language variety, a Glottolog languoid, a per-language role in a parallel or bilingual collection). The required key is `tag`, the canonical BCP-47 tag using the shortest ISO 639 code; importers must normalize on write. Each entry's `tag` should also appear in the record's `languages` array so consumers filtering on the cheap array are not silently excluded.

| Field | Type | Description |
|-------|------|-------------|
| `tag` | string | Canonical BCP-47 tag using the shortest ISO 639 code (`en` not `eng`, `fi` not `fin`, `poma` for Pomak). Importers must normalize on write. |
| `languageUri` | at-uri | AT-URI of the language definition node. Community-expandable via knowledge graph. |
| `knowledgeRef` | ref | Grounding of the language, with source `glottolog`, `iso639-3`, or `cldr`. Ref: `#knowledgeRef` |
| `scriptCode` | string | ISO 15924 script code. |
| `regionCode` | string | ISO 3166-1 or UN M.49 region code. |
| `varietyLabel` | string | Prose residue naming the variety after every code applies. |
| `roleUri` | at-uri | AT-URI of the language-role definition node (a `language-role` typeDef under `layers-core.ontology.layers.pub`). Community-expandable. |
| `role` | string | Language-role slug (fallback when `roleUri` unavailable), naming the role this language plays in the record. Known values: `primary`, `source`, `target`, `metalanguage`, `gloss`, `translation`, `contact`, `l1`, `l2`, `heritage`, `simultaneous-bilingual`, `signed-l1`, `signed-l2`, `custom` |

Required: `tag`.

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

### accessCondition
**NSID:** `pub.layers.defs#accessCondition`
**Type:** Object

Conditions under which data may be obtained. Required: `mode`. Distinct from licensing (what a recipient may do) and consent (the person the data came from); all three must hold. Reused by `participant.access`, `session.access`, and `media.media.access`.

| Field | Type | Description |
|-------|------|-------------|
| `modeUri` / `mode` | at-uri / string | Access mode. Known values: `open`, `registration-required`, `agreement-required`, `restricted`, `embargoed`, `closed`. |
| `gatekeeperRef` | ref | The body that grants access, grounded via `ror` or `wikidata`. Ref: `pub.layers.defs#knowledgeRef`. |
| `applicationUri` | uri | URL of the access application or registration form. |
| `agreementUri` | uri | The data use agreement or end-user licence that must be signed. |
| `embargoedUntil` | datetime | When an embargo lifts, when `mode` is `embargoed`. |
| `permittedUseUri` / `permittedUse` | at-uri / string | What the access grant permits, distinct from the licence. Known values: `any`, `research-only`, `non-commercial`, `no-redistribution`, `no-model-training`, `custom`. |
| `notes` | string | Free-text access detail. |

### deviceInfo
**NSID:** `pub.layers.defs#deviceInfo`
**Type:** Object

Acquisition or presentation hardware, structured rather than a free-text device string. Required: `kind`. Manufacturer and product ground through `knowledgeRef` (no vendor enum): MEGIN, Elekta, and Elekta/MEGIN are one organization and must facet as one.

| Field | Type | Description |
|-------|------|-------------|
| `kindUri` / `kind` | at-uri / string | Device kind. Must resolve into the same `modality` node set as `recordingMethod.methodUri` where the two overlap. Known values include `microphone`, `camera`, `scanner`, `eeg-amplifier`, `meg-scanner`, `mri-scanner`, `fnirs-system`, `eye-tracker`, `motion-capture-system`, `articulograph`, `button-box`, `custom`. |
| `manufacturerRef` | ref | Manufacturer, grounded via `ror` or `wikidata`. Ref: `pub.layers.defs#knowledgeRef` |
| `manufacturerName` | string | Display name when no identifier exists. Advisory; `manufacturerRef` wins. |
| `productRef` | ref | The product, grounded via `rrid` where one exists. Ref: `pub.layers.defs#knowledgeRef` |
| `model` | string | BIDS `ManufacturersModelName`. |
| `serialNumber` | string | BIDS `DeviceSerialNumber`. A de-anonymizing quasi-identifier in a single-site study; omit when identifiability is `anonymous`. |
| `software` | ref | Acquisition or presentation software. BIDS `SoftwareVersions`/`GeneratedBy`. Ref: `pub.layers.defs#reproducibilityInfo` |
| `features` | ref | Open-ended device features. Ref: `pub.layers.defs#featureMap` |
