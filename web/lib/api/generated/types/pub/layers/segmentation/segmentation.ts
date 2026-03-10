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
import type * as PubLayersSegmentationDefs from './defs'
import type * as PubLayersDefs from '../defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.segmentation.segmentation'

export interface Main {
  $type: 'pub.layers.segmentation.segmentation'
  /** Reference to the expression this segmentation applies to. */
  expression: string
  /** The tokenizations in this segmentation. Each tokenization can optionally scope to a sub-expression via expressionRef. */
  tokenizations: PubLayersSegmentationDefs.Tokenization[]
  metadata?: PubLayersDefs.AnnotationMetadata
  /** Knowledge graph references (e.g., tokenizer algorithm, sentence splitting model). */
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
