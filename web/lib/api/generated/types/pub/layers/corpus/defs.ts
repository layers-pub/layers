// @ts-nocheck
/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'
import type * as PubLayersDefs from '../defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.corpus.defs'

/** Annotation project design parameters: annotator assignment, adjudication, and quality criteria. */
export interface AnnotationDesign {
  $type?: 'pub.layers.corpus.defs#annotationDesign'
  redundancy?: RedundancySpec
  adjudication?: AdjudicationSpec
  /** Acceptance criteria for annotation quality. */
  qualityCriteria?: QualityCriterion[]
  /** AT-URI of the annotation guidelines document (e.g., a pub.layers.persona or external resource). */
  guidelinesRef?: string
  /** Version identifier for the annotation guidelines. */
  guidelinesVersion?: string
  /** Number of annotation passes in the project workflow. */
  annotationRounds?: number
  features?: PubLayersDefs.FeatureMap
}

const hashAnnotationDesign = 'annotationDesign'

export function isAnnotationDesign<V>(v: V) {
  return is$typed(v, id, hashAnnotationDesign)
}

export function validateAnnotationDesign<V>(v: V) {
  return validate<AnnotationDesign & V>(v, id, hashAnnotationDesign)
}

/** How many annotators work on each item and how they are assigned. */
export interface RedundancySpec {
  $type?: 'pub.layers.corpus.defs#redundancySpec'
  /** Number of independent annotators per item. */
  count?: number
  /** AT-URI of the assignment strategy definition node. Community-expandable via knowledge graph. */
  assignmentStrategyUri?: string
  /** How annotators are assigned to items (fallback when assignmentStrategyUri unavailable). */
  assignmentStrategy?:
    | 'random'
    | 'round-robin'
    | 'stratified'
    | 'expertise-based'
    | 'custom'
    | (string & {})
  /** Total number of annotators in the project. */
  annotatorPool?: number
  features?: PubLayersDefs.FeatureMap
}

const hashRedundancySpec = 'redundancySpec'

export function isRedundancySpec<V>(v: V) {
  return is$typed(v, id, hashRedundancySpec)
}

export function validateRedundancySpec<V>(v: V) {
  return validate<RedundancySpec & V>(v, id, hashRedundancySpec)
}

/** How disagreements between annotators are resolved into a final annotation. */
export interface AdjudicationSpec {
  $type?: 'pub.layers.corpus.defs#adjudicationSpec'
  /** AT-URI of the adjudication method definition node. Community-expandable via knowledge graph. */
  methodUri?: string
  /** Adjudication method (fallback when methodUri unavailable). */
  method?:
    | 'expert'
    | 'majority-vote'
    | 'unanimous'
    | 'discussion'
    | 'dawid-skene'
    | 'automatic-merge'
    | 'intersection'
    | 'union'
    | 'none'
    | 'custom'
    | (string & {})
  /** Whether a separate adjudicator (not one of the annotators) resolves disagreements. */
  dedicatedAdjudicator?: boolean
  /** Agreement level (0-1000) above which adjudication is skipped. */
  agreementThreshold?: number
  features?: PubLayersDefs.FeatureMap
}

const hashAdjudicationSpec = 'adjudicationSpec'

export function isAdjudicationSpec<V>(v: V) {
  return is$typed(v, id, hashAdjudicationSpec)
}

export function validateAdjudicationSpec<V>(v: V) {
  return validate<AdjudicationSpec & V>(v, id, hashAdjudicationSpec)
}

/** An acceptance criterion for annotation quality. */
export interface QualityCriterion {
  $type?: 'pub.layers.corpus.defs#qualityCriterion'
  /** AT-URI of the metric definition node. Community-expandable via knowledge graph. */
  metricUri?: string
  /** Agreement or quality metric (fallback when metricUri unavailable). */
  metric:
    | 'cohens-kappa'
    | 'fleiss-kappa'
    | 'krippendorff-alpha'
    | 'percent-agreement'
    | 'f1'
    | 'smatch'
    | 'uas'
    | 'las'
    | 'correlation'
    | 'custom'
    | (string & {})
  /** Minimum acceptable metric value (0-1000). */
  threshold?: number
  /** AT-URI of the evaluation scope definition node. Community-expandable via knowledge graph. */
  scopeUri?: string
  /** Evaluation scope (fallback when scopeUri unavailable). */
  scope?: 'item' | 'layer' | 'document' | 'corpus' | 'custom' | (string & {})
  features?: PubLayersDefs.FeatureMap
}

const hashQualityCriterion = 'qualityCriterion'

export function isQualityCriterion<V>(v: V) {
  return is$typed(v, id, hashQualityCriterion)
}

export function validateQualityCriterion<V>(v: V) {
  return validate<QualityCriterion & V>(v, id, hashQualityCriterion)
}
