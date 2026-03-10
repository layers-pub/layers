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

const ELAN_WITH_REF_ANNOTATIONS = `<?xml version="1.0" encoding="UTF-8"?>
<ANNOTATION_DOCUMENT>
  <HEADER MEDIA_FILE="" TIME_UNITS="milliseconds"/>
  <TIME_ORDER>
    <TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="0"/>
    <TIME_SLOT TIME_SLOT_ID="ts2" TIME_VALUE="1500"/>
  </TIME_ORDER>
  <LINGUISTIC_TYPE LINGUISTIC_TYPE_ID="default-lt" TIME_ALIGNABLE="true" GRAPHIC_REFERENCES="false"/>
  <LINGUISTIC_TYPE LINGUISTIC_TYPE_ID="Symbolic_Association" CONSTRAINTS="Symbolic_Association" TIME_ALIGNABLE="false"/>
  <TIER TIER_ID="Words" LINGUISTIC_TYPE_REF="default-lt" PARTICIPANT="Speaker1">
    <ANNOTATION>
      <ALIGNABLE_ANNOTATION ANNOTATION_ID="a1" TIME_SLOT_REF1="ts1" TIME_SLOT_REF2="ts2">
        <ANNOTATION_VALUE>walked</ANNOTATION_VALUE>
      </ALIGNABLE_ANNOTATION>
    </ANNOTATION>
  </TIER>
  <TIER TIER_ID="Morphemes" LINGUISTIC_TYPE_REF="Symbolic_Association" PARENT_REF="Words">
    <ANNOTATION>
      <REF_ANNOTATION ANNOTATION_ID="a5" ANNOTATION_REF="a1">
        <ANNOTATION_VALUE>walk-ed</ANNOTATION_VALUE>
      </REF_ANNOTATION>
    </ANNOTATION>
  </TIER>
</ANNOTATION_DOCUMENT>`;

const ELAN_WITH_LINGUISTIC_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<ANNOTATION_DOCUMENT>
  <HEADER MEDIA_FILE="" TIME_UNITS="milliseconds"/>
  <TIME_ORDER>
    <TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="0"/>
    <TIME_SLOT TIME_SLOT_ID="ts2" TIME_VALUE="1000"/>
  </TIME_ORDER>
  <LINGUISTIC_TYPE LINGUISTIC_TYPE_ID="default-lt" TIME_ALIGNABLE="true" GRAPHIC_REFERENCES="false"/>
  <LINGUISTIC_TYPE LINGUISTIC_TYPE_ID="pos-type" CONSTRAINTS="Symbolic_Association" TIME_ALIGNABLE="false" CONTROLLED_VOCABULARY_REF="pos_tags"/>
  <CONTROLLED_VOCABULARY CV_ID="pos_tags">
    <CV_ENTRY_ML CVE_ID="cveid1">
      <CVE_VALUE LANG_REF="en" DESCRIPTION="Noun">N</CVE_VALUE>
    </CV_ENTRY_ML>
    <CV_ENTRY_ML CVE_ID="cveid2">
      <CVE_VALUE LANG_REF="en" DESCRIPTION="Verb">V</CVE_VALUE>
    </CV_ENTRY_ML>
  </CONTROLLED_VOCABULARY>
  <TIER TIER_ID="Tokens" LINGUISTIC_TYPE_REF="default-lt">
    <ANNOTATION>
      <ALIGNABLE_ANNOTATION ANNOTATION_ID="a1" TIME_SLOT_REF1="ts1" TIME_SLOT_REF2="ts2">
        <ANNOTATION_VALUE>cat</ANNOTATION_VALUE>
      </ALIGNABLE_ANNOTATION>
    </ANNOTATION>
  </TIER>
  <TIER TIER_ID="POS" LINGUISTIC_TYPE_REF="pos-type" PARENT_REF="Tokens">
    <ANNOTATION>
      <REF_ANNOTATION ANNOTATION_ID="a2" ANNOTATION_REF="a1">
        <ANNOTATION_VALUE>N</ANNOTATION_VALUE>
      </REF_ANNOTATION>
    </ANNOTATION>
  </TIER>
</ANNOTATION_DOCUMENT>`;

const ELAN_WITH_MEDIA = `<?xml version="1.0" encoding="UTF-8"?>
<ANNOTATION_DOCUMENT>
  <HEADER MEDIA_FILE="" TIME_UNITS="milliseconds">
    <MEDIA_DESCRIPTOR MEDIA_URL="file:///audio/recording.wav" MIME_TYPE="audio/x-wav" RELATIVE_MEDIA_URL="./recording.wav"/>
    <MEDIA_DESCRIPTOR MEDIA_URL="file:///video/session.mp4" MIME_TYPE="video/mp4"/>
  </HEADER>
  <TIME_ORDER>
    <TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="0"/>
    <TIME_SLOT TIME_SLOT_ID="ts2" TIME_VALUE="500"/>
  </TIME_ORDER>
  <TIER TIER_ID="default" LINGUISTIC_TYPE_REF="default-lt">
    <ANNOTATION>
      <ALIGNABLE_ANNOTATION ANNOTATION_ID="a1" TIME_SLOT_REF1="ts1" TIME_SLOT_REF2="ts2">
        <ANNOTATION_VALUE>test</ANNOTATION_VALUE>
      </ALIGNABLE_ANNOTATION>
    </ANNOTATION>
  </TIER>
</ANNOTATION_DOCUMENT>`;

// Helper to cast annotation layer record fields
type AnyRecord = Record<string, unknown>;

function getAnnotations(layer: AnyRecord): AnyRecord[] {
  return layer.annotations as AnyRecord[];
}

function getAnchor(ann: AnyRecord): AnyRecord {
  return ann.anchor as AnyRecord;
}

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

        const layer = result.value.annotationLayers[0] as AnyRecord;
        expect(layer.kind).toBe('tier');
        expect(layer.tierId).toBe('default');
        expect(layer.participant).toBe('Speaker1');
      }
    });

    it('normalizes time slot values from milliseconds to seconds', async () => {
      const result = await importer.parse(BASIC_ELAN);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const layer = result.value.annotationLayers[0] as AnyRecord;
        const annotations = getAnnotations(layer);
        const anchor = getAnchor(annotations[0]!);
        const span = anchor.temporalSpan as AnyRecord;
        expect(span.startSeconds).toBe(0);
        expect(span.endSeconds).toBe(1.5);
      }
    });

    it('extracts annotation values', async () => {
      const result = await importer.parse(BASIC_ELAN);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const layer = result.value.annotationLayers[0] as AnyRecord;
        const annotations = getAnnotations(layer);
        expect(annotations).toHaveLength(2);
        expect(annotations[0]!.value).toBe('Hello world');
        expect(annotations[1]!.value).toBe('Goodbye');
      }
    });

    it('creates expressions from annotation values', async () => {
      const result = await importer.parse(BASIC_ELAN);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.expressions).toHaveLength(2);
        const expr = result.value.expressions[0] as AnyRecord;
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

  describe('REF_ANNOTATION support', () => {
    it('parses ref annotations into token-tag layers', async () => {
      const result = await importer.parse(ELAN_WITH_REF_ANNOTATIONS);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        // Should produce two layers: one for Words (tier), one for Morphemes (token-tag)
        expect(result.value.annotationLayers).toHaveLength(2);

        const wordsLayer = result.value.annotationLayers[0] as AnyRecord;
        expect(wordsLayer.kind).toBe('tier');
        expect(wordsLayer.tierId).toBe('Words');

        const morphLayer = result.value.annotationLayers[1] as AnyRecord;
        expect(morphLayer.kind).toBe('token-tag');
        expect(morphLayer.tierId).toBe('Morphemes');
        expect(morphLayer.parentRef).toBe('Words');
      }
    });

    it('includes annotationRef and tokenRef anchor for ref annotations', async () => {
      const result = await importer.parse(ELAN_WITH_REF_ANNOTATIONS);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const morphLayer = result.value.annotationLayers[1] as AnyRecord;
        const annotations = getAnnotations(morphLayer);
        expect(annotations).toHaveLength(1);

        const ann = annotations[0]!;
        expect(ann.value).toBe('walk-ed');
        expect(ann.annotationRef).toBe('a1');

        const anchor = getAnchor(ann);
        const tokenRef = anchor.tokenRef as AnyRecord;
        expect(tokenRef.annotationId).toBe('a1');
      }
    });

    it('creates expressions from ref annotation values', async () => {
      const result = await importer.parse(ELAN_WITH_REF_ANNOTATIONS);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const refExpressions = result.value.expressions.filter(
          (e) => (e as AnyRecord).kind === 'annotation-value',
        );
        expect(refExpressions).toHaveLength(1);
        expect((refExpressions[0] as AnyRecord).text).toBe('walk-ed');
      }
    });
  });

  describe('linguistic type extraction', () => {
    it('includes linguistic type metadata on annotation layers', async () => {
      const result = await importer.parse(ELAN_WITH_LINGUISTIC_TYPES);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        // The POS tier should have linguistic type metadata with constraint
        const posLayer = result.value.annotationLayers.find(
          (l) => (l as AnyRecord).tierId === 'POS',
        ) as AnyRecord;
        expect(posLayer).toBeDefined();

        const metadata = posLayer.metadata as AnyRecord;
        expect(metadata.linguisticType).toBe('pos-type');
        expect(metadata.constraint).toBe('Symbolic_Association');
      }
    });

    it('includes linguistic types in result metadata', async () => {
      const result = await importer.parse(ELAN_WITH_LINGUISTIC_TYPES);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const lts = result.value.metadata.linguisticTypes as AnyRecord[];
        expect(lts).toHaveLength(2);
        expect(lts[0]!.id).toBe('default-lt');
        expect(lts[0]!.timeAlignable).toBe(true);
        expect(lts[1]!.id).toBe('pos-type');
        expect(lts[1]!.constraint).toBe('Symbolic_Association');
      }
    });
  });

  describe('controlled vocabulary extraction', () => {
    it('includes allowed values in annotation layer metadata from CV', async () => {
      const result = await importer.parse(ELAN_WITH_LINGUISTIC_TYPES);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const posLayer = result.value.annotationLayers.find(
          (l) => (l as AnyRecord).tierId === 'POS',
        ) as AnyRecord;

        const metadata = posLayer.metadata as AnyRecord;
        const allowedValues = metadata.allowedValues as AnyRecord[];
        expect(allowedValues).toHaveLength(2);
        expect(allowedValues[0]!.value).toBe('N');
        expect(allowedValues[0]!.description).toBe('Noun');
        expect(allowedValues[1]!.value).toBe('V');
        expect(allowedValues[1]!.description).toBe('Verb');
      }
    });

    it('includes controlled vocabulary summary in result metadata', async () => {
      const result = await importer.parse(ELAN_WITH_LINGUISTIC_TYPES);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const cvs = result.value.metadata.controlledVocabularies as AnyRecord[];
        expect(cvs).toHaveLength(1);
        expect(cvs[0]!.id).toBe('pos_tags');
        expect(cvs[0]!.entryCount).toBe(2);
      }
    });
  });

  describe('media descriptor extraction', () => {
    it('includes media descriptors in result metadata', async () => {
      const result = await importer.parse(ELAN_WITH_MEDIA);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const media = result.value.metadata.mediaDescriptors as AnyRecord[];
        expect(media).toHaveLength(2);

        expect(media[0]!.mediaUrl).toBe('file:///audio/recording.wav');
        expect(media[0]!.mimeType).toBe('audio/x-wav');
        expect(media[0]!.relativeMediaUrl).toBe('./recording.wav');

        expect(media[1]!.mediaUrl).toBe('file:///video/session.mp4');
        expect(media[1]!.mimeType).toBe('video/mp4');
      }
    });
  });
});
