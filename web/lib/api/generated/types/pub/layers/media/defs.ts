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

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.layers.media.defs'

/** Composable audio metadata. Attach to any media record representing audio content: standalone audio files, audio tracks in video, etc. */
export interface AudioInfo {
  $type?: 'pub.layers.media.defs#audioInfo'
  /** Audio sample rate in Hz (e.g., 8000, 16000, 22050, 44100, 48000). */
  sampleRate?: number
  /** Number of audio channels. */
  channels?: number
  /** Audio bit depth (e.g., 16, 24, 32). */
  bitDepth?: number
  /** Audio codec identifier (e.g., 'pcm_s16le', 'aac', 'opus', 'flac'). */
  codec?: string
  /** Audio bitrate in bits per second. */
  bitRate?: number
  /** Bitrate mode. */
  bitRateMode?: 'cbr' | 'vbr' | (string & {})
  /** Total number of audio samples. Enables sample-accurate alignment. */
  numberOfSamples?: number
  /** Number of distinct speakers (for spoken language data). */
  speakerCount?: number
  /** AT-URI of a pub.layers.expression containing the transcript. */
  transcriptRef?: string
  /** AT-URI of a pub.layers.segmentation record structuring the transcript. */
  segmentationRef?: string
}

const hashAudioInfo = 'audioInfo'

export function isAudioInfo<V>(v: V) {
  return is$typed(v, id, hashAudioInfo)
}

export function validateAudioInfo<V>(v: V) {
  return validate<AudioInfo & V>(v, id, hashAudioInfo)
}

/** Composable video metadata. Attach to any media record representing video content. */
export interface VideoInfo {
  $type?: 'pub.layers.media.defs#videoInfo'
  /** Width in pixels. */
  width?: number
  /** Height in pixels. */
  height?: number
  /** Frame rate scaled by 100 (e.g., 2997 = 29.97fps). Avoids floats. */
  frameRate?: number
  /** Video codec identifier (e.g., 'h264', 'h265', 'vp9', 'av1', 'prores'). */
  codec?: string
  /** Display aspect ratio (e.g., '16:9', '4:3', '1:1'). */
  aspectRatio?: string
  /** Color space. */
  colorSpace?:
    | 'rgb'
    | 'yuv420'
    | 'yuv422'
    | 'yuv444'
    | 'grayscale'
    | (string & {})
  /** Video bitrate in bits per second. */
  bitRate?: number
  /** Scan type. Affects frame extraction for annotation. */
  scanType?: 'progressive' | 'interlaced' | (string & {})
}

const hashVideoInfo = 'videoInfo'

export function isVideoInfo<V>(v: V) {
  return is$typed(v, id, hashVideoInfo)
}

export function validateVideoInfo<V>(v: V) {
  return validate<VideoInfo & V>(v, id, hashVideoInfo)
}

/** Composable document/image metadata. Attach to any media record representing scanned documents, manuscripts, printed text, or other page-based media for OCR/HTR annotation workflows. */
export interface DocumentInfo {
  $type?: 'pub.layers.media.defs#documentInfo'
  /** Scanning resolution in dots per inch (300+ recommended for OCR). */
  dpi?: number
  /** Scan color mode. */
  colorMode?: 'color' | 'grayscale' | 'bitonal' | (string & {})
  /** Number of pages in the document. */
  pageCount?: number
  /** Writing system (ISO 15924 codes: 'Latn', 'Arab', 'Deva', 'Hans', 'Hant', 'Cyrl', 'Grek', etc.). */
  scriptSystem?: string
  /** Primary text direction. */
  writingDirection?: 'ltr' | 'rtl' | 'ttb' | 'btt' | (string & {})
  /** OCR/HTR engine identifier (e.g., 'tesseract-5.3', 'transkribus', 'abbyy', 'google-vision'). */
  ocrEngine?: string
}

const hashDocumentInfo = 'documentInfo'

export function isDocumentInfo<V>(v: V) {
  return is$typed(v, id, hashDocumentInfo)
}

export function validateDocumentInfo<V>(v: V) {
  return validate<DocumentInfo & V>(v, id, hashDocumentInfo)
}
