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
import type * as PubLayersMediaDefs from './defs'
import type * as PubLayersDefs from '../defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.media.media'

export interface Main {
  $type: 'pub.layers.media.media'
  /** AT-URI of the media kind definition node. Community-expandable via knowledge graph. */
  kindUri?: string
  /** Media kind slug (fallback when kindUri unavailable). */
  kind: 'audio' | 'video' | 'image' | 'document' | (string & {})
  title?: string
  description?: string
  /** The media blob. */
  blob?: BlobRef
  /** URI for externally hosted media. */
  externalUri?: string
  mimeType?: string
  /** Duration in milliseconds (for audio/video). */
  durationMs?: number
  /** File size in bytes. */
  fileSizeBytes?: number
  /** AT-URI of the parent media record this excerpt/clip was extracted from. */
  parentMediaRef?: string
  /** Offset in milliseconds where this excerpt starts within the parent media. Used with parentMediaRef. */
  startOffsetMs?: number
  audio?: PubLayersMediaDefs.AudioInfo
  video?: PubLayersMediaDefs.VideoInfo
  document?: PubLayersMediaDefs.DocumentInfo
  /** BCP-47 language tag. */
  language?: string
  /** Knowledge graph references. */
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
  metadata?: PubLayersDefs.AnnotationMetadata
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
