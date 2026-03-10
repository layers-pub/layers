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
import type * as PubLayersResourceDefs from './defs'
import type * as PubLayersDefs from '../defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.resource.filling'

export interface Main {
  $type: 'pub.layers.resource.filling'
  /** AT-URI of the template being filled. */
  templateRef: string
  /** The slot→filler mappings. */
  slotFillings: PubLayersResourceDefs.SlotFilling[]
  /** The fully rendered text after substitution. */
  renderedText?: string
  /** AT-URI of the pub.layers.expression materializing this filling (for annotation). */
  expressionRef?: string
  /** AT-URI of the filling strategy definition node. Community-expandable via knowledge graph. */
  strategyUri?: string
  /** Filling strategy slug (fallback when strategyUri unavailable). */
  strategy?:
    | 'exhaustive'
    | 'random'
    | 'stratified'
    | 'mlm'
    | 'csp'
    | 'mixed'
    | 'manual'
    | 'custom'
    | (string & {})
  metadata?: PubLayersDefs.AnnotationMetadata
  /** Knowledge graph references (e.g., generation model in a KB, sampling distribution, linguistic theory motivating the filling). */
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
