/**
 * Core plugin interfaces for format importers and the plugin registry.
 *
 * @module
 */

import type { Result } from '../result.js';
import type { LayersError } from '../errors.js';

/**
 * Annotation formats backed by panproto protocol converters.
 *
 * Each value corresponds to a panproto protocol ID in kebab-case.
 * The 19 formats from PROTOCOL_CATEGORIES.annotation plus praat
 * (being added to panproto).
 */
type AnnotationFormat =
  | 'brat'
  | 'conllu'
  | 'naf'
  | 'uima'
  | 'folia'
  | 'tei'
  | 'timeml'
  | 'elan'
  | 'iso-space'
  | 'paula'
  | 'laf-graf'
  | 'decomp'
  | 'ucca'
  | 'fovea'
  | 'bead'
  | 'web-annotation'
  | 'amr'
  | 'concrete'
  | 'nif'
  | 'praat';

/**
 * All supported import format types.
 *
 * Includes the 20 panproto-backed annotation formats plus the
 * hand-written bead-jsonlines format.
 */
type ImportFormat = AnnotationFormat | 'bead-jsonlines';

/**
 * Typed metadata attached to an import result.
 *
 * The `opticKind` field describes the optic category used by panproto
 * for the conversion (iso for lossless, lens for lossy-in-one-direction,
 * prism for partial, etc.). The `_complement` field holds discarded data
 * from lossy conversions, enabling partial round-trip restoration.
 */
interface ImportMetadata {
  readonly opticKind?: 'iso' | 'lens' | 'prism' | 'affine' | 'traversal';
  readonly _complement?: Uint8Array;
  readonly [key: string]: unknown;
}

/**
 * A parsed import result containing records to create.
 *
 * Each field holds an array of record-shaped objects extracted
 * from the source format. These are not yet written to any PDS;
 * the import pipeline validates and writes them.
 */
interface ImportResult {
  readonly format: ImportFormat;
  readonly expressions: readonly Record<string, unknown>[];
  readonly segmentations: readonly Record<string, unknown>[];
  readonly annotationLayers: readonly Record<string, unknown>[];
  readonly metadata: ImportMetadata;
}

/**
 * Interface for format importer plugins.
 *
 * Each importer handles a single annotation format, parsing raw
 * text input into Layers record objects.
 */
interface IFormatImporter {
  readonly format: ImportFormat;
  readonly name: string;
  readonly version: string;

  /**
   * Parse raw input data into Layers records.
   *
   * @param input - the raw file content as a string
   * @param options - format-specific parsing options
   * @returns parsed records on success, or an error
   */
  parse(
    input: string,
    options?: Record<string, unknown>,
  ): Promise<Result<ImportResult, LayersError>>;

  /**
   * Validate that the input is well-formed for this format.
   *
   * @param input - the raw file content to validate
   * @returns void on success, or a validation error
   */
  validate(input: string): Result<void, LayersError>;
}

/**
 * Metadata for a registered plugin.
 */
interface PluginMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly format: ImportFormat;
  readonly description: string;
}

export type {
  AnnotationFormat,
  IFormatImporter,
  ImportFormat,
  ImportMetadata,
  ImportResult,
  PluginMetadata,
};
