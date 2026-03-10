/**
 * Unit tests for the BRAT standoff format exporter plugin.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { BratExporter } from '../../../../src/plugins/exporters/brat-exporter.js';
import type {
  IExportAnnotationLayer,
  IExportExpression,
} from '../../../../src/plugins/types/export-plugin.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExpression(text: string): IExportExpression {
  return { uri: 'at://did:plc:test/pub.layers.expression.expression/abc', text };
}

function makeEntityAnnotation(
  start: number,
  end: number,
  fields?: Record<string, unknown>,
): Readonly<Record<string, unknown>> {
  return {
    anchor: { textSpan: { start, end } },
    ...fields,
  };
}

function makeRelationAnnotation(
  arg1: string,
  arg2: string,
  label?: string,
): Readonly<Record<string, unknown>> {
  return {
    arg1,
    arg2,
    ...(label ? { label } : {}),
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

async function exportToString(
  layers: readonly IExportAnnotationLayer[],
  expression: IExportExpression,
): Promise<string> {
  const exporter = new BratExporter();
  const result = await exporter.exportLayers(layers, expression);
  if (!result.ok) {
    throw new Error(`Export failed: ${result.error.message}`);
  }
  return new TextDecoder().decode(result.value);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BratExporter', () => {
  describe('manifest and metadata', () => {
    it('has correct manifest properties', () => {
      const exporter = new BratExporter();
      expect(exporter.manifest.name).toBe('brat-exporter');
      expect(exporter.manifest.type).toBe('export');
      expect(exporter.formatId).toBe('brat-standoff');
      expect(exporter.mimeType).toBe('text/plain');
      expect(exporter.extension).toBe('ann');
    });
  });

  describe('T-line generation for entity annotations', () => {
    it('generates T-lines for textSpan annotations', async () => {
      const expression = makeExpression('The cat sat on the mat.');
      const layer = makeLayer('span', [makeEntityAnnotation(4, 7, { label: 'Animal' })]);

      const output = await exportToString([layer], expression);
      expect(output).toContain('T1\tAnimal 4 7\tcat');
    });

    it('uses sequential T-IDs', async () => {
      const expression = makeExpression('The cat sat on the mat.');
      const layer = makeLayer('span', [
        makeEntityAnnotation(0, 3, { label: 'DET' }),
        makeEntityAnnotation(4, 7, { label: 'Animal' }),
        makeEntityAnnotation(8, 11, { label: 'Verb' }),
      ]);

      const output = await exportToString([layer], expression);
      const lines = output.trim().split('\n');
      expect(lines[0]).toMatch(/^T1\t/);
      expect(lines[1]).toMatch(/^T2\t/);
      expect(lines[2]).toMatch(/^T3\t/);
    });

    it('uses layer kind as fallback label when annotation label is missing', async () => {
      const expression = makeExpression('The cat sat on the mat.');
      const layer = makeLayer('entity', [makeEntityAnnotation(4, 7)]);

      const output = await exportToString([layer], expression);
      expect(output).toContain('T1\tentity 4 7\tcat');
    });

    it('uses subkind as fallback label over kind', async () => {
      const expression = makeExpression('The cat sat on the mat.');
      const layer = makeLayer('span', [makeEntityAnnotation(4, 7)], 'ner');

      const output = await exportToString([layer], expression);
      expect(output).toContain('T1\tner 4 7\tcat');
    });

    it('skips annotations without textSpan anchors', async () => {
      const layer: IExportAnnotationLayer = {
        uri: 'at://test/layer/1',
        kind: 'span',
        annotations: [{ label: 'NER' }], // no anchor
      };

      const output = await exportToString([layer], makeExpression('Hello'));
      // No T-lines should be generated
      expect(output).toBe('');
    });
  });

  describe('R-line generation for relation annotations', () => {
    it('generates R-lines for relation annotations', async () => {
      const expression = makeExpression('The cat sat on the mat.');
      const entityLayer = makeLayer('span', [
        makeEntityAnnotation(4, 7, { id: 'ann1', label: 'Animal' }),
        makeEntityAnnotation(19, 22, { id: 'ann2', label: 'Object' }),
      ]);
      const relationLayer = makeLayer('relation', [
        makeRelationAnnotation('ann1', 'ann2', 'SitsOn'),
      ]);

      const output = await exportToString([entityLayer, relationLayer], expression);
      expect(output).toContain('R1\tSitsOn Arg1:T1 Arg2:T2');
    });

    it('uses sequential R-IDs', async () => {
      const expression = makeExpression('The cat sat on the mat.');
      const entityLayer = makeLayer('span', [
        makeEntityAnnotation(4, 7, { id: 'a1', label: 'X' }),
        makeEntityAnnotation(8, 11, { id: 'a2', label: 'Y' }),
        makeEntityAnnotation(19, 22, { id: 'a3', label: 'Z' }),
      ]);
      const relationLayer = makeLayer('relation', [
        makeRelationAnnotation('a1', 'a2', 'Rel1'),
        makeRelationAnnotation('a2', 'a3', 'Rel2'),
      ]);

      const output = await exportToString([entityLayer, relationLayer], expression);
      const rLines = output
        .trim()
        .split('\n')
        .filter((l) => l.startsWith('R'));
      expect(rLines).toHaveLength(2);
      expect(rLines[0]).toMatch(/^R1\t/);
      expect(rLines[1]).toMatch(/^R2\t/);
    });

    it('uses "Related" as default label when label is missing', async () => {
      const expression = makeExpression('The cat sat on the mat.');
      const entityLayer = makeLayer('span', [
        makeEntityAnnotation(4, 7, { id: 'a1', label: 'X' }),
        makeEntityAnnotation(8, 11, { id: 'a2', label: 'Y' }),
      ]);
      const relationLayer = makeLayer('relation', [makeRelationAnnotation('a1', 'a2')]);

      const output = await exportToString([entityLayer, relationLayer], expression);
      expect(output).toContain('R1\tRelated Arg1:T1 Arg2:T2');
    });

    it('skips relation annotations missing arg1 or arg2', async () => {
      const relationLayer = makeLayer('relation', [
        { arg1: 'a1' }, // missing arg2
        { arg2: 'a2' }, // missing arg1
        {}, // missing both
      ]);

      const output = await exportToString([relationLayer], makeExpression('Hello'));
      expect(output).toBe('');
    });
  });

  describe('annotation ID resolution', () => {
    it('resolves original IDs to T-IDs in relation arguments', async () => {
      const expression = makeExpression('The cat sat.');
      const entityLayer = makeLayer('span', [
        makeEntityAnnotation(0, 3, { id: 'orig-1', label: 'DET' }),
        makeEntityAnnotation(4, 7, { id: 'orig-2', label: 'NOUN' }),
      ]);
      const relationLayer = makeLayer('relation', [
        makeRelationAnnotation('orig-1', 'orig-2', 'det'),
      ]);

      const output = await exportToString([entityLayer, relationLayer], expression);
      // Relation should reference T1 and T2, not orig-1 and orig-2
      expect(output).toContain('R1\tdet Arg1:T1 Arg2:T2');
    });

    it('preserves raw argument values when IDs are not in the map', async () => {
      const relationLayer = makeLayer('relation', [
        makeRelationAnnotation('unknown-id-1', 'unknown-id-2', 'Rel'),
      ]);

      const output = await exportToString([relationLayer], makeExpression('Hello'));
      expect(output).toContain('Arg1:unknown-id-1 Arg2:unknown-id-2');
    });
  });

  describe('empty and mixed layers', () => {
    it('produces empty output for no annotations', async () => {
      const output = await exportToString([], makeExpression('Hello world'));
      expect(output).toBe('');
    });

    it('produces empty output for layers with no valid annotations', async () => {
      const layer = makeLayer('span', [{ noAnchor: true }]);
      const output = await exportToString([layer], makeExpression('Hello'));
      expect(output).toBe('');
    });

    it('handles mixed entity and relation layers', async () => {
      const expression = makeExpression('Alice loves Bob');
      const entityLayer = makeLayer('span', [
        makeEntityAnnotation(0, 5, { id: 'e1', label: 'Person' }),
        makeEntityAnnotation(12, 15, { id: 'e2', label: 'Person' }),
      ]);
      const verbLayer = makeLayer('span', [
        makeEntityAnnotation(6, 11, { id: 'e3', label: 'Action' }),
      ]);
      const relationLayer = makeLayer('relation', [makeRelationAnnotation('e1', 'e2', 'Loves')]);

      const output = await exportToString([entityLayer, verbLayer, relationLayer], expression);
      const lines = output.trim().split('\n');
      // 3 T-lines + 1 R-line
      const tLines = lines.filter((l) => l.startsWith('T'));
      const rLines = lines.filter((l) => l.startsWith('R'));
      expect(tLines).toHaveLength(3);
      expect(rLines).toHaveLength(1);
    });

    it('output ends with newline when there are annotations', async () => {
      const layer = makeLayer('span', [makeEntityAnnotation(0, 5, { label: 'X' })]);
      const output = await exportToString([layer], makeExpression('Hello'));
      expect(output.endsWith('\n')).toBe(true);
    });
  });

  describe('lifecycle methods', () => {
    it('init returns Ok', async () => {
      const exporter = new BratExporter();
      const result = await exporter.init(
        {} as import('../../../../src/plugins/core/plugin-interface.js').IPluginContext,
      );
      expect(result.ok).toBe(true);
    });

    it('start returns Ok', async () => {
      const exporter = new BratExporter();
      const result = await exporter.start();
      expect(result.ok).toBe(true);
    });

    it('stop returns Ok', async () => {
      const exporter = new BratExporter();
      const result = await exporter.stop();
      expect(result.ok).toBe(true);
    });

    it('dispose returns Ok', async () => {
      const exporter = new BratExporter();
      const result = await exporter.dispose();
      expect(result.ok).toBe(true);
    });
  });
});
