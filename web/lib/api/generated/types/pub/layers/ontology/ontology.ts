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
const id = 'pub.layers.ontology.ontology'

export interface Main {
  $type: 'pub.layers.ontology.ontology'
  /** Human-readable name for this ontology. */
  name: string
  /** Detailed description of the ontology's purpose and scope. */
  description?: string
  /** Semantic version string. */
  version?: string
  /** AT-URI of the domain definition node. Community-expandable via knowledge graph. */
  domainUri?: string
  /** Domain slug (fallback when domainUri unavailable). */
  domain?:
    | 'general'
    | 'biomedical'
    | 'legal'
    | 'financial'
    | 'news'
    | 'social-media'
    | 'scientific'
    | 'intelligence'
    | 'dialogue'
    | 'multimodal'
    | 'custom'
    | (string & {})
  /** Reference to a parent ontology this one extends. */
  parentRef?: string
  /** Reference to the persona that created/owns this ontology. */
  personaRef?: string
  /** Knowledge graph references grounding this ontology. */
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
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
