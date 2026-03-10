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
const id = 'pub.layers.graph.defs'

/** A single directed edge entry within a graphEdgeSet. */
export interface GraphEdgeEntry {
  $type?: 'pub.layers.graph.defs#graphEdgeEntry'
  uuid: PubLayersDefs.Uuid
  /** AT-URI of the edge type definition node. Overrides the set-level edgeType. */
  edgeTypeUri?: string
  /** Edge type slug. Overrides the set-level edgeType if different. */
  edgeType: string
  source: PubLayersDefs.ObjectRef
  target: PubLayersDefs.ObjectRef
  confidence?: number
  features?: PubLayersDefs.FeatureMap
}

const hashGraphEdgeEntry = 'graphEdgeEntry'

export function isGraphEdgeEntry<V>(v: V) {
  return is$typed(v, id, hashGraphEdgeEntry)
}

export function validateGraphEdgeEntry<V>(v: V) {
  return validate<GraphEdgeEntry & V>(v, id, hashGraphEdgeEntry)
}
