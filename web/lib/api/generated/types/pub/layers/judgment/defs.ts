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
const id = 'pub.layers.judgment.defs'

/** A single judgment about a linguistic item. */
export interface Judgment {
  $type?: 'pub.layers.judgment.defs#judgment'
  item: PubLayersDefs.ObjectRef
  /** Reference to the pub.layers.resource#filling that generated the item being judged. */
  fillingRef?: string
  /** Categorical judgment label. */
  categoricalValue?: string
  /** Numeric response value (ordinal-scale rating, magnitude estimate, or rank position). */
  scalarValue?: number
  textSpan?: PubLayersDefs.Span
  /** Free-text response. */
  freeText?: string
  /** Response time in milliseconds. */
  responseTimeMs?: number
  confidence?: number
  behavioralData?: PubLayersDefs.FeatureMap
  features?: PubLayersDefs.FeatureMap
}

const hashJudgment = 'judgment'

export function isJudgment<V>(v: V) {
  return is$typed(v, id, hashJudgment)
}

export function validateJudgment<V>(v: V) {
  return validate<Judgment & V>(v, id, hashJudgment)
}

/** Experiment design parameters for item distribution, ordering, and timing. */
export interface ExperimentDesign {
  $type?: 'pub.layers.judgment.defs#experimentDesign'
  /** Constraints on item list construction (Latin square balancing, no-adjacent-same-condition, etc.). */
  listConstraints?: ListConstraint[]
  /** AT-URI of the distribution strategy definition node. Community-expandable. */
  distributionStrategyUri?: string
  /** How items are distributed to annotators. */
  distributionStrategy?:
    | 'latin-square'
    | 'random'
    | 'blocked'
    | 'stratified'
    | 'custom'
    | (string & {})
  /** AT-URI of the item order definition node. Community-expandable. */
  itemOrderUri?: string
  /** How items are ordered within a list. */
  itemOrder?:
    | 'random-order'
    | 'fixed-order'
    | 'blocked'
    | 'adaptive'
    | 'custom'
    | (string & {})
  /** Target timing per item in milliseconds. */
  timingMs?: number
  features?: PubLayersDefs.FeatureMap
}

const hashExperimentDesign = 'experimentDesign'

export function isExperimentDesign<V>(v: V) {
  return is$typed(v, id, hashExperimentDesign)
}

export function validateExperimentDesign<V>(v: V) {
  return validate<ExperimentDesign & V>(v, id, hashExperimentDesign)
}

/** A constraint on item list construction for an experiment. */
export interface ListConstraint {
  $type?: 'pub.layers.judgment.defs#listConstraint'
  /** AT-URI of the constraint kind definition node. Community-expandable. */
  kindUri?: string
  /** Constraint kind slug. */
  kind:
    | 'latin-square'
    | 'no-adjacent-same-condition'
    | 'balanced-frequency'
    | 'minimum-distance'
    | 'custom'
    | (string & {})
  /** The item property this constraint operates on (e.g., 'condition', 'templateRef'). */
  targetProperty?: string
  parameters?: PubLayersDefs.FeatureMap
  constraint?: PubLayersDefs.Constraint
}

const hashListConstraint = 'listConstraint'

export function isListConstraint<V>(v: V) {
  return is$typed(v, id, hashListConstraint)
}

export function validateListConstraint<V>(v: V) {
  return validate<ListConstraint & V>(v, id, hashListConstraint)
}

/** How stimuli are displayed to participants. */
export interface PresentationSpec {
  $type?: 'pub.layers.judgment.defs#presentationSpec'
  /** AT-URI of the presentation method definition node. Community-expandable via knowledge graph. */
  methodUri?: string
  /** Presentation method (fallback when methodUri unavailable). */
  method?:
    | 'rsvp'
    | 'self-paced'
    | 'whole-sentence'
    | 'auditory'
    | 'visual-world'
    | 'masked-priming'
    | 'cross-modal'
    | 'naturalistic'
    | 'gating'
    | 'maze'
    | 'boundary'
    | 'moving-window'
    | 'custom'
    | (string & {})
  /** How text is segmented for incremental presentation. */
  chunkingUnit?:
    | 'word'
    | 'character'
    | 'morpheme'
    | 'phrase'
    | 'sentence'
    | 'region'
    | 'custom'
    | (string & {})
  /** Per-chunk display duration in milliseconds. */
  timingMs?: number
  /** Inter-stimulus interval in milliseconds. */
  isiMs?: number
  /** Whether previous chunks remain visible during incremental presentation. */
  cumulative?: boolean
  /** Masking character for non-cumulative displays (e.g., '-', '#'). */
  maskChar?: string
  features?: PubLayersDefs.FeatureMap
}

const hashPresentationSpec = 'presentationSpec'

export function isPresentationSpec<V>(v: V) {
  return is$typed(v, id, hashPresentationSpec)
}

export function validatePresentationSpec<V>(v: V) {
  return validate<PresentationSpec & V>(v, id, hashPresentationSpec)
}

/** A data capture instrument used in an experiment. */
export interface RecordingMethod {
  $type?: 'pub.layers.judgment.defs#recordingMethod'
  /** AT-URI of the recording method definition node. Community-expandable via knowledge graph. */
  methodUri?: string
  /** Recording method (fallback when methodUri unavailable). */
  method:
    | 'button-box'
    | 'keyboard'
    | 'mouse-click'
    | 'touchscreen'
    | 'voice'
    | 'eeg'
    | 'meg'
    | 'fmri'
    | 'fnirs'
    | 'eye-tracking'
    | 'pupillometry'
    | 'mouse-tracking'
    | 'emg'
    | 'skin-conductance'
    | 'ecog'
    | 'custom'
    | (string & {})
  features?: PubLayersDefs.FeatureMap
}

const hashRecordingMethod = 'recordingMethod'

export function isRecordingMethod<V>(v: V) {
  return is$typed(v, id, hashRecordingMethod)
}

export function validateRecordingMethod<V>(v: V) {
  return validate<RecordingMethod & V>(v, id, hashRecordingMethod)
}
