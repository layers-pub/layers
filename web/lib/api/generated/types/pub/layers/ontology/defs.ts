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
const id = 'pub.layers.ontology.defs'

/** A role/argument slot in a frame or situation type definition. Structurally parallel to pub.layers.resource#slot: both represent named positions with type constraints. roleSlot is ontology-level (what roles a frame type allows); resource slot is template-level (what variables a template exposes). */
export interface RoleSlot {
  $type?: 'pub.layers.ontology.defs#roleSlot'
  /** The role label (e.g., Agent, Patient, Theme, ARG0). */
  roleName: string
  roleDescription?: string
  /** References to allowed filler types (pub.layers.ontology#typeDef AT-URIs). */
  fillerTypeRefs?: string[]
  /** AT-URI of a pub.layers.resource#collection constraining allowed fillers. */
  collectionRef?: string
  /** Whether this role is obligatory. */
  required?: boolean
  /** Default filler value if not explicitly filled. */
  defaultValue?: string
  /** Declarative constraints on fillers of this role (e.g., selectional restrictions, agreement requirements). */
  constraints?: PubLayersDefs.Constraint[]
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
  features?: PubLayersDefs.FeatureMap
}

const hashRoleSlot = 'roleSlot'

export function isRoleSlot<V>(v: V) {
  return is$typed(v, id, hashRoleSlot)
}

export function validateRoleSlot<V>(v: V) {
  return validate<RoleSlot & V>(v, id, hashRoleSlot)
}
