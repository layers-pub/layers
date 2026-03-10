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
const id = 'pub.layers.corpus.membership'

export interface Main {
  $type: 'pub.layers.corpus.membership'
  corpusRef: string
  expressionRef: string
  /** AT-URI of the split definition node. Community-expandable via knowledge graph. */
  splitUri?: string
  /** Split slug (fallback when splitUri unavailable). */
  split?: 'train' | 'dev' | 'test' | 'unlabeled' | (string & {})
  /** Ordering index within the corpus. */
  ordinal?: number
  metadata?: PubLayersDefs.AnnotationMetadata
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
