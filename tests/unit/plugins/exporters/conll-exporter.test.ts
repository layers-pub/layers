/**
 * Unit tests for the CoNLL-U format exporter plugin.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { ConllExporter } from '../../../../src/plugins/exporters/conll-exporter.js';
import type {
  IExportAnnotationLayer,
  IExportExpression,
} from '../../../../src/plugins/types/export-plugin.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExpression(text: string, language?: string): IExportExpression {
  return { uri: 'at://did:plc:test/pub.layers.expression.expression/abc', text, language };
}

function makeAnnotation(
  tokenIndex: number,
  fields: Record<string, unknown>,
): Readonly<Record<string, unknown>> {
  return {
    anchor: { tokenRef: { tokenIndex } },
    ...fields,
  };
}

function makeLayer(
  kind: string,
  annotations: readonly Readonly<Record<string, unknown>>[],
  subkind?: string,
): IExportAnnotationLayer {
  return {
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/layer1',
    kind,
    annotations,
    subkind,
  };
}

/**
 * Returns true if a line looks like a CoNLL-U token row (starts with a digit).
 */
function isTokenRow(line: string): boolean {
  return line.length > 0 && line[0]! >= '0' && line[0]! <= '9';
}

/**
 * Returns true if a line starts with a specific token ID prefix (e.g., '1\t').
 */
function startsWithTokenId(line: string, id: string): boolean {
  return line.startsWith(`${id}\t`);
}

async function exportToString(
  layers: readonly IExportAnnotationLayer[],
  expression: IExportExpression,
): Promise<string> {
  const exporter = new ConllExporter();
  const result = await exporter.exportLayers(layers, expression);
  if (!result.ok) {
    throw new Error(`Export failed: ${result.error.message}`);
  }
  return new TextDecoder().decode(result.value);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConllExporter', () => {
  describe('manifest and metadata', () => {
    it('has correct manifest properties', () => {
      const exporter = new ConllExporter();
      expect(exporter.manifest.name).toBe('conll-exporter');
      expect(exporter.manifest.type).toBe('export');
      expect(exporter.formatId).toBe('conll-u');
      expect(exporter.mimeType).toBe('text/plain');
      expect(exporter.extension).toBe('conllu');
    });
  });

  describe('comment lines', () => {
    it('includes text comment', async () => {
      const output = await exportToString([], makeExpression('The cat sat'));
      expect(output).toContain('# text = The cat sat');
    });

    it('includes language comment when language is provided', async () => {
      const output = await exportToString([], makeExpression('The cat sat', 'en'));
      expect(output).toContain('# lang = en');
    });

    it('omits language comment when language is not provided', async () => {
      const output = await exportToString([], makeExpression('The cat sat'));
      expect(output).not.toContain('# lang');
    });
  });

  describe('single sentence export', () => {
    it('outputs correct number of token rows from whitespace splitting', async () => {
      const output = await exportToString([], makeExpression('The cat sat'));
      const lines = output.split('\n');
      // Comment line + 3 token lines + trailing blank
      const tokenLines = lines.filter((l) => isTokenRow(l));
      expect(tokenLines).toHaveLength(3);
    });

    it('uses whitespace-split words as default form values', async () => {
      const output = await exportToString([], makeExpression('The cat sat'));
      const lines = output.split('\n').filter((l) => isTokenRow(l));
      expect(lines[0]).toContain('The');
      expect(lines[1]).toContain('cat');
      expect(lines[2]).toContain('sat');
    });

    it('fills missing fields with underscores', async () => {
      const output = await exportToString([], makeExpression('Hello'));
      const tokenLine = output.split('\n').find((l) => startsWithTokenId(l, '1'));
      expect(tokenLine).toBeDefined();
      const fields = tokenLine!.split('\t');
      expect(fields).toHaveLength(10);
      // id, form, then 8 underscores for lemma, upos, xpos, feats, head, deprel, deps, misc
      expect(fields[2]).toBe('_'); // lemma
      expect(fields[3]).toBe('_'); // upos
      expect(fields[4]).toBe('_'); // xpos
      expect(fields[5]).toBe('_'); // feats
      expect(fields[6]).toBe('_'); // head
      expect(fields[7]).toBe('_'); // deprel
      expect(fields[8]).toBe('_'); // deps
      expect(fields[9]).toBe('_'); // misc
    });

    it('ends with a trailing blank line', async () => {
      const output = await exportToString([], makeExpression('Hello'));
      expect(output.endsWith('\n')).toBe(true);
      const lines = output.split('\n');
      // Last element after split on trailing newline is empty string
      expect(lines[lines.length - 1]).toBe('');
    });
  });

  describe('POS annotation layer', () => {
    it('populates upos field from POS layer labels', async () => {
      const layer = makeLayer('pos', [
        makeAnnotation(0, { label: 'DET' }),
        makeAnnotation(1, { label: 'NOUN' }),
        makeAnnotation(2, { label: 'VERB' }),
      ]);
      const output = await exportToString([layer], makeExpression('The cat sat'));
      const lines = output.split('\n').filter((l) => isTokenRow(l));

      expect(lines[0]!.split('\t')[3]).toBe('DET');
      expect(lines[1]!.split('\t')[3]).toBe('NOUN');
      expect(lines[2]!.split('\t')[3]).toBe('VERB');
    });

    it('populates xpos field when subkind is xpos', async () => {
      const layer = makeLayer(
        'pos',
        [makeAnnotation(0, { label: 'DT' }), makeAnnotation(1, { label: 'NN' })],
        'xpos',
      );
      const output = await exportToString([layer], makeExpression('The cat'));
      const lines = output.split('\n').filter((l) => isTokenRow(l));

      expect(lines[0]!.split('\t')[4]).toBe('DT'); // xpos column
      expect(lines[0]!.split('\t')[3]).toBe('_'); // upos should remain _
    });

    it('recognizes token-tag kind as POS layer', async () => {
      const layer = makeLayer('token-tag', [makeAnnotation(0, { label: 'NOUN' })]);
      const output = await exportToString([layer], makeExpression('cat'));
      const tokenLine = output.split('\n').find((l) => startsWithTokenId(l, '1'));
      expect(tokenLine!.split('\t')[3]).toBe('NOUN');
    });
  });

  describe('dependency annotation layer', () => {
    it('populates head and deprel fields', async () => {
      const layer = makeLayer('dependency', [
        makeAnnotation(0, { label: 'det', head: 2 }),
        makeAnnotation(1, { label: 'nsubj', head: 3 }),
        makeAnnotation(2, { label: 'root', head: 0 }),
      ]);
      const output = await exportToString([layer], makeExpression('The cat sat'));
      const lines = output.split('\n').filter((l) => isTokenRow(l));

      expect(lines[0]!.split('\t')[7]).toBe('det');
      expect(lines[0]!.split('\t')[6]).toBe('2');
      expect(lines[1]!.split('\t')[7]).toBe('nsubj');
      expect(lines[1]!.split('\t')[6]).toBe('3');
      expect(lines[2]!.split('\t')[7]).toBe('root');
      expect(lines[2]!.split('\t')[6]).toBe('0');
    });

    it('recognizes tree kind as dependency layer', async () => {
      const layer = makeLayer('tree', [makeAnnotation(0, { label: 'root', head: 0 })]);
      const output = await exportToString([layer], makeExpression('Hello'));
      const tokenLine = output.split('\n').find((l) => startsWithTokenId(l, '1'));
      expect(tokenLine!.split('\t')[7]).toBe('root');
    });

    it('handles string head values', async () => {
      const layer = makeLayer('dependency', [makeAnnotation(0, { label: 'root', head: '0' })]);
      const output = await exportToString([layer], makeExpression('Hello'));
      const tokenLine = output.split('\n').find((l) => startsWithTokenId(l, '1'));
      expect(tokenLine!.split('\t')[6]).toBe('0');
    });
  });

  describe('morphological annotation layer', () => {
    it('populates feats field from morphological layer', async () => {
      const layer = makeLayer('morphological', [
        makeAnnotation(0, { label: 'Number=Sing|Definite=Def' }),
      ]);
      const output = await exportToString([layer], makeExpression('cat'));
      const tokenLine = output.split('\n').find((l) => startsWithTokenId(l, '1'));
      expect(tokenLine!.split('\t')[5]).toBe('Number=Sing|Definite=Def');
    });

    it('recognizes subkind feats as morphological', async () => {
      const layer = makeLayer('other', [makeAnnotation(0, { label: 'Case=Nom' })], 'feats');
      const output = await exportToString([layer], makeExpression('cat'));
      const tokenLine = output.split('\n').find((l) => startsWithTokenId(l, '1'));
      expect(tokenLine!.split('\t')[5]).toBe('Case=Nom');
    });
  });

  describe('token with all fields populated', () => {
    it('produces a complete 10-column row', async () => {
      const posLayer = makeLayer('pos', [
        makeAnnotation(0, { label: 'NOUN', form: 'cat', lemma: 'cat' }),
      ]);
      const depLayer = makeLayer('dependency', [makeAnnotation(0, { label: 'root', head: 0 })]);
      const morphLayer = makeLayer('morphological', [makeAnnotation(0, { label: 'Number=Sing' })]);

      const output = await exportToString([posLayer, depLayer, morphLayer], makeExpression('cat'));
      const tokenLine = output.split('\n').find((l) => startsWithTokenId(l, '1'));
      const fields = tokenLine!.split('\t');

      expect(fields[0]).toBe('1'); // id
      expect(fields[1]).toBe('cat'); // form
      expect(fields[2]).toBe('cat'); // lemma
      expect(fields[3]).toBe('NOUN'); // upos
      expect(fields[4]).toBe('_'); // xpos (not set)
      expect(fields[5]).toBe('Number=Sing'); // feats
      expect(fields[6]).toBe('0'); // head
      expect(fields[7]).toBe('root'); // deprel
      expect(fields[8]).toBe('_'); // deps
      expect(fields[9]).toBe('_'); // misc
    });
  });

  describe('multiple layers combined', () => {
    it('merges annotations from different layers onto the same token', async () => {
      const posLayer = makeLayer('pos', [makeAnnotation(0, { label: 'VERB' })]);
      const depLayer = makeLayer('dependency', [makeAnnotation(0, { label: 'root', head: 0 })]);

      const output = await exportToString([posLayer, depLayer], makeExpression('run'));
      const tokenLine = output.split('\n').find((l) => startsWithTokenId(l, '1'));
      const fields = tokenLine!.split('\t');

      expect(fields[3]).toBe('VERB');
      expect(fields[7]).toBe('root');
    });
  });

  describe('edge cases', () => {
    it('handles empty layers array', async () => {
      const output = await exportToString([], makeExpression('Hello world'));
      // Should still produce comment and token rows from whitespace splitting
      expect(output).toContain('# text = Hello world');
      const tokenLines = output.split('\n').filter((l) => isTokenRow(l));
      expect(tokenLines).toHaveLength(2);
    });

    it('handles annotations with out-of-range token index', async () => {
      const layer = makeLayer('pos', [makeAnnotation(99, { label: 'NOUN' })]);
      // Should not crash; the annotation is silently skipped
      const output = await exportToString([layer], makeExpression('Hello'));
      const tokenLine = output.split('\n').find((l) => startsWithTokenId(l, '1'));
      expect(tokenLine!.split('\t')[3]).toBe('_');
    });

    it('handles annotations without anchors', async () => {
      const layer: IExportAnnotationLayer = {
        uri: 'at://test/layer/1',
        kind: 'pos',
        annotations: [{ label: 'NOUN' }],
      };
      const output = await exportToString([layer], makeExpression('Hello'));
      // Should not crash
      expect(output).toContain('# text = Hello');
    });
  });

  describe('lifecycle methods', () => {
    it('init returns Ok', async () => {
      const exporter = new ConllExporter();
      const result = await exporter.init(
        {} as import('../../../../src/plugins/core/plugin-interface.js').IPluginContext,
      );
      expect(result.ok).toBe(true);
    });

    it('start returns Ok', async () => {
      const exporter = new ConllExporter();
      const result = await exporter.start();
      expect(result.ok).toBe(true);
    });

    it('stop returns Ok', async () => {
      const exporter = new ConllExporter();
      const result = await exporter.stop();
      expect(result.ok).toBe(true);
    });

    it('dispose returns Ok', async () => {
      const exporter = new ConllExporter();
      const result = await exporter.dispose();
      expect(result.ok).toBe(true);
    });
  });
});
