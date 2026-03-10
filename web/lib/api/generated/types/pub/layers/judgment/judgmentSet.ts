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
const id = 'pub.layers.judgment.judgmentSet'

export interface Main {
  $type: 'pub.layers.judgment.judgmentSet'
  experimentRef: string
  agent?: PubLayersDefs.AgentRef
  judgments: PubLayersJudgmentDefs.Judgment[]
  metadata?: PubLayersDefs.AnnotationMetadata
  /** Knowledge graph references (e.g., crowdsourcing platform, annotator population, methodology source). */
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
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
