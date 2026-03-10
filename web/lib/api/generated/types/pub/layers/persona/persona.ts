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
const id = 'pub.layers.persona.persona'

export interface Main {
  $type: 'pub.layers.persona.persona'
  /** The persona name (e.g., 'Syntactician', 'Intelligence Analyst', 'Biomedical NER Annotator'). */
  name: string
  /** Description of the persona's role, expertise, and information needs. */
  description?: string
  /** AT-URI of the domain definition node. Community-expandable via knowledge graph. */
  domainUri?: string
  /** Domain slug (fallback when domainUri unavailable). */
  domain?:
    | 'linguistics'
    | 'nlp'
    | 'biomedical'
    | 'legal'
    | 'intelligence'
    | 'social-science'
    | 'humanities'
    | 'custom'
    | (string & {})
  /** AT-URI of the persona kind definition node. Community-expandable via knowledge graph. */
  kindUri?: string
  /** Persona kind slug (fallback when kindUri unavailable). */
  kind?:
    | 'human-annotator'
    | 'ml-model'
    | 'guidelines-persona'
    | 'expert-panel'
    | 'crowd-worker'
    | 'custom'
    | (string & {})
  /** AT-URI of a parent persona this one specializes (e.g., 'Biomedical NER Annotator' specializes 'NER Annotator'). */
  parentRef?: string
  /** Ontologies this persona uses for annotation. */
  ontologyRefs?: string[]
  /** Annotation guidelines text. */
  guidelines?: string
  /** Annotation guidelines document. */
  guidelinesBlob?: BlobRef
  /** Knowledge graph references (e.g., ORCID, institutional identifiers, Wikidata for organizations). */
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
