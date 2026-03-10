/**
 * BRAT standoff format exporter plugin.
 *
 * Converts Layers annotation layers (entity spans, relations) into
 * the BRAT .ann standoff format with T-lines for text-bound
 * annotations and R-lines for relations.
 *
 * @module
 */

import { PluginError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';

import type { IPlugin, IPluginContext, IPluginManifest } from '../core/plugin-interface.js';
import type {
  IExportAnnotationLayer,
  IExportExpression,
  IExportPlugin,
} from '../types/export-plugin.js';

const BRAT_EXPORTER_MANIFEST: IPluginManifest = {
  name: 'brat-exporter',
  version: '1.0.0',
  description: 'Exports annotation layers to BRAT standoff format',
  author: 'Layers',
  type: 'export',
  permissions: ['read:records'],
  sandboxed: false,
};

/**
 * Exports Layers annotations to the BRAT .ann standoff format.
 *
 * Produces T-lines for entity and span annotations that have
 * textSpan anchors (start/end offsets), and R-lines for relation
 * annotations that reference two arguments.
 */
class BratExporter implements IExportPlugin {
  readonly manifest = BRAT_EXPORTER_MANIFEST;
  readonly formatId = 'brat-standoff';
  readonly formatName = 'BRAT Standoff';
  readonly mimeType = 'text/plain';
  readonly extension = 'ann';

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(_context: IPluginContext): Promise<Result<void, PluginError>> {
    return Ok(undefined);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async start(): Promise<Result<void, PluginError>> {
    return Ok(undefined);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async stop(): Promise<Result<void, PluginError>> {
    return Ok(undefined);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async dispose(): Promise<Result<void, PluginError>> {
    return Ok(undefined);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async exportLayers(
    layers: readonly IExportAnnotationLayer[],
    expression: IExportExpression,
  ): Promise<Result<Uint8Array, PluginError>> {
    try {
      const output = buildBratOutput(layers, expression);
      const encoder = new TextEncoder();
      return Ok(encoder.encode(output));
    } catch (err) {
      return Err(
        new PluginError(
          'brat-exporter',
          'export',
          `Failed to export BRAT: ${err instanceof Error ? err.message : String(err)}`,
          err instanceof Error ? err : undefined,
        ),
      );
    }
  }
}

/**
 * Safely access a field from a Record with an index signature.
 */
function getRecordField(record: Readonly<Record<string, unknown>>, key: string): unknown {
  return record[key];
}

/**
 * Extract a string field from a Record, or return undefined.
 */
function getStringField(
  record: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Build the BRAT .ann output from annotation layers.
 *
 * Processes entity/span layers first (T-lines), then relation
 * layers (R-lines). Each annotation is assigned a sequential
 * ID within its type prefix.
 */
function buildBratOutput(
  layers: readonly IExportAnnotationLayer[],
  expression: IExportExpression,
): string {
  const lines: string[] = [];
  let tCounter = 1;
  let rCounter = 1;

  // Track annotation IDs for relation resolution
  const annotationIdMap = new Map<string, string>();

  // Process entity and span layers (T-lines)
  for (const layer of layers) {
    if (layer.kind === 'relation') continue;

    for (const ann of layer.annotations) {
      const span = extractTextSpan(ann);
      if (!span) continue;

      const label = getStringField(ann, 'label') ?? layer.subkind ?? layer.kind;
      const annText = expression.text.slice(span.start, span.end);
      const tId = `T${tCounter}`;

      // Track original annotation ID for relation resolution
      const originalId = getStringField(ann, 'id');
      if (originalId) {
        annotationIdMap.set(originalId, tId);
      }

      lines.push(`${tId}\t${label} ${span.start} ${span.end}\t${annText}`);
      tCounter++;
    }
  }

  // Process relation layers (R-lines)
  for (const layer of layers) {
    if (layer.kind !== 'relation') continue;

    for (const ann of layer.annotations) {
      const label = getStringField(ann, 'label') ?? 'Related';
      const arg1Raw = getStringField(ann, 'arg1');
      const arg2Raw = getStringField(ann, 'arg2');

      if (!arg1Raw || !arg2Raw) continue;

      // Resolve to T-IDs if the arguments reference original annotation IDs
      const arg1 = annotationIdMap.get(arg1Raw) ?? arg1Raw;
      const arg2 = annotationIdMap.get(arg2Raw) ?? arg2Raw;

      const rId = `R${rCounter}`;
      lines.push(`${rId}\t${label} Arg1:${arg1} Arg2:${arg2}`);
      rCounter++;
    }
  }

  return lines.join('\n') + (lines.length > 0 ? '\n' : '');
}

/**
 * Extract a textSpan anchor from an annotation.
 *
 * @returns the start and end offsets, or undefined if no textSpan anchor
 */
function extractTextSpan(
  ann: Readonly<Record<string, unknown>>,
): { readonly start: number; readonly end: number } | undefined {
  const anchor = getRecordField(ann, 'anchor') as Record<string, unknown> | undefined;
  if (!anchor) return undefined;

  const textSpan = getRecordField(anchor, 'textSpan') as Record<string, unknown> | undefined;
  if (!textSpan) return undefined;

  const start = getRecordField(textSpan, 'start');
  const end = getRecordField(textSpan, 'end');

  if (typeof start !== 'number' || typeof end !== 'number') return undefined;

  return { start, end };
}

/**
 * Factory function for plugin discovery.
 *
 * @returns a new BratExporter instance
 */
function createPlugin(): IPlugin {
  return new BratExporter();
}

export { BratExporter, createPlugin };
