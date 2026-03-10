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
import type * as PubLayersEprintDefs from './defs'
import type * as PubLayersDefs from '../defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.eprint.dataLink'

export interface Main {
  $type: 'pub.layers.eprint.dataLink'
  /** AT-URI of the eprint on its publication platform. */
  eprintUri: string
  /** DID of the eprint author/owner on the publication platform. */
  eprintDid?: string
  /** AT-URI of the data kind definition node. Community-expandable via knowledge graph. */
  dataKindUri?: string
  /** Data kind slug (fallback when dataKindUri unavailable). */
  dataKind:
    | 'corpus'
    | 'annotation-layer'
    | 'model-output'
    | 'gold-standard'
    | 'evaluation-data'
    | 'supplementary'
    | 'replication'
    | (string & {})
  /** Reference to a Layers corpus. */
  corpusRef?: string
  /** References to specific Layers expressions. */
  expressionRefs?: string[]
  /** References to specific annotation records. */
  annotationRefs?: string[]
  description?: string
  /** Which section of the paper this data corresponds to (e.g., 'Section 4.2', 'Table 3', 'Appendix A'). */
  paperSection?: string
  reproducibility?: PubLayersEprintDefs.ReproducibilityInfo
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
