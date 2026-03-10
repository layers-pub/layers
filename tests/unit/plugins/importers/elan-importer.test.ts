/**
 * Unit tests for the ELAN XML format importer.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { ElanImporter } from '@/plugins/importers/elan-importer.js';
import { isErr, isOk } from '@/types/result.js';

const BASIC_ELAN = `<?xml version="1.0" encoding="UTF-8"?>
<ANNOTATION_DOCUMENT>
  <HEADER MEDIA_FILE="" TIME_UNITS="milliseconds"/>
  <TIME_ORDER>
    <TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="0"/>
    <TIME_SLOT TIME_SLOT_ID="ts2" TIME_VALUE="1500"/>
    <TIME_SLOT TIME_SLOT_ID="ts3" TIME_VALUE="1500"/>
    <TIME_SLOT TIME_SLOT_ID="ts4" TIME_VALUE="3000"/>
  </TIME_ORDER>
  <TIER TIER_ID="default" LINGUISTIC_TYPE_REF="default-lt" PARTICIPANT="Speaker1">
    <ANNOTATION>
      <ALIGNABLE_ANNOTATION ANNOTATION_ID="a1" TIME_SLOT_REF1="ts1" TIME_SLOT_REF2="ts2">
        <ANNOTATION_VALUE>Hello world</ANNOTATION_VALUE>
      </ALIGNABLE_ANNOTATION>
    </ANNOTATION>
    <ANNOTATION>
      <ALIGNABLE_ANNOTATION ANNOTATION_ID="a2" TIME_SLOT_REF1="ts3" TIME_SLOT_REF2="ts4">
        <ANNOTATION_VALUE>Goodbye</ANNOTATION_VALUE>
      </ALIGNABLE_ANNOTATION>
    </ANNOTATION>
  </TIER>
</ANNOTATION_DOCUMENT>`;

describe('ElanImporter', () => {
  const importer = new ElanImporter();

  describe('validate', () => {
    it('accepts valid ELAN input', () => {
      const result = importer.validate(BASIC_ELAN);
      expect(isOk(result)).toBe(true);
    });

    it('rejects empty input', () => {
      const result = importer.validate('');
      expect(isErr(result)).toBe(true);
    });

    it('rejects non-ELAN XML', () => {
      const result = importer.validate('<root><child/></root>');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('ANNOTATION_DOCUMENT');
      }
    });
  });

  describe('parse', () => {
    it('parses tiers into annotation layers', async () => {
      const result = await importer.parse(BASIC_ELAN);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.format).toBe('elan');
        expect(result.value.annotationLayers).toHaveLength(1);

        const layer = result.value.annotationLayers[0]!;
        expect(layer.kind).toBe('tier');
        expect(layer.tierId).toBe('default');
        expect(layer.participant).toBe('Speaker1');
      }
    });

    it('resolves time slot references to millisecond values', async () => {
      const result = await importer.parse(BASIC_ELAN);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const layer = result.value.annotationLayers[0]!;
        const annotations = layer.annotations as Record<string, unknown>[];
        const anchor = annotations[0]?.anchor as Record<string, unknown>;
        const span = anchor.temporalSpan as Record<string, unknown>;
        expect(span.startMs).toBe(0);
        expect(span.endMs).toBe(1500);
      }
    });

    it('extracts annotation values', async () => {
      const result = await importer.parse(BASIC_ELAN);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const layer = result.value.annotationLayers[0]!;
        const annotations = layer.annotations as Record<string, unknown>[];
        expect(annotations).toHaveLength(2);
        expect(annotations[0]?.value).toBe('Hello world');
        expect(annotations[1]?.value).toBe('Goodbye');
      }
    });

    it('creates expressions from annotation values', async () => {
      const result = await importer.parse(BASIC_ELAN);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.expressions).toHaveLength(2);
        const expr = result.value.expressions[0]!;
        expect(expr.text).toBe('Hello world');
        expect(expr.sourceFormat).toBe('elan');
      }
    });

    it('includes tier and time slot counts in metadata', async () => {
      const result = await importer.parse(BASIC_ELAN);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.metadata.tierCount).toBe(1);
        expect(result.value.metadata.timeSlotCount).toBe(4);
      }
    });

    it('returns error for empty input', async () => {
      const result = await importer.parse('');
      expect(isErr(result)).toBe(true);
    });
  });
});
