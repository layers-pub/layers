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
import type * as PubLayersGraphDefs from './defs'
import type * as PubLayersDefs from '../defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.graph.graphEdgeSet'

export interface Main {
  $type: 'pub.layers.graph.graphEdgeSet'
  /** Optional primary expression context. */
  expression?: string
  /** AT-URI of the edge type definition node. Community-expandable via knowledge graph. */
  edgeTypeUri?: string
  /** Edge type slug shared by all edges in this set (fallback when edgeTypeUri unavailable). */
  edgeType?:
    | 'coreference'
    | 'causal'
    | 'part-of'
    | 'member-of'
    | 'type-of'
    | 'same-as'
    | 'related-to'
    | 'derived-from'
    | 'supports'
    | 'contradicts'
    | 'discourse'
    | 'bridging'
    | 'before'
    | 'after'
    | 'meets'
    | 'met-by'
    | 'overlaps'
    | 'overlapped-by'
    | 'starts'
    | 'started-by'
    | 'during'
    | 'contains'
    | 'finishes'
    | 'finished-by'
    | 'equals'
    | 'simultaneous'
    | 'initiates'
    | 'culminates'
    | 'terminates'
    | 'continues'
    | 'reinitiates'
    | 'disconnected'
    | 'externally-connected'
    | 'partially-overlapping'
    | 'tangential-proper-part'
    | 'non-tangential-proper-part'
    | 'tangential-proper-part-inverse'
    | 'non-tangential-proper-part-inverse'
    | 'spatially-equal'
    | 'north-of'
    | 'south-of'
    | 'east-of'
    | 'west-of'
    | 'above'
    | 'below'
    | 'in-front-of'
    | 'behind'
    | 'left-of'
    | 'right-of'
    | 'near'
    | 'far'
    | 'adjacent'
    | 'custom'
    | (string & {})
  edges: PubLayersGraphDefs.GraphEdgeEntry[]
  metadata?: PubLayersDefs.AnnotationMetadata
  /** Knowledge graph references for this edge set (e.g., the relation ontology it implements, source methodology). */
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
