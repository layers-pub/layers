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
import type * as PubLayersOntologyDefs from './defs'
import type * as PubLayersDefs from '../defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.ontology.typeDef'

export interface Main {
  $type: 'pub.layers.ontology.typeDef'
  /** The ontology this type belongs to. */
  ontologyRef: string
  /** The type name/label. */
  name: string
  /** AT-URI of the type kind definition node. Community-expandable via knowledge graph. */
  typeKindUri?: string
  /** Type kind slug (fallback when typeKindUri unavailable). */
  typeKind:
    | 'entity-type'
    | 'situation-type'
    | 'role-type'
    | 'relation-type'
    | 'attribute-type'
    | (string & {})
  /** Rich text definition/gloss of this type. May include references to other types and Wikidata entities, following FOVEA conventions. */
  gloss?: string
  /** Reference to a parent type (for type hierarchies/inheritance). */
  parentTypeRef?: string
  /** For frame/situation types: the roles that can be filled. */
  allowedRoles?: PubLayersOntologyDefs.RoleSlot[]
  /** For attribute types: enumerated allowed values. */
  allowedValues?: string[]
  /** Knowledge graph groundings (Wikidata, chive.pub, FrameNet, etc.). */
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
