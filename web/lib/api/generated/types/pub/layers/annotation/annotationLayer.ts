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
import type * as PubLayersAnnotationDefs from './defs'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.annotation.annotationLayer'

export interface Main {
  $type: 'pub.layers.annotation.annotationLayer'
  /** The expression this annotation layer applies to. */
  expression: string
  /** AT-URI of the annotation kind definition node. Community-expandable via knowledge graph. */
  kindUri?: string
  /** Primary annotation kind slug (fallback when kindUri unavailable). Determines the structural interpretation of annotations in this layer. */
  kind:
    | 'token-tag'
    | 'span'
    | 'relation'
    | 'tree'
    | 'graph'
    | 'tier'
    | 'document-tag'
    | (string & {})
  /** AT-URI of the annotation subkind definition node. Community-expandable via knowledge graph. */
  subkindUri?: string
  /** Annotation subkind slug (fallback when subkindUri unavailable). The appview uses this for specialized rendering. */
  subkind?:
    | 'pos'
    | 'xpos'
    | 'ner'
    | 'lemma'
    | 'morph'
    | 'supersense'
    | 'sense'
    | 'chunk'
    | 'speaker'
    | 'gloss'
    | 'phonetic'
    | 'prosody'
    | 'tobi'
    | 'language-id'
    | 'entity-mention'
    | 'situation-mention'
    | 'frame'
    | 'predicate'
    | 'discourse-unit'
    | 'speech-act'
    | 'temporal-expression'
    | 'temporal-signal'
    | 'spatial-expression'
    | 'spatial-signal'
    | 'spatial-relation'
    | 'location-mention'
    | 'sentiment'
    | 'emotion'
    | 'stance'
    | 'information-structure'
    | 'error'
    | 'correction'
    | 'code-switch'
    | 'highlight'
    | 'comment'
    | 'bookmark'
    | 'temporal-value'
    | 'temporal-vagueness'
    | 'dependency'
    | 'enhanced-dependency'
    | 'constituency'
    | 'ccg'
    | 'coreference'
    | 'bridging'
    | 'temporal-relation'
    | 'causal-relation'
    | 'discourse-relation'
    | 'custom'
    | (string & {})
  /** AT-URI of the formalism definition node. Community-expandable via knowledge graph. */
  formalismUri?: string
  /** Formalism slug (fallback when formalismUri unavailable). The linguistic formalism or annotation standard used. */
  formalism?:
    | 'universal-dependencies'
    | 'penn-treebank'
    | 'stanford'
    | 'prague'
    | 'propbank'
    | 'framenet'
    | 'verbnet'
    | 'amr'
    | 'ucca'
    | 'rst'
    | 'erst'
    | 'sdrt'
    | 'pdtb'
    | 'timeml'
    | 'iso-space'
    | 'spatialml'
    | 'conll-u'
    | 'brat'
    | 'elan'
    | 'leipzig-glossing'
    | 'ipa'
    | 'tobi'
    | 'bpe'
    | 'sentencepiece'
    | 'unimorph'
    | 'wals'
    | 'custom'
    | (string & {})
  /** AT-URI of the annotation source method definition node. Community-expandable via knowledge graph. */
  sourceMethodUri?: string
  /** How this annotation layer was produced (fallback when sourceMethodUri unavailable). Follows UD's per-layer annotation source tracking. */
  sourceMethod?:
    | 'manual-native'
    | 'manual-corrected'
    | 'automatic'
    | 'automatic-corrected'
    | 'converted'
    | 'converted-corrected'
    | 'crowd-sourced'
    | 'custom'
    | (string & {})
  /** Identifier for the label set used (e.g., 'universal-pos', 'ontonotes-ner', 'penn-treebank-pos'). */
  labelSet?: string
  /** Reference to a pub.layers.ontology defining the types used in this layer. */
  ontologyRef?: string
  tokenizationId?: PubLayersDefs.Uuid
  /** Rank among k-best alternatives (1 = best). */
  rank?: number
  /** Reference to the top-ranked layer in a k-best group. */
  alternativesRef?: string
  /** For dependent/subordinate layers: the parent layer this one subdivides or refines. Supports ELAN-style tier dependencies, error-correction pairs, etc. */
  parentLayerRef?: string
  /** BCP-47 language tag for this annotation layer, if different from the expression's language. */
  language?: string
  /** The annotations in this layer. */
  annotations: PubLayersAnnotationDefs.Annotation[]
  metadata?: PubLayersDefs.AnnotationMetadata
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
