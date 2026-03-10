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

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.eprint.defs'

/** Information about how to reproduce the data from the eprint. */
export interface ReproducibilityInfo {
  $type?: 'pub.layers.eprint.defs#reproducibilityInfo'
  /** URI of the code repository. */
  codeUri?: string
  /** Git commit hash for reproducibility. */
  commitHash?: string
  /** Command to reproduce the data. */
  command?: string
  /** Environment specification (Docker image, conda env, etc.). */
  environment?: string
  /** Random seed used. */
  randomSeed?: number
}

const hashReproducibilityInfo = 'reproducibilityInfo'

export function isReproducibilityInfo<V>(v: V) {
  return is$typed(v, id, hashReproducibilityInfo)
}

export function validateReproducibilityInfo<V>(v: V) {
  return validate<ReproducibilityInfo & V>(v, id, hashReproducibilityInfo)
}
