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
const id = 'pub.layers.alignment.alignment'

export interface Main {
  $type: 'pub.layers.alignment.alignment'
  /** Primary expression context (for within-document alignments). */
  expression?: string
  /** AT-URI of the alignment kind definition node. Community-expandable via knowledge graph. */
  kindUri?: string
  /** Alignment kind slug (fallback). The type of alignment. */
  kind:
    | 'tokenization-to-tokenization'
    | 'interlinear'
    | 'parallel-text'
    | 'audio-to-text'
    | 'layer-to-layer'
    | 'error-to-correction'
    | 'custom'
    | (string & {})
  /** AT-URI of the alignment subkind definition node. Community-expandable via knowledge graph. */
  subkindUri?: string
  /** Alignment subkind slug (fallback). More specific alignment type within the kind. */
  subkind?:
    | 'word-to-morpheme'
    | 'word-to-word'
    | 'sentence-to-sentence'
    | 'phrase-to-phrase'
    | 'morpheme-to-gloss'
    | 'forced-alignment'
    | 'manual-alignment'
    | 'custom'
    | (string & {})
  source?: PubLayersDefs.ObjectRef
  target?: PubLayersDefs.ObjectRef
  /** BCP-47 language tag for the source (for parallel text alignment). */
  sourceLang?: string
  /** BCP-47 language tag for the target. */
  targetLang?: string
  /** The alignment links. */
  links: PubLayersDefs.AlignmentLink[]
  metadata?: PubLayersDefs.AnnotationMetadata
  /** Knowledge graph references for this alignment (e.g., alignment model, parallel corpus source). */
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
