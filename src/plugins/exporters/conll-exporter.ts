/**
 * CoNLL-U format exporter plugin.
 *
 * Converts Layers annotation layers (POS, dependency, morphological)
 * and their expression into the standard CoNLL-U tab-separated format.
 * Each token occupies one line with 10 tab-separated fields.
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

/**
 * Internal representation of a CoNLL-U token row.
 */
interface ConllRow {
  id: string;
  form: string;
  lemma: string;
  upos: string;
  xpos: string;
  feats: string;
  head: string;
  deprel: string;
  deps: string;
  misc: string;
}

const CONLL_EXPORTER_MANIFEST: IPluginManifest = {
  name: 'conll-exporter',
  version: '1.0.0',
  description: 'Exports annotation layers to CoNLL-U format',
  author: 'Layers',
  type: 'export',
  permissions: ['read:records'],
  sandboxed: false,
};

/**
 * Exports Layers annotations to the CoNLL-U tab-separated format.
 *
 * Supports POS layers (kind "pos" or "token-tag" with subkind "upos"/"xpos"),
 * dependency layers (kind "dependency" or "tree"), and morphological layers
 * (kind "morphological" or subkind "feats"). Tokens are extracted from layers
 * that provide per-token annotations via tokenRef anchors.
 */
class ConllExporter implements IExportPlugin {
  readonly manifest = CONLL_EXPORTER_MANIFEST;
  readonly formatId = 'conll-u';
  readonly formatName = 'CoNLL-U';
  readonly mimeType = 'text/plain';
  readonly extension = 'conllu';

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
      const output = buildConllOutput(layers, expression);
      const encoder = new TextEncoder();
      return Ok(encoder.encode(output));
    } catch (err) {
      return Err(
        new PluginError(
          'conll-exporter',
          'export',
          `Failed to export CoNLL-U: ${err instanceof Error ? err.message : String(err)}`,
          err instanceof Error ? err : undefined,
        ),
      );
    }
  }
}

/**
 * Build the CoNLL-U text output from annotation layers.
 *
 * Iterates over annotations to discover tokens (from anchors) and
 * merge POS, dependency, and morphological information into the
 * standard 10-column format.
 */
function buildConllOutput(
  layers: readonly IExportAnnotationLayer[],
  expression: IExportExpression,
): string {
  const lines: string[] = [];

  // Add metadata comments
  lines.push(`# text = ${expression.text}`);
  if (expression.language) {
    lines.push(`# lang = ${expression.language}`);
  }

  // Discover token count from annotations
  let tokenCount = 0;
  for (const layer of layers) {
    for (const ann of layer.annotations) {
      const anchor = getRecordField(ann, 'anchor') as Record<string, unknown> | undefined;
      if (anchor) {
        const tokenRef = getRecordField(anchor, 'tokenRef') as Record<string, unknown> | undefined;
        if (tokenRef) {
          const idx = getRecordField(tokenRef, 'tokenIndex');
          if (typeof idx === 'number' && idx + 1 > tokenCount) {
            tokenCount = idx + 1;
          }
        }
      }
    }
  }

  // If no token-level annotations found, split text on whitespace
  if (tokenCount === 0) {
    tokenCount = expression.text.split(/\s+/).filter((w) => w.length > 0).length;
  }

  // Initialize rows with default values
  const rows: ConllRow[] = [];
  const words = expression.text.split(/\s+/).filter((w) => w.length > 0);
  for (let i = 0; i < tokenCount; i++) {
    rows.push({
      id: String(i + 1),
      form: words[i] ?? '_',
      lemma: '_',
      upos: '_',
      xpos: '_',
      feats: '_',
      head: '_',
      deprel: '_',
      deps: '_',
      misc: '_',
    });
  }

  // Populate rows from annotation layers
  for (const layer of layers) {
    for (const ann of layer.annotations) {
      const tokenIndex = extractTokenIndex(ann);
      if (tokenIndex === undefined || tokenIndex >= rows.length) continue;

      const row = rows[tokenIndex];
      if (!row) continue;

      const label = getStringField(ann, 'label');
      const form = getStringField(ann, 'form');
      const lemma = getStringField(ann, 'lemma');

      if (form) row.form = form;
      if (lemma) row.lemma = lemma;

      if (isPosLayer(layer)) {
        if (layer.subkind === 'xpos') {
          if (label) row.xpos = label;
        } else {
          if (label) row.upos = label;
        }
      } else if (isDependencyLayer(layer)) {
        if (label) row.deprel = label;
        const head = getRecordField(ann, 'head');
        if (typeof head === 'string') row.head = head;
        if (typeof head === 'number') row.head = String(head);
      } else if (isMorphLayer(layer)) {
        if (label) row.feats = label;
      }
    }
  }

  // Format rows as tab-separated lines
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.form,
        row.lemma,
        row.upos,
        row.xpos,
        row.feats,
        row.head,
        row.deprel,
        row.deps,
        row.misc,
      ].join('\t'),
    );
  }

  // Trailing blank line per CoNLL-U convention
  lines.push('');

  return lines.join('\n');
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
 * Extract a token index from an annotation's anchor.
 */
function extractTokenIndex(ann: Readonly<Record<string, unknown>>): number | undefined {
  const anchor = getRecordField(ann, 'anchor') as Record<string, unknown> | undefined;
  if (!anchor) return undefined;

  const tokenRef = getRecordField(anchor, 'tokenRef') as Record<string, unknown> | undefined;
  if (!tokenRef) return undefined;

  const idx = getRecordField(tokenRef, 'tokenIndex');
  return typeof idx === 'number' ? idx : undefined;
}

function isPosLayer(layer: IExportAnnotationLayer): boolean {
  return layer.kind === 'pos' || layer.kind === 'token-tag';
}

function isDependencyLayer(layer: IExportAnnotationLayer): boolean {
  return layer.kind === 'dependency' || layer.kind === 'tree';
}

function isMorphLayer(layer: IExportAnnotationLayer): boolean {
  return layer.kind === 'morphological' || layer.subkind === 'feats';
}

/**
 * Factory function for plugin discovery.
 *
 * @returns a new ConllExporter instance
 */
function createPlugin(): IPlugin {
  return new ConllExporter();
}

export { ConllExporter, createPlugin };
