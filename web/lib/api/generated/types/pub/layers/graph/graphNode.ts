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
const id = 'pub.layers.graph.graphNode'

export interface Main {
  $type: 'pub.layers.graph.graphNode'
  /** AT-URI of the node type definition node. Community-expandable via knowledge graph. */
  nodeTypeUri?: string
  /** Node type slug (fallback when nodeTypeUri unavailable). */
  nodeType:
    | 'entity'
    | 'concept'
    | 'situation'
    | 'state'
    | 'time'
    | 'location'
    | 'claim'
    | 'proposition'
    | 'custom'
    | (string & {})
  /** Human-readable node label. */
  label?: string
  properties?: PubLayersDefs.FeatureMap
  /** Knowledge graph references grounding this node (Wikidata, chive.pub, FrameNet, etc.). */
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
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
