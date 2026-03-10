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
import type * as PubLayersCorpusDefs from './defs'
import type * as PubLayersDefs from '../defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.corpus.corpus'

export interface Main {
  $type: 'pub.layers.corpus.corpus'
  /** Corpus name. */
  name: string
  description?: string
  version?: string
  /** Primary BCP-47 language tag. */
  language?: string
  /** All languages represented. */
  languages?: string[]
  /** AT-URI of the domain definition node. Community-expandable via knowledge graph. */
  domainUri?: string
  /** Domain slug (fallback when domainUri unavailable). */
  domain?:
    | 'news'
    | 'biomedical'
    | 'legal'
    | 'social-media'
    | 'dialogue'
    | 'literary'
    | 'scientific'
    | 'web'
    | 'spoken'
    | 'custom'
    | (string & {})
  /** License identifier (e.g., 'CC-BY-4.0', 'LDC-User-Agreement'). */
  license?: string
  /** Ontologies used in this corpus. */
  ontologyRefs?: string[]
  /** Eprint links for this corpus. */
  eprintRefs?: string[]
  /** Number of expressions in the corpus. */
  expressionCount?: number
  annotationDesign?: PubLayersCorpusDefs.AnnotationDesign
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
