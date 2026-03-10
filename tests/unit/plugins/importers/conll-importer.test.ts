/**
 * Unit tests for the CoNLL-U format importer.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { ConllImporter } from '@/plugins/importers/conll-importer.js';
import { isErr, isOk } from '@/types/result.js';

const BASIC_CONLLU = `# sent_id = 1
# text = The cat sat.
1\tThe\tthe\tDET\tDT\t_\t2\tdet\t_\t_
2\tcat\tcat\tNOUN\tNN\t_\t3\tnsubj\t_\t_
3\tsat\tsit\tVERB\tVBD\t_\t0\troot\t_\t_
4\t.\t.\tPUNCT\t.\t_\t3\tpunct\t_\t_

`;

const TWO_SENTENCES = `# text = Hello world.
1\tHello\thello\tINTJ\tUH\t_\t0\troot\t_\t_
2\tworld\tworld\tNOUN\tNN\t_\t1\tflat\t_\t_
3\t.\t.\tPUNCT\t.\t_\t1\tpunct\t_\t_

# text = Goodbye.
1\tGoodbye\tgoodbye\tINTJ\tUH\t_\t0\troot\t_\t_
2\t.\t.\tPUNCT\t.\t_\t1\tpunct\t_\t_
`;

describe('ConllImporter', () => {
  const importer = new ConllImporter();

  describe('validate', () => {
    it('accepts valid CoNLL-U input', () => {
      const result = importer.validate(BASIC_CONLLU);
      expect(isOk(result)).toBe(true);
    });

    it('rejects empty input', () => {
      const result = importer.validate('');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('empty');
      }
    });

    it('rejects whitespace-only input', () => {
      const result = importer.validate('   \n\n  ');
      expect(isErr(result)).toBe(true);
    });

    it('rejects input with only comments', () => {
      const result = importer.validate('# This is a comment\n# Another comment\n');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('No data lines');
      }
    });

    it('rejects lines without tabs', () => {
      const result = importer.validate('some plain text without tabs');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('tab-separated');
      }
    });
  });

  describe('parse', () => {
    it('parses a basic CoNLL-U sentence', async () => {
      const result = await importer.parse(BASIC_CONLLU);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.format).toBe('conll');
        expect(result.value.expressions).toHaveLength(1);
        expect(result.value.segmentations).toHaveLength(1);
        // POS + dependency layers
        expect(result.value.annotationLayers.length).toBeGreaterThanOrEqual(2);
        expect(result.value.metadata).toEqual({ sentenceCount: 1 });
      }
    });

    it('extracts text from # text comment', async () => {
      const result = await importer.parse(BASIC_CONLLU);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const expr = result.value.expressions[0]!;
        expect(expr.text).toBe('The cat sat.');
      }
    });

    it('parses multiple sentences', async () => {
      const result = await importer.parse(TWO_SENTENCES);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.expressions).toHaveLength(2);
        expect(result.value.segmentations).toHaveLength(2);
        expect(result.value.metadata).toEqual({ sentenceCount: 2 });
      }
    });

    it('extracts token forms and lemmas in segmentation', async () => {
      const result = await importer.parse(BASIC_CONLLU);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const seg = result.value.segmentations[0]!;
        const tokens = seg.tokens as Record<string, unknown>[];
        expect(tokens).toHaveLength(4);
        expect(tokens[0]).toEqual({ form: 'The', lemma: 'the' });
        expect(tokens[1]).toEqual({ form: 'cat', lemma: 'cat' });
      }
    });

    it('creates POS annotation layer', async () => {
      const result = await importer.parse(BASIC_CONLLU);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const posLayer = result.value.annotationLayers.find((l) => l.kind === 'pos')!;
        expect(posLayer).toBeDefined();
        expect(posLayer.formalism).toBe('Universal Dependencies');

        const annotations = posLayer.annotations as Record<string, unknown>[];
        expect(annotations).toHaveLength(4);
        expect(annotations[0]?.label).toBe('DET');
      }
    });

    it('creates dependency annotation layer', async () => {
      const result = await importer.parse(BASIC_CONLLU);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const depLayer = result.value.annotationLayers.find((l) => l.kind === 'dependency')!;
        expect(depLayer).toBeDefined();
        expect(depLayer.formalism).toBe('Universal Dependencies');
      }
    });

    it('passes language option through to expressions', async () => {
      const result = await importer.parse(BASIC_CONLLU, { language: 'en' });
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const expr = result.value.expressions[0]!;
        expect(expr.language).toBe('en');
      }
    });

    it('handles input without trailing blank line', async () => {
      const input = '1\tHello\thello\tINTJ\tUH\t_\t0\troot\t_\t_';
      const result = await importer.parse(input);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.expressions).toHaveLength(1);
      }
    });

    it('returns error for empty input', async () => {
      const result = await importer.parse('');
      expect(isErr(result)).toBe(true);
    });
  });
});
