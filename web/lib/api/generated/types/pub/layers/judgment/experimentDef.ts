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
import type * as PubLayersJudgmentDefs from './defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.judgment.experimentDef'

export interface Main {
  $type: 'pub.layers.judgment.experimentDef'
  name: string
  description?: string
  /** AT-URI of the measure type definition node. Community-expandable via knowledge graph. */
  measureTypeUri?: string
  /** What property or behavior is being measured (fallback when measureTypeUri unavailable). */
  measureType?:
    | 'acceptability'
    | 'inference'
    | 'similarity'
    | 'plausibility'
    | 'comprehension'
    | 'preference'
    | 'extraction'
    | 'reading-time'
    | 'production'
    | 'custom'
    | (string & {})
  /** AT-URI of the response instrument definition node. Community-expandable via knowledge graph. */
  taskTypeUri?: string
  /** Response instrument: how the response is collected (fallback when taskTypeUri unavailable). */
  taskType?:
    | 'forced-choice'
    | 'multi-select'
    | 'ordinal-scale'
    | 'magnitude'
    | 'binary'
    | 'categorical'
    | 'free-text'
    | 'cloze'
    | 'span-labeling'
    | 'custom'
    | (string & {})
  guidelines?: string
  ontologyRef?: string
  personaRef?: string
  corpusRef?: string
  /** References to pub.layers.resource#template records used to generate stimuli for this experiment. */
  templateRefs?: string[]
  /** References to pub.layers.resource#collection records providing filler pools for this experiment. */
  collectionRefs?: string[]
  /** Minimum scale value for ordinal-scale judgments. */
  scaleMin?: number
  /** Maximum scale value. */
  scaleMax?: number
  /** Available labels for categorical judgments. */
  labels?: string[]
  /** Knowledge graph references (e.g., theoretical framework, methodology citation, task ontology). */
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
  presentation?: PubLayersJudgmentDefs.PresentationSpec
  /** Data capture instruments used in this experiment. */
  recordingMethods?: PubLayersJudgmentDefs.RecordingMethod[]
  design?: PubLayersJudgmentDefs.ExperimentDesign
  features?: PubLayersDefs.FeatureMap
  createdAt: string
  [k: string]: unknown
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true)
}

export {
  type Main as Record,
  isMain as isRecord,
  validateMain as validateRecord,
}
