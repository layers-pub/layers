// @ts-nocheck
/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc'
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'
import type * as PubLayersJudgmentExperimentDef from './experimentDef'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.judgment.listExperimentDefs'

export type QueryParams = {
  repo: string
  measureType?: string
  taskType?: string
  limit?: number
  cursor?: string
}
export type InputSchema = undefined

export interface OutputSchema {
  cursor?: string
  records: RecordView[]
}

export interface CallOptions {
  signal?: AbortSignal
  headers?: HeadersMap
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export function toKnownErr(e: any) {
  return e
}

export interface RecordView {
  $type?: 'pub.layers.judgment.listExperimentDefs#recordView'
  uri: string
  cid: string
  value: PubLayersJudgmentExperimentDef.Main
}

const hashRecordView = 'recordView'

export function isRecordView<V>(v: V) {
  return is$typed(v, id, hashRecordView)
}

export function validateRecordView<V>(v: V) {
  return validate<RecordView & V>(v, id, hashRecordView)
}
