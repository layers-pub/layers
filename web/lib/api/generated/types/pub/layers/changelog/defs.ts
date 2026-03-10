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
const id = 'pub.layers.changelog.defs'

/** A semantic version following the major.minor.patch convention. */
export interface SemanticVersion {
  $type?: 'pub.layers.changelog.defs#semanticVersion'
  /** Major version number. */
  major: number
  /** Minor version number. */
  minor: number
  /** Patch version number. */
  patch: number
}

const hashSemanticVersion = 'semanticVersion'

export function isSemanticVersion<V>(v: V) {
  return is$typed(v, id, hashSemanticVersion)
}

export function validateSemanticVersion<V>(v: V) {
  return validate<SemanticVersion & V>(v, id, hashSemanticVersion)
}

/** A group of changes under a single category. */
export interface ChangeSection {
  $type?: 'pub.layers.changelog.defs#changeSection'
  /** Category of changes. */
  category:
    | 'annotations'
    | 'segmentation'
    | 'text'
    | 'ontology'
    | 'corpus'
    | 'alignment'
    | 'graph'
    | 'experiment'
    | 'resource'
    | 'media'
    | 'provenance'
    | 'references'
    | 'corrections'
    | 'other'
    | (string & {})
  /** Individual change items in this section. */
  items: ChangeItem[]
}

const hashChangeSection = 'changeSection'

export function isChangeSection<V>(v: V) {
  return is$typed(v, id, hashChangeSection)
}

export function validateChangeSection<V>(v: V) {
  return validate<ChangeSection & V>(v, id, hashChangeSection)
}

/** An individual change entry. The targets field uses objectRef for machine-readable sub-record targeting, allowing a change item to point at specific objects within the subject record. */
export interface ChangeItem {
  $type?: 'pub.layers.changelog.defs#changeItem'
  /** Description of the change. */
  description: string
  /** Type of change. */
  changeType?:
    | 'added'
    | 'changed'
    | 'removed'
    | 'fixed'
    | 'deprecated'
    | (string & {})
  /** Specific objects that changed. Uses recordRef + objectId for sub-record targeting (e.g., a specific annotation within an annotation layer). */
  targets?: PubLayersDefs.ObjectRef[]
  /** Path to the changed field within the target (e.g., 'annotations/3/label', 'formalism', 'annotationDesign/guidelinesRef'). */
  fieldPath?: string
  /** Previous value as a display string. */
  previousValue?: string
  /** New value as a display string. */
  newValue?: string
}

const hashChangeItem = 'changeItem'

export function isChangeItem<V>(v: V) {
  return is$typed(v, id, hashChangeItem)
}

export function validateChangeItem<V>(v: V) {
  return validate<ChangeItem & V>(v, id, hashChangeItem)
}
