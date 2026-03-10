/**
 * Unit tests for the BRAT standoff format importer.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { BratImporter } from '@/plugins/importers/brat-importer.js';
import { isErr, isOk } from '@/types/result.js';

const BASIC_BRAT = `T1\tPerson 0 4\tJohn
T2\tLocation 12 18\tLondon
R1\tLives_In Arg1:T1 Arg2:T2
A1\tNegation T1
`;

describe('BratImporter', () => {
  const importer = new BratImporter();

  describe('validate', () => {
    it('accepts valid BRAT input', () => {
      const result = importer.validate(BASIC_BRAT);
      expect(isOk(result)).toBe(true);
    });

    it('rejects empty input', () => {
      const result = importer.validate('');
      expect(isErr(result)).toBe(true);
    });

    it('rejects lines with invalid prefixes', () => {
      const result = importer.validate('Z1\tInvalid line');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Invalid BRAT line prefix');
      }
    });

    it('accepts comment lines', () => {
      const result = importer.validate('#1\tComment line\nT1\tPerson 0 4\tJohn');
      expect(isOk(result)).toBe(true);
    });
  });

  describe('parse', () => {
    it('parses text-bound annotations', async () => {
      const result = await importer.parse(BASIC_BRAT);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.format).toBe('brat');
        expect(result.value.annotationLayers.length).toBeGreaterThanOrEqual(1);

        // Check that entity layers were created for Person and Location
        const layers = result.value.annotationLayers;
        const entityLayers = layers.filter((l) => l.kind === 'entity');
        expect(entityLayers.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('groups text-bound annotations by type', async () => {
      const input = `T1\tPerson 0 4\tJohn\nT2\tPerson 10 14\tJane\nT3\tLocation 20 26\tLondon`;
      const result = await importer.parse(input);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const layers = result.value.annotationLayers;
        const personLayer = layers.find((l) => l.subkind === 'person')!;
        expect(personLayer).toBeDefined();
        const annotations = personLayer.annotations as unknown[];
        expect(annotations).toHaveLength(2);
      }
    });

    it('parses relations into a separate layer', async () => {
      const result = await importer.parse(BASIC_BRAT);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const relLayer = result.value.annotationLayers.find((l) => l.kind === 'relation')!;
        expect(relLayer).toBeDefined();
        const annotations = relLayer.annotations as Record<string, unknown>[];
        expect(annotations).toHaveLength(1);
        expect(annotations[0]?.label).toBe('Lives_In');
      }
    });

    it('includes text span anchors for text-bound annotations', async () => {
      const input = 'T1\tPerson 0 4\tJohn';
      const result = await importer.parse(input);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const layer = result.value.annotationLayers[0]!;
        const annotations = layer.annotations as Record<string, unknown>[];
        const anchor = annotations[0]?.anchor as Record<string, unknown>;
        const textSpan = anchor.textSpan as Record<string, unknown>;
        expect(textSpan.start).toBe(0);
        expect(textSpan.end).toBe(4);
      }
    });

    it('returns metadata with counts', async () => {
      const result = await importer.parse(BASIC_BRAT);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.metadata.textBoundCount).toBe(2);
        expect(result.value.metadata.relationCount).toBe(1);
        expect(result.value.metadata.attributeCount).toBe(1);
      }
    });

    it('returns error for empty input', async () => {
      const result = await importer.parse('');
      expect(isErr(result)).toBe(true);
    });
  });
});
