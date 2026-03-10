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
const id = 'pub.layers.eprint.eprint'

export interface Main {
  $type: 'pub.layers.eprint.eprint'
  /** The eprint identifier (DOI, arXiv ID, ACL Anthology ID, etc.). */
  eprintIdentifier: string
  /** AT-URI of the identifier type definition node. Community-expandable via knowledge graph. */
  eprintIdentifierTypeUri?: string
  /** Identifier type slug (fallback when eprintIdentifierTypeUri unavailable). */
  eprintIdentifierType?:
    | 'doi'
    | 'arxiv'
    | 'acl-anthology'
    | 'semantic-scholar'
    | 'pubmed'
    | 'isbn'
    | 'url'
    | 'at-uri'
    | 'custom'
    | (string & {})
  /** Full URI of the eprint. */
  eprintUri?: string
  /** AT-URI of the eprint record on its publication platform (e.g., chive.pub, any ATProto-native publication service). */
  platformEprintRef?: string
  /** AT-URI of the link type definition node. Community-expandable via knowledge graph. */
  linkTypeUri?: string
  /** Link type slug (fallback when linkTypeUri unavailable). */
  linkType:
    | 'produced-by'
    | 'described-in'
    | 'evaluated-in'
    | 'replicated-from'
    | 'extends'
    | 'supplements'
    | 'cited-in'
    | 'annotates'
    | 'training-data-for'
    | 'test-data-for'
    | (string & {})
  /** References to Layers expressions linked to this eprint. */
  expressionRefs?: string[]
  /** References to specific annotation records linked to this eprint. */
  annotationRefs?: string[]
  /** Reference to a corpus record. */
  corpusRef?: string
  /** Description of the relationship. */
  description?: string
  /** Full citation string. */
  citation?: string
  /** Knowledge graph references (e.g., Wikidata for the venue, DBLP, Semantic Scholar corpus ID). */
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
