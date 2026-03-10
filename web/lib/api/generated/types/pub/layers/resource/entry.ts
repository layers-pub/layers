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
import type * as PubLayersResourceDefs from './defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.resource.entry'

export interface Main {
  $type: 'pub.layers.resource.entry'
  /** Canonical/citation form. */
  lemma?: string
  /** Surface form or string representation. */
  form: string
  /** BCP-47 language tag. */
  language?: string
  /** Reference to a pub.layers.ontology#typeDef classifying this entry. */
  ontologyTypeRef?: string
  /** Knowledge graph groundings (WordNet synset, FrameNet lexical unit, Wikidata, etc.). */
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
  features?: PubLayersDefs.FeatureMap
  /** For multi-word expressions: the component words. */
  components?: PubLayersResourceDefs.MweComponent[]
  /** AT-URI of the MWE kind definition node. Community-expandable via knowledge graph. */
  mweKindUri?: string
  /** MWE kind slug (fallback when mweKindUri unavailable). */
  mweKind?:
    | 'compound'
    | 'phrasal-verb'
    | 'idiom'
    | 'light-verb'
    | 'named-entity'
    | 'collocation'
    | 'custom'
    | (string & {})
  /** AT-URI of the source record this entry was derived from (e.g., an annotation, another entry). */
  sourceRef?: string
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
