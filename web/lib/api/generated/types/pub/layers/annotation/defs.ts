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
const id = 'pub.layers.annotation.defs'

/** A single abstract annotation. The fields populated depend on the layer's kind/subkind. For token-tags: tokenIndex + label. For spans: anchor + label. For trees: anchor + label + parentId/childIds. For relations: anchor + arguments. For graphs: anchor + arguments or headIndex/targetIndex. This single type replaces the former tag, spanAnnotation, entityMention, situationMention, dependencyArc, parseNode, etc. */
export interface Annotation {
  $type?: 'pub.layers.annotation.defs#annotation'
  uuid: PubLayersDefs.Uuid
  anchor?: PubLayersDefs.Anchor
  /** For token-level annotations: 0-based index into the tokenization. */
  tokenIndex?: number
  /** The primary label (POS tag, entity type, frame name, constituent label, dependency relation, etc.). */
  label?: string
  /** Secondary value (lemma form, gloss, normalized temporal value, etc.). */
  value?: string
  /** Surface text of the annotated span. */
  text?: string
  parentId?: PubLayersDefs.Uuid
  /** Child annotation UUIDs in tree structures. */
  childIds?: PubLayersDefs.Uuid[]
  /** Head/governor token index for directed arcs (dependency parsing). -1 for root. */
  headIndex?: number
  /** Dependent/target token index for directed arcs. */
  targetIndex?: number
  /** Role/argument fillers for predicate-argument structures (FrameNet, PropBank, AMR, etc.). Each argument references another annotation. */
  arguments?: ArgumentRef[]
  /** Confidence score 0-1000. */
  confidence?: number
  /** Reference to a type definition in a pub.layers.ontology. */
  ontologyTypeRef?: string
  /** Links to external knowledge bases. */
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
  temporal?: PubLayersDefs.TemporalExpression
  spatial?: PubLayersDefs.SpatialExpression
  features?: PubLayersDefs.FeatureMap
}

const hashAnnotation = 'annotation'

export function isAnnotation<V>(v: V) {
  return is$typed(v, id, hashAnnotation)
}

export function validateAnnotation<V>(v: V) {
  return validate<Annotation & V>(v, id, hashAnnotation)
}

/** A role/argument reference in a predicate-argument structure. Uses the composable objectRef to point to another annotation, either locally (same layer, by UUID) or remotely (cross-layer or cross-record, by AT-URI + UUID). */
export interface ArgumentRef {
  $type?: 'pub.layers.annotation.defs#argumentRef'
  /** The argument role label (e.g., ARG0, Agent, Theme, CAUSE, connective, etc.). */
  role: string
  target: PubLayersDefs.ObjectRef
  features?: PubLayersDefs.FeatureMap
}

const hashArgumentRef = 'argumentRef'

export function isArgumentRef<V>(v: V) {
  return is$typed(v, id, hashArgumentRef)
}

export function validateArgumentRef<V>(v: V) {
  return validate<ArgumentRef & V>(v, id, hashArgumentRef)
}

/** A cluster of annotations (e.g., coreferent entity mentions, situation mentions referring to the same situation). */
export interface Cluster {
  $type?: 'pub.layers.annotation.defs#cluster'
  uuid: PubLayersDefs.Uuid
  /** The canonical/representative label for this cluster. */
  canonicalLabel?: string
  /** References to the annotations in this cluster. Use localId for same-layer members, recordRef+objectId for cross-layer or cross-document coreference. */
  members: PubLayersDefs.ObjectRef[]
  knowledgeRefs?: PubLayersDefs.KnowledgeRef[]
  features?: PubLayersDefs.FeatureMap
}

const hashCluster = 'cluster'

export function isCluster<V>(v: V) {
  return is$typed(v, id, hashCluster)
}

export function validateCluster<V>(v: V) {
  return validate<Cluster & V>(v, id, hashCluster)
}
