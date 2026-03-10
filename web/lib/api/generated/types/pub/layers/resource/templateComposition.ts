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
const id = 'pub.layers.resource.templateComposition'

export interface Main {
  $type: 'pub.layers.resource.templateComposition'
  /** AT-URI of the composition type definition node. Community-expandable via knowledge graph. */
  compositionTypeUri?: string
  /** Composition type slug (fallback when compositionTypeUri unavailable). */
  compositionType:
    | 'sequence'
    | 'tree'
    | 'parallel'
    | 'alternation'
    | 'custom'
    | (string & {})
  /** Ordered members of this composition. */
  members: PubLayersResourceDefs.TemplateMember[]
  /** Reference to the experiment this composition was designed for. */
  experimentRef?: string
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
