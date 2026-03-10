/**
 * Unit tests for the Praat TextGrid format importer.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { PraatImporter } from '@/plugins/importers/praat-importer.js';
import { isErr, isOk } from '@/types/result.js';

// Helper type alias for record access
type AnyRecord = Record<string, unknown>;

function getAnnotations(layer: AnyRecord): AnyRecord[] {
  return layer.annotations as AnyRecord[];
}

function getAnchor(ann: AnyRecord): AnyRecord {
  return ann.anchor as AnyRecord;
}

const LONG_FORMAT_TEXTGRID = `File type = "ooTextFile"
Object class = "TextGrid"

xmin = 0
xmax = 2.3
tiers? <exists>
size = 2
item []:
    item [1]:
        class = "IntervalTier"
        name = "Mary"
        xmin = 0
        xmax = 2.3
        intervals: size = 3
        intervals [1]:
            xmin = 0
            xmax = 0.7
            text = ""
        intervals [2]:
            xmin = 0.7
            xmax = 1.6
            text = "hello"
        intervals [3]:
            xmin = 1.6
            xmax = 2.3
            text = "world"
    item [2]:
        class = "TextTier"
        name = "Events"
        xmin = 0
        xmax = 2.3
        points: size = 2
        points [1]:
            number = 0.8
            mark = "click"
        points [2]:
            number = 1.2
            mark = "buzz"`;

const SHORT_FORMAT_TEXTGRID = `File type = "ooTextFile"
Object class = "TextGrid"

0
2.3
<exists>
2
"IntervalTier"
"Mary"
0
2.3
3
0
0.7
""
0.7
1.6
"hello"
1.6
2.3
"world"
"TextTier"
"Events"
0
2.3
2
0.8
"click"
1.2
"buzz"`;

const MULTI_LINE_TEXTGRID = `File type = "ooTextFile"
Object class = "TextGrid"

xmin = 0
xmax = 3.0
tiers? <exists>
size = 1
item []:
    item [1]:
        class = "IntervalTier"
        name = "Notes"
        xmin = 0
        xmax = 3.0
        intervals: size = 2
        intervals [1]:
            xmin = 0
            xmax = 1.5
            text = "first line
second line
third line"
        intervals [2]:
            xmin = 1.5
            xmax = 3.0
            text = "simple"`;

const LINKED_TIERS_TEXTGRID = `File type = "ooTextFile"
Object class = "TextGrid"

xmin = 0
xmax = 3.0
tiers? <exists>
size = 2
item []:
    item [1]:
        class = "IntervalTier"
        name = "Words"
        xmin = 0
        xmax = 3.0
        intervals: size = 2
        intervals [1]:
            xmin = 0
            xmax = 1.5
            text = "hello"
        intervals [2]:
            xmin = 1.5
            xmax = 3.0
            text = "world"
    item [2]:
        class = "TextTier"
        name = "Phonemes"
        xmin = 0
        xmax = 3.0
        points: size = 3
        points [1]:
            number = 0.3
            mark = "h"
        points [2]:
            number = 0.8
            mark = "e"
        points [3]:
            number = 1.7
            mark = "w"`;

describe('PraatImporter', () => {
  const importer = new PraatImporter();

  describe('validate', () => {
    it('accepts valid TextGrid input', () => {
      const result = importer.validate(LONG_FORMAT_TEXTGRID);
      expect(isOk(result)).toBe(true);
    });

    it('rejects empty input', () => {
      const result = importer.validate('');
      expect(isErr(result)).toBe(true);
    });

    it('rejects non-TextGrid content', () => {
      const result = importer.validate('random text without textgrid markers');
      expect(isErr(result)).toBe(true);
    });
  });

  describe('long format parsing', () => {
    it('parses interval tiers', async () => {
      const result = await importer.parse(LONG_FORMAT_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.format).toBe('praat');

        const intervalLayer = result.value.annotationLayers.find(
          (l) => (l as AnyRecord).kind === 'interval',
        ) as AnyRecord;
        expect(intervalLayer).toBeDefined();
        expect(intervalLayer.tierName).toBe('Mary');

        const annotations = getAnnotations(intervalLayer);
        expect(annotations).toHaveLength(2);
        expect(annotations[0]!.value).toBe('hello');
        expect(annotations[1]!.value).toBe('world');
      }
    });

    it('parses point tiers', async () => {
      const result = await importer.parse(LONG_FORMAT_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const pointLayer = result.value.annotationLayers.find(
          (l) => (l as AnyRecord).kind === 'point',
        ) as AnyRecord;
        expect(pointLayer).toBeDefined();
        expect(pointLayer.tierName).toBe('Events');

        const annotations = getAnnotations(pointLayer);
        expect(annotations).toHaveLength(2);
        expect(annotations[0]!.value).toBe('click');
      }
    });

    it('uses seconds for temporal values', async () => {
      const result = await importer.parse(LONG_FORMAT_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const intervalLayer = result.value.annotationLayers.find(
          (l) => (l as AnyRecord).kind === 'interval',
        ) as AnyRecord;
        const annotations = getAnnotations(intervalLayer);
        const anchor = getAnchor(annotations[0]!);
        const span = anchor.temporalSpan as AnyRecord;
        expect(span.startSeconds).toBe(0.7);
        expect(span.endSeconds).toBe(1.6);
      }
    });

    it('includes format variant in metadata', async () => {
      const result = await importer.parse(LONG_FORMAT_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.metadata.formatVariant).toBe('long');
      }
    });

    it('returns error for empty input', async () => {
      const result = await importer.parse('');
      expect(isErr(result)).toBe(true);
    });
  });

  describe('short format parsing', () => {
    it('parses interval tiers from short format', async () => {
      const result = await importer.parse(SHORT_FORMAT_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const intervalLayer = result.value.annotationLayers.find(
          (l) => (l as AnyRecord).kind === 'interval',
        ) as AnyRecord;
        expect(intervalLayer).toBeDefined();
        expect(intervalLayer.tierName).toBe('Mary');

        const annotations = getAnnotations(intervalLayer);
        expect(annotations).toHaveLength(2);
        expect(annotations[0]!.value).toBe('hello');
        expect(annotations[1]!.value).toBe('world');
      }
    });

    it('parses point tiers from short format', async () => {
      const result = await importer.parse(SHORT_FORMAT_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const pointLayer = result.value.annotationLayers.find(
          (l) => (l as AnyRecord).kind === 'point',
        ) as AnyRecord;
        expect(pointLayer).toBeDefined();
        expect(pointLayer.tierName).toBe('Events');

        const annotations = getAnnotations(pointLayer);
        expect(annotations).toHaveLength(2);
        expect(annotations[0]!.value).toBe('click');
        expect(annotations[1]!.value).toBe('buzz');
      }
    });

    it('uses seconds for temporal values in short format', async () => {
      const result = await importer.parse(SHORT_FORMAT_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const pointLayer = result.value.annotationLayers.find(
          (l) => (l as AnyRecord).kind === 'point',
        ) as AnyRecord;
        const annotations = getAnnotations(pointLayer);
        const anchor = getAnchor(annotations[0]!);
        const temporalPoint = anchor.temporalPoint as AnyRecord;
        expect(temporalPoint.timeSeconds).toBe(0.8);
      }
    });

    it('includes format variant in metadata', async () => {
      const result = await importer.parse(SHORT_FORMAT_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        expect(result.value.metadata.formatVariant).toBe('short');
      }
    });

    it('produces equivalent results to long format', async () => {
      const longResult = await importer.parse(LONG_FORMAT_TEXTGRID);
      const shortResult = await importer.parse(SHORT_FORMAT_TEXTGRID);
      expect(isOk(longResult)).toBe(true);
      expect(isOk(shortResult)).toBe(true);

      if (isOk(longResult) && isOk(shortResult)) {
        expect(shortResult.value.annotationLayers).toHaveLength(
          longResult.value.annotationLayers.length,
        );
        expect(shortResult.value.metadata.tierCount).toBe(longResult.value.metadata.tierCount);
      }
    });
  });

  describe('multi-line text values', () => {
    it('handles text values spanning multiple lines', async () => {
      const result = await importer.parse(MULTI_LINE_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const layer = result.value.annotationLayers[0] as AnyRecord;
        const annotations = getAnnotations(layer);
        expect(annotations).toHaveLength(2);
        expect(annotations[0]!.value).toBe('first line\nsecond line\nthird line');
        expect(annotations[1]!.value).toBe('simple');
      }
    });
  });

  describe('linked tier detection', () => {
    it('detects point tier linked to interval tier', async () => {
      const result = await importer.parse(LINKED_TIERS_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const pointLayer = result.value.annotationLayers.find(
          (l) => (l as AnyRecord).kind === 'point',
        ) as AnyRecord;
        expect(pointLayer).toBeDefined();

        const metadata = pointLayer.metadata as AnyRecord;
        expect(metadata).toBeDefined();
        expect(metadata.linkedTo).toBe('Words');
      }
    });

    it('detects linkage when points fall within non-empty intervals', async () => {
      // The long format test data has points at 0.8 and 1.2, which fall within
      // the "Mary" tier interval "hello" (0.7-1.6). The heuristic should detect linkage.
      const result = await importer.parse(LONG_FORMAT_TEXTGRID);
      expect(isOk(result)).toBe(true);

      if (isOk(result)) {
        const pointLayer = result.value.annotationLayers.find(
          (l) => (l as AnyRecord).kind === 'point',
        ) as AnyRecord;
        const metadata = pointLayer.metadata as AnyRecord;
        expect(metadata).toBeDefined();
        expect(metadata.linkedTo).toBe('Mary');
      }
    });
  });
});
