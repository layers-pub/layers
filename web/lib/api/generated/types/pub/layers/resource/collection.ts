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
const id = 'pub.layers.resource.collection'

export interface Main {
  $type: 'pub.layers.resource.collection'
  /** Human-readable name for this collection. */
  name: string
  description?: string
  /** AT-URI of the collection kind definition node. Community-expandable via knowledge graph. */
  kindUri?: string
  /** Collection kind slug (fallback when kindUri unavailable). */
  kind?:
    | 'lexicon'
    | 'frame-inventory'
    | 'gazetteer'
    | 'paradigm'
    | 'stop-list'
    | 'stimulus-pool'
    | 'custom'
    | (string & {})
  /** BCP-47 language tag. */
  language?: string
  /** Version string (e.g., 'FrameNet 1.7', 'PropBank 3.4'). */
  version?: string
  /** Reference to a pub.layers.ontology defining the type system for entries in this collection. */
  ontologyRef?: string
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
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
