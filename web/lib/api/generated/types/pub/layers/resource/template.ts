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
const id = 'pub.layers.resource.template'

export interface Main {
  $type: 'pub.layers.resource.template'
  /** Human-readable template name. */
  name?: string
  /** Template text with {slotName} placeholders (e.g., '{subject} {verb} the {object}'). */
  text: string
  /** BCP-47 language tag. */
  language?: string
  /** The named slots in this template. */
  slots: PubLayersResourceDefs.Slot[]
  /** Cross-slot constraints (e.g., agreement, semantic compatibility). These apply across multiple slots in this template. */
  constraints?: PubLayersDefs.Constraint[]
  /** Reference to the ontology defining the type system used by this template. */
  ontologyRef?: string
  /** Reference to the experiment this template was designed for. */
  experimentRef?: string
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
