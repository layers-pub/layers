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
import type * as PubLayersChangelogDefs from './defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.changelog.entry'

export interface Main {
  $type: 'pub.layers.changelog.entry'
  /** AT-URI of the record this changelog describes (any pub.layers.* record). */
  subject: string
  /** The NSID of the subject record's collection (e.g., 'pub.layers.annotation.annotationLayer'). Enables efficient filtering by record type without resolving the AT-URI. */
  subjectCollection: string
  version?: PubLayersChangelogDefs.SemanticVersion
  previousVersion?: PubLayersChangelogDefs.SemanticVersion
  /** One-line summary of changes. */
  summary: string
  /** Categorized change sections. */
  sections: PubLayersChangelogDefs.ChangeSection[]
  /** When this changelog entry was created. */
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
