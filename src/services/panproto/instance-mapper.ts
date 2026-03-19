/**
 * Bidirectional mapping between panproto lens output and Layers ImportResult.
 *
 * The `toImportResult` function takes the plain-object view produced by a
 * panproto lens `get` operation and reshapes it into the ImportResult
 * structure expected by the Layers import pipeline.
 *
 * The `fromLayersData` function takes Layers record arrays and produces
 * the plain-object shape expected by a panproto lens `put` operation
 * for export back to a source format.
 *
 * @module
 */

import type {
  ImportFormat,
  ImportMetadata,
  ImportResult,
} from '@/types/interfaces/plugin.interface.js';

/**
 * Shape of the plain object produced by a panproto lens `get` on
 * an annotation-protocol instance.
 *
 * This is the generic view structure; actual protocols may include
 * additional protocol-specific fields which are preserved in the
 * expressions/annotations as extra keys.
 */
interface PanprotoView {
  readonly expressions?: readonly Record<string, unknown>[];
  readonly segmentations?: readonly Record<string, unknown>[];
  readonly annotationLayers?: readonly Record<string, unknown>[];
  readonly [key: string]: unknown;
}

/**
 * Converts a panproto lens view into a Layers ImportResult.
 *
 * Extracts expressions, segmentations, and annotation layers from the
 * view object. Any data discarded during a lossy conversion is stored
 * in `metadata._complement` for potential round-trip restoration.
 *
 * @param view - the plain object from a panproto lens `get` call
 * @param format - the Layers import format identifier
 * @param complement - discarded data from a lossy lens (empty for isos)
 * @param opticKind - the optic category used for the conversion
 * @returns a structured ImportResult for the Layers import pipeline
 *
 * @example
 * ```typescript
 * const bytes = io.parse("conllu", schema, encoded);
 * const view = lens.get(bytes);
 * const result = toImportResult(view, "conllu", new Uint8Array(), "lens");
 * ```
 */
function toImportResult(
  view: unknown,
  format: ImportFormat,
  complement: Uint8Array,
  opticKind?: string,
): ImportResult {
  const typed = (view ?? {}) as PanprotoView;

  const expressions: Record<string, unknown>[] = [];
  const segmentations: Record<string, unknown>[] = [];
  const annotationLayers: Record<string, unknown>[] = [];

  // Extract expressions from the view. Each expression record is
  // expected to contain at minimum a `text` field.
  if (typed.expressions) {
    for (const expr of typed.expressions) {
      expressions.push({ ...expr, sourceFormat: format });
    }
  }

  // Extract segmentations. Each segmentation contains a tokens array
  // and optionally a strategy identifier.
  if (typed.segmentations) {
    for (const seg of typed.segmentations) {
      segmentations.push({ ...seg, sourceFormat: format });
    }
  }

  // Extract annotation layers. Each layer contains kind, subkind,
  // formalism, and an annotations array.
  if (typed.annotationLayers) {
    for (const layer of typed.annotationLayers) {
      annotationLayers.push({ ...layer, sourceFormat: format });
    }
  }

  const normalizedKind = normalizeOpticKind(opticKind);
  const complementData = complement.length > 0 ? complement : undefined;

  const metadata: ImportMetadata = {
    ...(normalizedKind != null ? { opticKind: normalizedKind } : {}),
    ...(complementData != null ? { _complement: complementData } : {}),
  };

  return {
    format,
    expressions,
    segmentations,
    annotationLayers,
    metadata,
  };
}

/**
 * Converts Layers record arrays into the shape expected by a panproto lens `put`.
 *
 * This is the inverse of `toImportResult`: it takes Layers-shaped records
 * and produces the view object that a lens can transform back into a
 * source-format byte stream.
 *
 * @param expressions - Layers expression records
 * @param segmentations - Layers segmentation records
 * @param annotationLayers - Layers annotation layer records
 * @returns a plain object in the panproto view shape
 *
 * @example
 * ```typescript
 * const view = fromLayersData(expressions, segmentations, layers);
 * const bytes = lens.put(view, complement);
 * const output = io.emit("conllu", schema, bytes);
 * ```
 */
function fromLayersData(
  expressions: readonly Record<string, unknown>[],
  segmentations: readonly Record<string, unknown>[],
  annotationLayers: readonly Record<string, unknown>[],
): unknown {
  // Strip Layers-specific metadata fields that are not part of the
  // panproto view model (sourceFormat, uri, cid, pds_url, etc.).
  const STRIP_KEYS = new Set([
    'sourceFormat',
    'uri',
    'cid',
    'did',
    'rkey',
    'pds_url',
    'indexed_at',
    'created_at',
  ]);

  const cleanRecord = (record: Record<string, unknown>): Record<string, unknown> => {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (!STRIP_KEYS.has(key)) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };

  return {
    expressions: expressions.map(cleanRecord),
    segmentations: segmentations.map(cleanRecord),
    annotationLayers: annotationLayers.map(cleanRecord),
  };
}

/**
 * Normalizes an optic kind string to the ImportMetadata union type.
 *
 * @param kind - the raw optic kind string from panproto
 * @returns the normalized optic kind, or undefined if unrecognized
 */
function normalizeOpticKind(
  kind: string | undefined,
): 'iso' | 'lens' | 'prism' | 'affine' | 'traversal' | undefined {
  if (!kind) return undefined;

  const VALID_KINDS = new Set(['iso', 'lens', 'prism', 'affine', 'traversal']);
  const lower = kind.toLowerCase();
  if (VALID_KINDS.has(lower)) {
    return lower as 'iso' | 'lens' | 'prism' | 'affine' | 'traversal';
  }

  return undefined;
}

export { fromLayersData, toImportResult };
export type { PanprotoView };
