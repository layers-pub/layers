/**
 * Static registry mapping annotation protocols to their metadata.
 *
 * Maps all 20 panproto-backed annotation protocols plus the hand-written
 * bead-jsonlines format to display names, file extensions, MIME types,
 * and Layers import format keys.
 *
 * @module
 */

import type { ImportFormat } from '@/types/interfaces/plugin.interface.js';

/**
 * Metadata for a single annotation protocol.
 */
export interface ProtocolMeta {
  /** The panproto protocol identifier (snake_case). */
  readonly protocol: string;
  /** The Layers format key (kebab-case). */
  readonly format: ImportFormat;
  /** Human-readable display name. */
  readonly name: string;
  /** Recognized file extensions (without leading dot). */
  readonly extensions: readonly string[];
  /** Primary MIME type for the format. */
  readonly mimeType: string;
  /** The default file extension used when generating output. */
  readonly primaryExtension: string;
}

/**
 * The 20 panproto-backed annotation protocols.
 *
 * Each entry uses the exact panproto protocol ID from
 * PROTOCOL_CATEGORIES.annotation, plus "praat" which is being
 * added to panproto.
 */
export const ANNOTATION_PROTOCOLS: readonly ProtocolMeta[] = [
  {
    protocol: 'brat',
    format: 'brat',
    name: 'brat standoff',
    extensions: ['ann', 'txt'],
    mimeType: 'text/plain',
    primaryExtension: 'ann',
  },
  {
    protocol: 'conllu',
    format: 'conllu',
    name: 'CoNLL-U',
    extensions: ['conllu', 'conll'],
    mimeType: 'text/plain',
    primaryExtension: 'conllu',
  },
  {
    protocol: 'naf',
    format: 'naf',
    name: 'NAF (NLP Annotation Format)',
    extensions: ['naf', 'xml'],
    mimeType: 'application/xml',
    primaryExtension: 'naf',
  },
  {
    protocol: 'uima',
    format: 'uima',
    name: 'UIMA CAS XMI',
    extensions: ['xmi', 'xml'],
    mimeType: 'application/xml',
    primaryExtension: 'xmi',
  },
  {
    protocol: 'folia',
    format: 'folia',
    name: 'FoLiA',
    extensions: ['folia.xml', 'xml'],
    mimeType: 'application/xml',
    primaryExtension: 'folia.xml',
  },
  {
    protocol: 'tei',
    format: 'tei',
    name: 'TEI XML',
    extensions: ['xml', 'tei'],
    mimeType: 'application/xml',
    primaryExtension: 'xml',
  },
  {
    protocol: 'timeml',
    format: 'timeml',
    name: 'TimeML',
    extensions: ['tml', 'xml'],
    mimeType: 'application/xml',
    primaryExtension: 'tml',
  },
  {
    protocol: 'elan',
    format: 'elan',
    name: 'ELAN',
    extensions: ['eaf'],
    mimeType: 'application/xml',
    primaryExtension: 'eaf',
  },
  {
    protocol: 'iso_space',
    format: 'iso-space',
    name: 'ISO-Space',
    extensions: ['xml'],
    mimeType: 'application/xml',
    primaryExtension: 'xml',
  },
  {
    protocol: 'paula',
    format: 'paula',
    name: 'PAULA XML',
    extensions: ['xml', 'paula'],
    mimeType: 'application/xml',
    primaryExtension: 'xml',
  },
  {
    protocol: 'laf_graf',
    format: 'laf-graf',
    name: 'LAF/GrAF',
    extensions: ['xml', 'graf'],
    mimeType: 'application/xml',
    primaryExtension: 'xml',
  },
  {
    protocol: 'decomp',
    format: 'decomp',
    name: 'Decomp',
    extensions: ['json'],
    mimeType: 'application/json',
    primaryExtension: 'json',
  },
  {
    protocol: 'ucca',
    format: 'ucca',
    name: 'UCCA',
    extensions: ['xml', 'json'],
    mimeType: 'application/xml',
    primaryExtension: 'xml',
  },
  {
    protocol: 'fovea',
    format: 'fovea',
    name: 'Fovea',
    extensions: ['json'],
    mimeType: 'application/json',
    primaryExtension: 'json',
  },
  {
    protocol: 'bead',
    format: 'bead',
    name: 'BEAD',
    extensions: ['bead', 'json'],
    mimeType: 'application/json',
    primaryExtension: 'bead',
  },
  {
    protocol: 'web_annotation',
    format: 'web-annotation',
    name: 'W3C Web Annotation',
    extensions: ['json', 'jsonld'],
    mimeType: 'application/ld+json',
    primaryExtension: 'json',
  },
  {
    protocol: 'amr',
    format: 'amr',
    name: 'AMR (Abstract Meaning Representation)',
    extensions: ['amr', 'txt'],
    mimeType: 'text/plain',
    primaryExtension: 'amr',
  },
  {
    protocol: 'concrete',
    format: 'concrete',
    name: 'Concrete',
    extensions: ['concrete', 'comm'],
    mimeType: 'application/octet-stream',
    primaryExtension: 'concrete',
  },
  {
    protocol: 'nif',
    format: 'nif',
    name: 'NIF (NLP Interchange Format)',
    extensions: ['ttl', 'rdf', 'jsonld'],
    mimeType: 'text/turtle',
    primaryExtension: 'ttl',
  },
  {
    protocol: 'praat',
    format: 'praat',
    name: 'Praat TextGrid',
    extensions: ['TextGrid'],
    mimeType: 'text/plain',
    primaryExtension: 'TextGrid',
  },
] as const;

/**
 * Metadata for the hand-written bead-jsonlines format.
 *
 * This format is not backed by a panproto protocol; it uses a
 * custom reader/writer in the Layers import pipeline.
 */
const BEAD_JSONLINES_META: ProtocolMeta = {
  protocol: 'bead_jsonlines',
  format: 'bead-jsonlines',
  name: 'BEAD JSON Lines',
  extensions: ['jsonl', 'ndjson'],
  mimeType: 'application/x-ndjson',
  primaryExtension: 'jsonl',
};

/**
 * All 21 supported import formats (20 panproto-backed protocols plus bead-jsonlines).
 */
export const ALL_FORMATS: readonly ProtocolMeta[] = [
  ...ANNOTATION_PROTOCOLS,
  BEAD_JSONLINES_META,
] as const;

/** Lookup index by Layers format key. */
const FORMAT_INDEX = new Map<string, ProtocolMeta>(ALL_FORMATS.map((meta) => [meta.format, meta]));

/** Lookup index by panproto protocol ID. */
const PROTOCOL_INDEX = new Map<string, ProtocolMeta>(
  ALL_FORMATS.map((meta) => [meta.protocol, meta]),
);

/**
 * Finds protocol metadata by Layers import format key.
 *
 * @param format - the Layers format key (e.g., "conllu", "brat", "bead-jsonlines")
 * @returns the protocol metadata, or undefined if the format is not recognized
 */
export function getProtocolMeta(format: ImportFormat): ProtocolMeta | undefined {
  return FORMAT_INDEX.get(format);
}

/**
 * Finds protocol metadata by panproto protocol identifier.
 *
 * @param panprotoId - the panproto protocol ID (e.g., "conllu", "brat", "bead_jsonlines")
 * @returns the protocol metadata, or undefined if the ID is not recognized
 */
export function getProtocolByPanprotoId(panprotoId: string): ProtocolMeta | undefined {
  return PROTOCOL_INDEX.get(panprotoId);
}
