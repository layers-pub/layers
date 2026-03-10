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
const id = 'pub.layers.resource.defs'

/** A named variable slot in a template. Generalizes bead's Slot (template variable position with constraints and defaults), ontology roleSlots (argument positions with filler type constraints), and similar parameterized positions in any structured linguistic pattern. Slots are composable: they can reference collections of allowed fillers, ontology types, or express arbitrary constraints. */
export interface Slot {
  $type?: 'pub.layers.resource.defs#slot'
  /** Slot name (used as placeholder key in template text, e.g., 'subject', 'verb', 'arg0'). */
  name: string
  description?: string
  /** Whether this slot must be filled. */
  required?: boolean
  /** Default filler value if not explicitly filled. */
  defaultValue?: string
  /** AT-URI of a resource collection constraining allowed fillers. */
  collectionRef?: string
  /** AT-URI of a pub.layers.ontology#typeDef constraining the filler type. */
  ontologyTypeRef?: string
  /** Multiple allowed filler type references (disjunctive constraint). */
  fillerTypeRefs?: string[]
  /** Slot-level constraints (e.g., 'self.pos == "VERB"', 'self.features.number == "sg"'). */
  constraints?: PubLayersDefs.Constraint[]
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
  features?: PubLayersDefs.FeatureMap
}

const hashSlot = 'slot'

export function isSlot<V>(v: V) {
  return is$typed(v, id, hashSlot)
}

export function validateSlot<V>(v: V) {
  return validate<Slot & V>(v, id, hashSlot)
}

/** A single slot→filler mapping in a filled template. The filler can be an entry reference (AT-URI to a resource entry), a literal value, or both (entry reference with rendered surface form). */
export interface SlotFilling {
  $type?: 'pub.layers.resource.defs#slotFilling'
  /** Name of the slot being filled (must match a slot name in the template). */
  slotName: string
  /** AT-URI of the resource entry filling this slot. */
  entryRef?: string
  /** Literal string value for this slot (used when no entry reference is needed, or as override). */
  literalValue?: string
  /** The surface form as rendered in the filled text (may differ from entry form due to morphological inflection, agreement, etc.). */
  renderedForm?: string
  features?: PubLayersDefs.FeatureMap
}

const hashSlotFilling = 'slotFilling'

export function isSlotFilling<V>(v: V) {
  return is$typed(v, id, hashSlotFilling)
}

export function validateSlotFilling<V>(v: V) {
  return validate<SlotFilling & V>(v, id, hashSlotFilling)
}

/** A member in a template composition. References either a template or a nested composition. */
export interface TemplateMember {
  $type?: 'pub.layers.resource.defs#templateMember'
  /** Position in the composition (0-based). */
  ordinal: number
  /** AT-URI of a template record. */
  templateRef?: string
  /** AT-URI of a nested templateComposition (for tree structures). */
  compositionRef?: string
  /** Optional label for this member (e.g., 'context', 'target', 'filler'). */
  label?: string
  features?: PubLayersDefs.FeatureMap
}

const hashTemplateMember = 'templateMember'

export function isTemplateMember<V>(v: V) {
  return is$typed(v, id, hashTemplateMember)
}

export function validateTemplateMember<V>(v: V) {
  return validate<TemplateMember & V>(v, id, hashTemplateMember)
}

/** A component of a multi-word expression entry. */
export interface MweComponent {
  $type?: 'pub.layers.resource.defs#mweComponent'
  /** Surface form of this component. */
  form: string
  /** Lemma/citation form of this component. */
  lemma?: string
  /** Position in the MWE (0-based). */
  position?: number
  /** Whether this component is the head of the MWE. */
  isHead?: boolean
  features?: PubLayersDefs.FeatureMap
}

const hashMweComponent = 'mweComponent'

export function isMweComponent<V>(v: V) {
  return is$typed(v, id, hashMweComponent)
}

export function validateMweComponent<V>(v: V) {
  return validate<MweComponent & V>(v, id, hashMweComponent)
}
