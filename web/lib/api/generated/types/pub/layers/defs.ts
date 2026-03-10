// @ts-nocheck
/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.defs'

/** A universally unique identifier for cross-referencing annotation objects. */
export interface Uuid {
  $type?: 'pub.layers.defs#uuid'
  /** The UUID string value. */
  value: string
}

const hashUuid = 'uuid'

export function isUuid<V>(v: V) {
  return is$typed(v, id, hashUuid)
}

export function validateUuid<V>(v: V) {
  return validate<Uuid & V>(v, id, hashUuid)
}

/** A contiguous span of text defined by character offsets into a source text. */
export interface Span {
  $type?: 'pub.layers.defs#span'
  /** Inclusive start character offset (0-indexed). */
  start: number
  /** Exclusive end character offset. */
  ending: number
}

const hashSpan = 'span'

export function isSpan<V>(v: V) {
  return is$typed(v, id, hashSpan)
}

export function validateSpan<V>(v: V) {
  return validate<Span & V>(v, id, hashSpan)
}

/** A reference to a specific token within a tokenization, by index. */
export interface TokenRef {
  $type?: 'pub.layers.defs#tokenRef'
  tokenizationId: Uuid
  /** 0-based index of the token within its tokenization. */
  tokenIndex: number
}

const hashTokenRef = 'tokenRef'

export function isTokenRef<V>(v: V) {
  return is$typed(v, id, hashTokenRef)
}

export function validateTokenRef<V>(v: V) {
  return validate<TokenRef & V>(v, id, hashTokenRef)
}

/** A sequence of token references, possibly non-contiguous, within a single tokenization. */
export interface TokenRefSequence {
  $type?: 'pub.layers.defs#tokenRefSequence'
  tokenizationId: Uuid
  /** 0-based indices of the tokens. */
  tokenIndexes: number[]
  /** Optional head/anchor token index within the sequence. */
  anchorTokenIndex?: number
}

const hashTokenRefSequence = 'tokenRefSequence'

export function isTokenRefSequence<V>(v: V) {
  return is$typed(v, id, hashTokenRefSequence)
}

export function validateTokenRefSequence<V>(v: V) {
  return validate<TokenRefSequence & V>(v, id, hashTokenRefSequence)
}

/** A temporal span within a media source, defined by start and end times in milliseconds. */
export interface TemporalSpan {
  $type?: 'pub.layers.defs#temporalSpan'
  /** Start time in milliseconds. */
  start: number
  /** End time in milliseconds. */
  ending: number
}

const hashTemporalSpan = 'temporalSpan'

export function isTemporalSpan<V>(v: V) {
  return is$typed(v, id, hashTemporalSpan)
}

export function validateTemporalSpan<V>(v: V) {
  return validate<TemporalSpan & V>(v, id, hashTemporalSpan)
}

/** A spatial bounding box for image or video frame annotation. */
export interface BoundingBox {
  $type?: 'pub.layers.defs#boundingBox'
  /** X coordinate of top-left corner in pixels. */
  x: number
  /** Y coordinate of top-left corner in pixels. */
  y: number
  /** Width in pixels. */
  width: number
  /** Height in pixels. */
  height: number
}

const hashBoundingBox = 'boundingBox'

export function isBoundingBox<V>(v: V) {
  return is$typed(v, id, hashBoundingBox)
}

export function validateBoundingBox<V>(v: V) {
  return validate<BoundingBox & V>(v, id, hashBoundingBox)
}

/** Combined spatial and temporal anchor for video annotation with keyframe-based tracking. */
export interface SpatioTemporalAnchor {
  $type?: 'pub.layers.defs#spatioTemporalAnchor'
  temporalSpan: TemporalSpan
  /** Keyframes defining spatial positions at specific times. */
  keyframes?: Keyframe[]
  /** AT-URI of the interpolation mode definition node. Community-expandable via knowledge graph. */
  interpolationUri?: string
  /** Interpolation mode slug (fallback when interpolationUri unavailable). */
  interpolation?: 'linear' | 'step' | 'cubic' | (string & {})
}

const hashSpatioTemporalAnchor = 'spatioTemporalAnchor'

export function isSpatioTemporalAnchor<V>(v: V) {
  return is$typed(v, id, hashSpatioTemporalAnchor)
}

export function validateSpatioTemporalAnchor<V>(v: V) {
  return validate<SpatioTemporalAnchor & V>(v, id, hashSpatioTemporalAnchor)
}

/** A spatial annotation at a specific time point. */
export interface Keyframe {
  $type?: 'pub.layers.defs#keyframe'
  /** Time in milliseconds. */
  timeMs: number
  bbox: BoundingBox
  features?: FeatureMap
}

const hashKeyframe = 'keyframe'

export function isKeyframe<V>(v: V) {
  return is$typed(v, id, hashKeyframe)
}

export function validateKeyframe<V>(v: V) {
  return validate<Keyframe & V>(v, id, hashKeyframe)
}

/** A normalized temporal value representing a point, interval, duration, or uncertain range in calendar/clock time. Subsumes OWL-Time TemporalEntity (Instant, Interval, Duration) and TimeML TIMEX3 value. Consumers dispatch on which fields are populated: instant only (point), intervalStart+intervalEnd (bounded interval), duration only (pure duration), earliest+latest (uncertain bounds), recurrence (repeating pattern). */
export interface TemporalEntity {
  $type?: 'pub.layers.defs#temporalEntity'
  /** Point in time as ISO 8601 datetime (e.g., '2024-03-15', '2024-03-15T14:30:00Z'). Maps to OWL-Time Instant. */
  instant?: string
  /** Interval start as ISO 8601 datetime. Maps to OWL-Time hasBeginning. */
  intervalStart?: string
  /** Interval end as ISO 8601 datetime. Maps to OWL-Time hasEnd. */
  intervalEnd?: string
  /** Duration as ISO 8601 duration (e.g., 'P3Y', 'PT2H30M', 'P1DT12H'). Maps to OWL-Time hasTemporalDuration. */
  duration?: string
  /** Lower bound for uncertain or vague times, as ISO 8601 datetime. */
  earliest?: string
  /** Upper bound for uncertain or vague times, as ISO 8601 datetime. */
  latest?: string
  /** AT-URI of the granularity definition node. Community-expandable via knowledge graph. */
  granularityUri?: string
  /** Temporal granularity slug (fallback when granularityUri unavailable). Maps to OWL-Time unitType. */
  granularity?:
    | 'millennium'
    | 'century'
    | 'decade'
    | 'year'
    | 'quarter'
    | 'month'
    | 'week'
    | 'day'
    | 'hour'
    | 'minute'
    | 'second'
    | 'millisecond'
    | 'custom'
    | (string & {})
  /** AT-URI of the calendar system definition node. Community-expandable via knowledge graph. */
  calendarUri?: string
  /** Calendar system slug (fallback when calendarUri unavailable). Maps to OWL-Time TRS (Temporal Reference System). */
  calendar?:
    | 'gregorian'
    | 'julian'
    | 'hijri'
    | 'hebrew'
    | 'iso-week'
    | 'unix'
    | 'japanese-imperial'
    | 'buddhist'
    | 'coptic'
    | 'custom'
    | (string & {})
  /** ISO 8601 repeating interval (e.g., 'R/P1W' for weekly, 'R5/P1D' for 5 daily repetitions). */
  recurrence?: string
  features?: FeatureMap
}

const hashTemporalEntity = 'temporalEntity'

export function isTemporalEntity<V>(v: V) {
  return is$typed(v, id, hashTemporalEntity)
}

export function validateTemporalEntity<V>(v: V) {
  return validate<TemporalEntity & V>(v, id, hashTemporalEntity)
}

/** Qualitative modification of a temporal value. Subsumes TimeML TIMEX3 mod attribute and OWL-Time DateTimeDescription qualifiers. */
export interface TemporalModifier {
  $type?: 'pub.layers.defs#temporalModifier'
  /** AT-URI of the temporal modifier definition node. Community-expandable via knowledge graph. */
  modUri?: string
  /** Temporal modifier slug (fallback when modUri unavailable). Maps to TimeML TIMEX3 mod. */
  mod?:
    | 'approximate'
    | 'early'
    | 'mid'
    | 'late'
    | 'start'
    | 'end'
    | 'before'
    | 'after'
    | 'on-or-before'
    | 'on-or-after'
    | 'less-than'
    | 'more-than'
    | 'custom'
    | (string & {})
  features?: FeatureMap
}

const hashTemporalModifier = 'temporalModifier'

export function isTemporalModifier<V>(v: V) {
  return is$typed(v, id, hashTemporalModifier)
}

export function validateTemporalModifier<V>(v: V) {
  return validate<TemporalModifier & V>(v, id, hashTemporalModifier)
}

/** A complete temporal annotation packaging the expression type, normalized value, modifier, anchoring, and document function. Subsumes TimeML TIMEX3 and OWL-Time GeneralDateTimeDescription. Attach to annotation objects via the temporal field. */
export interface TemporalExpression {
  $type?: 'pub.layers.defs#temporalExpression'
  /** AT-URI of the temporal expression type definition node. Community-expandable via knowledge graph. */
  typeUri?: string
  /** Temporal expression type slug (fallback when typeUri unavailable). Maps to TimeML TIMEX3 type. */
  type?:
    | 'date'
    | 'time'
    | 'duration'
    | 'set'
    | 'interval'
    | 'relative'
    | 'custom'
    | (string & {})
  value?: TemporalEntity
  modifier?: TemporalModifier
  anchorRef?: ObjectRef
  /** AT-URI of the document function definition node. Community-expandable via knowledge graph. */
  functionUri?: string
  /** Document function slug (fallback when functionUri unavailable). Maps to TimeML functionInDocument. */
  function?:
    | 'creation-time'
    | 'publication-time'
    | 'expiration-time'
    | 'modification-time'
    | 'release-time'
    | 'reception-time'
    | 'none'
    | 'custom'
    | (string & {})
  features?: FeatureMap
}

const hashTemporalExpression = 'temporalExpression'

export function isTemporalExpression<V>(v: V) {
  return is$typed(v, id, hashTemporalExpression)
}

export function validateTemporalExpression<V>(v: V) {
  return validate<TemporalExpression & V>(v, id, hashTemporalExpression)
}

/** A normalized spatial value representing a point, region, line, or complex geometry. Parallel to temporalEntity. Subsumes GeoJSON geometry types, WKT primitives, and ISO 19107 spatial schema. Consumers dispatch on which fields are populated: bbox only (pixel bounding box), geometry+type (parsed geometry string), geometry+geometryFormat (format-specific parsing). */
export interface SpatialEntity {
  $type?: 'pub.layers.defs#spatialEntity'
  bbox?: BoundingBox
  /** Geometry as a string in the format specified by geometryFormat. WKT examples: 'POINT(37.7749 -122.4194)', 'POLYGON((0 0, 100 0, 100 100, 0 100, 0 0))'. GeoJSON example: '{"type":"Point","coordinates":[-122.4194,37.7749]}'. SVG path example: 'M 10 10 L 100 10 L 100 100 Z'. Default format is WKT. */
  geometry?: string
  /** AT-URI of the geometry type definition node. Community-expandable via knowledge graph. */
  typeUri?: string
  /** Geometry type slug (fallback when typeUri unavailable). For dispatch without parsing the geometry string. */
  type?:
    | 'point'
    | 'box'
    | 'polygon'
    | 'multi-polygon'
    | 'line-string'
    | 'multi-line-string'
    | 'circle'
    | 'ellipse'
    | 'multi-point'
    | 'geometry-collection'
    | 'custom'
    | (string & {})
  /** AT-URI of the geometry format definition node. Community-expandable via knowledge graph. */
  geometryFormatUri?: string
  /** Format of the geometry string (fallback when geometryFormatUri unavailable). Default is WKT. */
  geometryFormat?:
    | 'wkt'
    | 'geojson'
    | 'svg-path'
    | 'coco-polygon'
    | 'coco-rle'
    | 'custom'
    | (string & {})
  /** AT-URI of the coordinate reference system definition node. Community-expandable via knowledge graph. */
  crsUri?: string
  /** Coordinate reference system slug (fallback when crsUri unavailable). Determines how coordinates in geometry/bbox are interpreted. */
  crs?:
    | 'pixel'
    | 'percentage'
    | 'wgs84'
    | 'web-mercator'
    | 'custom'
    | (string & {})
  /** Number of coordinate dimensions (2 for planar, 3 for volumetric/elevation). */
  dimensions?: number
  /** Spatial precision or uncertainty radius as a string with units (e.g., '50m', '10px', '0.001deg'). Units depend on the CRS. */
  uncertainty?: string
  features?: FeatureMap
}

const hashSpatialEntity = 'spatialEntity'

export function isSpatialEntity<V>(v: V) {
  return is$typed(v, id, hashSpatialEntity)
}

export function validateSpatialEntity<V>(v: V) {
  return validate<SpatialEntity & V>(v, id, hashSpatialEntity)
}

/** Qualitative modification of a spatial value. Parallel to temporalModifier. Indicates precision, derivation method, or processing applied to a spatial entity. */
export interface SpatialModifier {
  $type?: 'pub.layers.defs#spatialModifier'
  /** AT-URI of the spatial modifier definition node. Community-expandable via knowledge graph. */
  modUri?: string
  /** Spatial modifier slug (fallback when modUri unavailable). */
  mod?:
    | 'approximate'
    | 'projected'
    | 'interpolated'
    | 'estimated'
    | 'buffered'
    | 'simplified'
    | 'generalized'
    | 'custom'
    | (string & {})
  features?: FeatureMap
}

const hashSpatialModifier = 'spatialModifier'

export function isSpatialModifier<V>(v: V) {
  return is$typed(v, id, hashSpatialModifier)
}

export function validateSpatialModifier<V>(v: V) {
  return validate<SpatialModifier & V>(v, id, hashSpatialModifier)
}

/** A complete spatial annotation packaging the expression type, normalized value, modifier, anchoring, and document function. Parallel to temporalExpression. Subsumes ISO-Space place annotations (ISO 24617-7), SpatialML PLACE elements, and general spatial semantic annotation. Attach to annotation objects via the spatial field. */
export interface SpatialExpression {
  $type?: 'pub.layers.defs#spatialExpression'
  /** AT-URI of the spatial expression type definition node. Community-expandable via knowledge graph. */
  typeUri?: string
  /** Spatial expression type slug (fallback when typeUri unavailable). Maps to ISO-Space spatial entity types. */
  type?:
    | 'location'
    | 'region'
    | 'path'
    | 'direction'
    | 'distance'
    | 'relative'
    | 'custom'
    | (string & {})
  value?: SpatialEntity
  modifier?: SpatialModifier
  anchorRef?: ObjectRef
  /** AT-URI of the document function definition node. Community-expandable via knowledge graph. */
  functionUri?: string
  /** Document function slug (fallback when functionUri unavailable). What role this place plays in the document. */
  function?:
    | 'document-location'
    | 'publication-location'
    | 'situation-location'
    | 'origin'
    | 'destination'
    | 'waypoint'
    | 'none'
    | 'custom'
    | (string & {})
  features?: FeatureMap
}

const hashSpatialExpression = 'spatialExpression'

export function isSpatialExpression<V>(v: V) {
  return is$typed(v, id, hashSpatialExpression)
}

export function validateSpatialExpression<V>(v: V) {
  return validate<SpatialExpression & V>(v, id, hashSpatialExpression)
}

/** Anchor to a specific page and region in a paged document (PDF, etc.). Compatible with chive.pub's page-level annotation model. */
export interface PageAnchor {
  $type?: 'pub.layers.defs#pageAnchor'
  /** 0-indexed page number. */
  page: number
  boundingBox?: BoundingBox
  textSpan?: Span
}

const hashPageAnchor = 'pageAnchor'

export function isPageAnchor<V>(v: V) {
  return is$typed(v, id, hashPageAnchor)
}

export function validatePageAnchor<V>(v: V) {
  return validate<PageAnchor & V>(v, id, hashPageAnchor)
}

/** W3C TextQuoteSelector: selects text by quoting it with surrounding context. Compatible with at.margin.annotation and the W3C Web Annotation Data Model. */
export interface TextQuoteSelector {
  $type?: 'pub.layers.defs#textQuoteSelector'
  /** The exact text to match. */
  exact: string
  /** Text immediately before the selection. */
  prefix?: string
  /** Text immediately after the selection. */
  suffix?: string
}

const hashTextQuoteSelector = 'textQuoteSelector'

export function isTextQuoteSelector<V>(v: V) {
  return is$typed(v, id, hashTextQuoteSelector)
}

export function validateTextQuoteSelector<V>(v: V) {
  return validate<TextQuoteSelector & V>(v, id, hashTextQuoteSelector)
}

/** W3C TextPositionSelector: selects by character offsets. Semantically equivalent to pub.layers.defs#span but named for W3C compatibility with at.margin. */
export interface TextPositionSelector {
  $type?: 'pub.layers.defs#textPositionSelector'
  /** Starting character position (0-indexed, inclusive). */
  start: number
  /** Ending character position (exclusive). */
  end: number
}

const hashTextPositionSelector = 'textPositionSelector'

export function isTextPositionSelector<V>(v: V) {
  return is$typed(v, id, hashTextPositionSelector)
}

export function validateTextPositionSelector<V>(v: V) {
  return validate<TextPositionSelector & V>(v, id, hashTextPositionSelector)
}

/** W3C FragmentSelector: selects by URI fragment identifier. */
export interface FragmentSelector {
  $type?: 'pub.layers.defs#fragmentSelector'
  /** Fragment identifier value. */
  value: string
  /** Specification the fragment conforms to. */
  conformsTo?: string
}

const hashFragmentSelector = 'fragmentSelector'

export function isFragmentSelector<V>(v: V) {
  return is$typed(v, id, hashFragmentSelector)
}

export function validateFragmentSelector<V>(v: V) {
  return validate<FragmentSelector & V>(v, id, hashFragmentSelector)
}

/** Target for annotating external resources (web pages, documents, etc.). Compatible with at.margin's target model and the W3C Web Annotation Data Model. */
export interface ExternalTarget {
  $type?: 'pub.layers.defs#externalTarget'
  /** The URI of the external resource being annotated. */
  source: string
  /** SHA256 hash of normalized URI for indexing. */
  sourceHash?: string
  /** Title of the resource at annotation time. */
  title?: string
  selector?:
    | $Typed<TextQuoteSelector>
    | $Typed<TextPositionSelector>
    | $Typed<FragmentSelector>
    | { $type: string }
}

const hashExternalTarget = 'externalTarget'

export function isExternalTarget<V>(v: V) {
  return is$typed(v, id, hashExternalTarget)
}

export function validateExternalTarget<V>(v: V) {
  return validate<ExternalTarget & V>(v, id, hashExternalTarget)
}

/** Abstract anchor: how an annotation attaches to its source data. This is a polymorphic type; at least one anchoring field should be present. Consumers dispatch on which field(s) are populated. */
export interface Anchor {
  $type?: 'pub.layers.defs#anchor'
  textSpan?: Span
  tokenRef?: TokenRef
  tokenRefSequence?: TokenRefSequence
  temporalSpan?: TemporalSpan
  spatioTemporalAnchor?: SpatioTemporalAnchor
  pageAnchor?: PageAnchor
  externalTarget?: ExternalTarget
}

const hashAnchor = 'anchor'

export function isAnchor<V>(v: V) {
  return is$typed(v, id, hashAnchor)
}

export function validateAnchor<V>(v: V) {
  return validate<Anchor & V>(v, id, hashAnchor)
}

/** A single link in an alignment between two parallel sequences. Maps element(s) in a source sequence to element(s) in a target sequence. Supports many-to-many correspondence for interlinear glossing, parallel text alignment, cross-tokenization mapping, etc. */
export interface AlignmentLink {
  $type?: 'pub.layers.defs#alignmentLink'
  /** Indices into the source sequence. */
  sourceIndices?: number[]
  /** Indices into the target sequence. */
  targetIndices?: number[]
  /** Alignment confidence 0-1000. */
  confidence?: number
  /** Optional label for the alignment link (e.g., alignment type). */
  label?: string
  /** Knowledge graph references for this link (e.g., bilingual dictionary entry, translation memory source). */
  knowledgeRefs?: KnowledgeRef[]
  features?: FeatureMap
}

const hashAlignmentLink = 'alignmentLink'

export function isAlignmentLink<V>(v: V) {
  return is$typed(v, id, hashAlignmentLink)
}

export function validateAlignmentLink<V>(v: V) {
  return validate<AlignmentLink & V>(v, id, hashAlignmentLink)
}

/** A composable reference to any agent (human annotator, ML model, crowd worker, expert panel, etc.) that produced data. Separates the identity of the producer from the interpretive framework (persona) and the software used (tool). Consumers dispatch on which field(s) are populated: did for ATProto-native agents, id for anonymized or platform-specific identifiers, knowledgeRef for externally grounded agents (ORCID, HuggingFace model card, Wikidata). */
export interface AgentRef {
  $type?: 'pub.layers.defs#agentRef'
  /** ATProto DID of the agent, if the agent has one. */
  did?: string
  /** Arbitrary string identifier (anonymized crowdworker ID, platform username, model version string, etc.). */
  id?: string
  /** Human-readable display name for the agent. */
  name?: string
  knowledgeRef?: KnowledgeRef
}

const hashAgentRef = 'agentRef'

export function isAgentRef<V>(v: V) {
  return is$typed(v, id, hashAgentRef)
}

export function validateAgentRef<V>(v: V) {
  return validate<AgentRef & V>(v, id, hashAgentRef)
}

/** Metadata about who or what produced an annotation, when, and with what confidence. The three key provenance fields are: agent (who did it), personaRef (under what framework), and tool (with what software). */
export interface AnnotationMetadata {
  $type?: 'pub.layers.defs#annotationMetadata'
  agent?: AgentRef
  /** Name or identifier of the software tool used to produce this annotation (e.g., 'spaCy 3.7', 'brat 1.3', 'ELAN 6.4'). Distinct from agent (who ran the tool). */
  tool: string
  /** When the annotation was produced. */
  timestamp?: string
  /** Confidence score scaled 0-1000 (to avoid floats). 1000 = maximum confidence. */
  confidence?: number
  /** Reference to the persona/annotation framework under which this annotation was produced. Distinct from agent (who did it). */
  personaRef?: string
  /** References to upstream records this annotation was derived from. */
  dependencies?: ObjectRef[]
  /** Content hash for integrity verification. */
  digest?: string
}

const hashAnnotationMetadata = 'annotationMetadata'

export function isAnnotationMetadata<V>(v: V) {
  return is$typed(v, id, hashAnnotationMetadata)
}

export function validateAnnotationMetadata<V>(v: V) {
  return validate<AnnotationMetadata & V>(v, id, hashAnnotationMetadata)
}

/** A reference to an external knowledge base entry. Supports ATProto-native KBs (e.g., chive.pub with AT-URI nodes), external KBs (e.g., Wikidata with QIDs), and user/persona-specific KBs (AT-URIs in user PDSes). */
export interface KnowledgeRef {
  $type?: 'pub.layers.defs#knowledgeRef'
  /** AT-URI of the knowledge base type definition node. Community-expandable via knowledge graph. */
  sourceUri?: string
  /** Knowledge base source slug (fallback when sourceUri unavailable). */
  source:
    | 'chive.pub'
    | 'wikidata'
    | 'wordnet'
    | 'framenet'
    | 'propbank'
    | 'verbnet'
    | 'unimorph'
    | 'glottolog'
    | 'cldr'
    | 'custom'
    | (string & {})
  /** The identifier within the knowledge base (e.g., Wikidata QID, chive.pub node URI, Glottolog languoid ID). */
  identifier: string
  /** Optional full URI for the knowledge base entry. */
  uri?: string
  /** Human-readable label for the referenced entity. */
  label?: string
}

const hashKnowledgeRef = 'knowledgeRef'

export function isKnowledgeRef<V>(v: V) {
  return is$typed(v, id, hashKnowledgeRef)
}

export function validateKnowledgeRef<V>(v: V) {
  return validate<KnowledgeRef & V>(v, id, hashKnowledgeRef)
}

/** An open-ended set of typed key-value features that can be attached to any annotation. Provides maximum extensibility without committing to any label set or linguistic theory. */
export interface FeatureMap {
  $type?: 'pub.layers.defs#featureMap'
  /** The feature entries. */
  entries: Feature[]
}

const hashFeatureMap = 'featureMap'

export function isFeatureMap<V>(v: V) {
  return is$typed(v, id, hashFeatureMap)
}

export function validateFeatureMap<V>(v: V) {
  return validate<FeatureMap & V>(v, id, hashFeatureMap)
}

/** A single key-value feature. */
export interface Feature {
  $type?: 'pub.layers.defs#feature'
  /** Feature name/key. */
  key: string
  /** Feature value as string. Consumers may parse typed values based on the key's semantics. */
  value: string
}

const hashFeature = 'feature'

export function isFeature<V>(v: V) {
  return is$typed(v, id, hashFeature)
}

export function validateFeature<V>(v: V) {
  return validate<Feature & V>(v, id, hashFeature)
}

/** An abstract constraint expression. Used for type constraints on role slots, slot-level constraints in templates, cross-slot agreement constraints, and any other declarative restriction. The expression field holds a DSL string whose format is identified by expressionFormat/expressionFormatUri. */
export interface Constraint {
  $type?: 'pub.layers.defs#constraint'
  /** The constraint expression (e.g., 'self.pos == "VERB"', 'subject.features.number == verb.features.number'). */
  expression: string
  /** AT-URI of the expression format definition node. Community-expandable via knowledge graph. */
  expressionFormatUri?: string
  /** Expression format slug (fallback when expressionFormatUri unavailable). */
  expressionFormat?:
    | 'python-expr'
    | 'json-logic'
    | 'regex'
    | 'sparql-filter'
    | 'type-ref'
    | 'custom'
    | (string & {})
  /** AT-URI of the scope definition node. Community-expandable via knowledge graph. */
  scopeUri?: string
  /** Constraint scope slug (fallback when scopeUri unavailable). */
  scope?: 'slot' | 'template' | 'cross-template' | 'global' | (string & {})
  /** Names of the slots or variables this constraint ranges over (for cross-slot and cross-template constraints). */
  context?: string[]
  /** Human-readable description of the constraint. */
  description?: string
}

const hashConstraint = 'constraint'

export function isConstraint<V>(v: V) {
  return is$typed(v, id, hashConstraint)
}

export function validateConstraint<V>(v: V) {
  return validate<Constraint & V>(v, id, hashConstraint)
}

/** A composable reference to any Layers object, whether local (same record, by UUID), remote (different record, by AT-URI + optional object UUID), or external (knowledge graph entry). This is the universal cross-referencing primitive; consumers dispatch on which field(s) are populated. Used by argumentRef, graphNode, alignment endpoints, and any other cross-object pointer. */
export interface ObjectRef {
  $type?: 'pub.layers.defs#objectRef'
  localId?: Uuid
  /** AT-URI of a Layers record in another user's PDS or another record in the same PDS. */
  recordRef?: string
  objectId?: Uuid
  knowledgeRef?: KnowledgeRef
}

const hashObjectRef = 'objectRef'

export function isObjectRef<V>(v: V) {
  return is$typed(v, id, hashObjectRef)
}

export function validateObjectRef<V>(v: V) {
  return validate<ObjectRef & V>(v, id, hashObjectRef)
}
