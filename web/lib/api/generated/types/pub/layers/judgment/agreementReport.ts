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
const id = 'pub.layers.judgment.agreementReport'

export interface Main {
  $type: 'pub.layers.judgment.agreementReport'
  experimentRef: string
  /** The judgment sets compared. */
  judgmentSetRefs?: string[]
  /** AT-URI of the metric definition node. Community-expandable via knowledge graph. */
  metricUri?: string
  /** Metric slug (fallback when metricUri unavailable). */
  metric?:
    | 'cohens-kappa'
    | 'fleiss-kappa'
    | 'krippendorff-alpha'
    | 'percent-agreement'
    | 'correlation'
    | 'f1'
    | 'custom'
    | (string & {})
  /** Metric value scaled 0-1000. */
  value?: number
  numAnnotators?: number
  numItems?: number
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
