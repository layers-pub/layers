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
const id = 'pub.layers.segmentation.defs'

/** A single token within a tokenization. */
export interface Token {
  $type?: 'pub.layers.segmentation.defs#token'
  /** Position of this token in the tokenization (0-based). */
  tokenIndex: number
  /** The surface form of the token. */
  text?: string
  textSpan?: PubLayersDefs.Span
  temporalSpan?: PubLayersDefs.TemporalSpan
}

const hashToken = 'token'

export function isToken<V>(v: V) {
  return is$typed(v, id, hashToken)
}

export function validateToken<V>(v: V) {
  return validate<Token & V>(v, id, hashToken)
}

/** An ordered sequence of tokens for an expression or sub-expression. Multiple tokenizations can coexist for the same expression (e.g., whitespace vs. BPE vs. morphological), enabling interlinear glossing, alternative segmentation strategies, or multi-granularity analysis. */
export interface Tokenization {
  $type?: 'pub.layers.segmentation.defs#tokenization'
  uuid: PubLayersDefs.Uuid
  /** AT-URI of the tokenization kind definition node. Community-expandable via knowledge graph. */
  kindUri?: string
  /** Tokenization kind slug (fallback when kindUri unavailable). */
  kind:
    | 'whitespace'
    | 'penn-treebank'
    | 'bpe'
    | 'sentencepiece'
    | 'character'
    | 'morphological'
    | 'custom'
    | (string & {})
  /** Reference to the specific sub-expression this tokenization covers (e.g., a sentence-level expression). If absent, covers the entire expression referenced by the segmentation record. */
  expressionRef?: string
  /** The ordered token sequence. */
  tokens: Token[]
  metadata?: PubLayersDefs.AnnotationMetadata
}

const hashTokenization = 'tokenization'

export function isTokenization<V>(v: V) {
  return is$typed(v, id, hashTokenization)
}

export function validateTokenization<V>(v: V) {
  return validate<Tokenization & V>(v, id, hashTokenization)
}
