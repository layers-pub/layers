/**
 * Core plugin interfaces for format importers and the plugin registry.
 *
 * @module
 */

import type { Result } from '../result.js';
import type { LayersError } from '../errors.js';

/**
 * Supported annotation format types for import.
 */
type ImportFormat = 'conll' | 'brat' | 'elan' | 'tei' | 'praat';

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
  readonly metadata: Record<string, unknown>;
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

export type { IFormatImporter, ImportFormat, ImportResult, PluginMetadata };
