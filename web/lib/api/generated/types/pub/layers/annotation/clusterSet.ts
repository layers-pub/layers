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
import type * as PubLayersAnnotationDefs from './defs'
import type * as PubLayersDefs from '../defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.annotation.clusterSet'

export interface Main {
  $type: 'pub.layers.annotation.clusterSet'
  /** Primary expression context. Optional for cross-document clustering. */
  expression?: string
  /** For cross-document clustering: all expressions these clusters span. */
  expressionRefs?: string[]
  /** Corpus these clusters span (for cross-document clustering). */
  corpusRef?: string
  /** AT-URI of the clustering kind definition node. Community-expandable via knowledge graph. */
  kindUri?: string
  /** Clustering kind slug (fallback when kindUri unavailable). */
  kind:
    | 'coreference'
    | 'situation-coreference'
    | 'bridging'
    | 'same-as'
    | 'clustering'
    | 'custom'
    | (string & {})
  /** The annotation layer whose annotations these clusters group. */
  layerRef?: string
  clusters: PubLayersAnnotationDefs.Cluster[]
  metadata?: PubLayersDefs.AnnotationMetadata
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
