/**
 * Export plugin interface for converting Layers data to external formats.
 *
 * Export plugins produce binary output (as Uint8Array) in a specific
 * file format, given a set of annotation layers and their expression.
 *
 * @module
 */

import type { PluginError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';

import type { IPlugin } from '../core/plugin-interface.js';

/**
 * An expression record as provided to export plugins.
 *
 * Contains the expression text, language, and other metadata
 * needed to produce the export output.
 */
interface IExportExpression {
  readonly uri: string;
  readonly text: string;
  readonly language?: string | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * An annotation layer record as provided to export plugins.
 *
 * Contains the layer's kind, subkind, formalism, and the array
 * of individual annotations.
 */
interface IExportAnnotationLayer {
  readonly uri: string;
  readonly kind: string;
  readonly subkind?: string | undefined;
  readonly formalism?: string | undefined;
  readonly annotations: readonly Readonly<Record<string, unknown>>[];
}

/**
 * Plugin that exports Layers annotation data to an external format.
 *
 * Each exporter targets a single output format identified by
 * `formatId` (e.g., "conll-u", "brat-standoff"). The `mimeType`
 * and `extension` fields describe the output file characteristics.
 */
interface IExportPlugin extends IPlugin {
  /**
   * Machine-readable identifier for the export format.
   */
  readonly formatId: string;

  /**
   * Human-readable name for the export format.
   */
  readonly formatName: string;

  /**
   * MIME type of the exported file (e.g., "text/plain", "application/xml").
   */
  readonly mimeType: string;

  /**
   * File extension for the exported file, without the leading dot (e.g., "conllu", "ann").
   */
  readonly extension: string;

  /**
   * Export annotation layers and their expression to the target format.
   *
   * @param layers - the annotation layers to export
   * @param expression - the expression that the layers annotate
   * @returns the exported file content as a byte array, or a PluginError
   */
  exportLayers(
    layers: readonly IExportAnnotationLayer[],
    expression: IExportExpression,
  ): Promise<Result<Uint8Array, PluginError>>;
}

export type { IExportAnnotationLayer, IExportExpression, IExportPlugin };
