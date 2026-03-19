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
const id = 'pub.layers.expression.expression'

export interface Main {
  $type: 'pub.layers.expression.expression'
  /** A corpus-level unique identifier (headline, URL, document ID, etc.). */
  id: string
  /** AT-URI of the expression kind definition node. Community-expandable via knowledge graph. */
  kindUri?: string
  /** Expression kind slug (fallback when kindUri unavailable). */
  kind:
    | 'document'
    | 'transcript'
    | 'dialogue'
    | 'social-media'
    | 'email'
    | 'article'
    | 'recording'
    | 'video'
    | 'multimodal'
    | 'code'
    | 'section'
    | 'paragraph'
    | 'chapter'
    | 'turn'
    | 'utterance'
    | 'heading'
    | 'list'
    | 'sentence'
    | 'clause'
    | 'phrase'
    | 'word'
    | 'morpheme'
    | 'character'
    | 'other'
    | (string & {})
  /** The full raw text of the expression. All byte-offset spans reference this string. */
  text?: string
  /** Reference to the parent Expression this one is nested within. Absent for top-level expressions (documents, recordings, etc.). */
  parentRef?: string
  anchor?: PubLayersDefs.Anchor
  /** Reference to an associated media record (audio, video, image). */
  mediaRef?: string
  /** Optional inline media blob. */
  mediaBlob?: BlobRef
  /** BCP-47 language tag for the primary language. */
  language?: string
  /** Additional BCP-47 tags for multilingual or code-switching expressions. */
  languages?: string[]
  metadata?: PubLayersDefs.AnnotationMetadata
  features?: PubLayersDefs.FeatureMap
  /** URL of the external web resource this expression was derived from or annotates. The appview indexes this field to discover co-located annotations from other ATProto apps. */
  sourceUrl?: string
  /** AT-URI of an external ATProto record this expression is derived from or annotates (e.g., a standard.site Leaflet post, a com.whtwnd blog entry, an app.bsky.feed.post, an at.margin.bookmark). */
  sourceRef?: string
  /** Reference to an eprint record that this expression is associated with. */
  eprintRef?: string
  /** References to knowledge base entries relevant to this expression. */
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
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
