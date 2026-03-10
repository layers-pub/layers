/**
 * Praat TextGrid format importer.
 *
 * Parses Praat TextGrid files containing interval tiers and point
 * tiers for phonetic annotation. Produces annotation layers with
 * temporal span anchors for intervals and point timestamps for
 * point tiers.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import { ValidationError } from '../../types/errors.js';
import type { LayersError } from '../../types/errors.js';
import type { IFormatImporter, ImportResult } from '../../types/interfaces/plugin.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';

/**
 * A parsed interval from a Praat interval tier.
 */
interface PraatInterval {
  readonly xmin: number;
  readonly xmax: number;
  readonly text: string;
}

/**
 * A parsed point from a Praat point tier.
 */
interface PraatPoint {
  readonly number: number;
  readonly mark: string;
}

/**
 * A parsed tier from a Praat TextGrid.
 */
interface PraatTier {
  readonly name: string;
  readonly type: 'IntervalTier' | 'TextTier';
  readonly intervals: PraatInterval[];
  readonly points: PraatPoint[];
}

/**
 * Parses Praat TextGrid files into Layers records.
 *
 * Supports both "ooTextFile" long format TextGrids. Each interval
 * tier becomes an annotation layer with temporal span anchors,
 * and each point tier becomes an annotation layer with point
 * timestamps.
 */
class PraatImporter implements IFormatImporter {
  readonly format = 'praat' as const;
  readonly name = 'Praat TextGrid Importer';
  readonly version = '1.0.0';
  private readonly logger = createLogger({ service: 'praat-importer' });

  validate(input: string): Result<void, LayersError> {
    if (!input || input.trim().length === 0) {
      return Err(new ValidationError('Input is empty'));
    }

    if (
      !input.includes('ooTextFile') &&
      !input.includes('Object class') &&
      !input.includes('"TextGrid"')
    ) {
      return Err(new ValidationError('Input does not appear to be a Praat TextGrid file'));
    }

    return Ok(undefined);
  }

  async parse(
    input: string,
    _options?: Record<string, unknown>,
  ): Promise<Result<ImportResult, LayersError>> {
    const validation = this.validate(input);
    if (!validation.ok) {
      return Err(validation.error);
    }

    const tiers = await Promise.resolve(parseTiers(input));
    const annotationLayers: Record<string, unknown>[] = [];
    const expressions: Record<string, unknown>[] = [];

    for (const tier of tiers) {
      if (tier.type === 'IntervalTier') {
        const annotations = tier.intervals
          .filter((iv) => iv.text.trim().length > 0)
          .map((iv) => ({
            value: iv.text,
            anchor: {
              temporalSpan: {
                startSeconds: iv.xmin,
                endSeconds: iv.xmax,
              },
            },
          }));

        if (annotations.length > 0) {
          annotationLayers.push({
            kind: 'interval',
            subkind: tier.name.toLowerCase(),
            formalism: 'praat-textgrid',
            tierName: tier.name,
            annotations,
          });

          // Create expressions from non-empty interval texts
          for (const iv of tier.intervals) {
            if (iv.text.trim().length > 0) {
              expressions.push({
                text: iv.text,
                kind: 'segment',
                sourceFormat: 'praat',
              });
            }
          }
        }
      } else if (tier.type === 'TextTier') {
        const annotations = tier.points
          .filter((pt) => pt.mark.trim().length > 0)
          .map((pt) => ({
            value: pt.mark,
            anchor: {
              temporalPoint: {
                timeSeconds: pt.number,
              },
            },
          }));

        if (annotations.length > 0) {
          annotationLayers.push({
            kind: 'point',
            subkind: tier.name.toLowerCase(),
            formalism: 'praat-textgrid',
            tierName: tier.name,
            annotations,
          });
        }
      }
    }

    this.logger.debug('Praat TextGrid parsed', {
      tiers: tiers.length,
      annotationLayers: annotationLayers.length,
    });

    return Ok({
      format: 'praat',
      expressions,
      segmentations: [],
      annotationLayers,
      metadata: {
        tierCount: tiers.length,
      },
    });
  }
}

/**
 * Parse tier definitions from a Praat TextGrid string.
 *
 * @param input - the raw TextGrid content
 * @returns array of parsed tiers
 */
function parseTiers(input: string): PraatTier[] {
  const tiers: PraatTier[] = [];
  const lines = input.split('\n').map((l) => l.trim());

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Detect tier type
    if (line.includes('"IntervalTier"') || line.includes('"TextTier"')) {
      const isInterval = line.includes('"IntervalTier"');

      // Next line should be the tier name
      i++;
      const nameLine = lines[i] ?? '';
      const nameMatch = /^"(.*)"/.exec(nameLine);
      const tierName = nameMatch?.[1] ?? 'unnamed';

      // Skip xmin, xmax, size lines
      i++; // xmin
      i++; // xmax
      i++; // intervals: size or points: size
      const sizeLine = lines[i] ?? '';
      const sizeMatch = /(\d+)/.exec(sizeLine);
      const count = sizeMatch ? parseInt(sizeMatch[1] ?? '0', 10) : 0;

      const intervals: PraatInterval[] = [];
      const points: PraatPoint[] = [];

      if (isInterval) {
        for (let j = 0; j < count; j++) {
          // Skip "intervals [n]:" line
          i++;
          while (i < lines.length && !(lines[i] ?? '').includes('xmin')) {
            i++;
          }
          const xminLine = lines[i] ?? '';
          i++;
          const xmaxLine = lines[i] ?? '';
          i++;
          const textLine = lines[i] ?? '';

          const xmin = parseFloat(extractValue(xminLine));
          const xmax = parseFloat(extractValue(xmaxLine));
          const text = extractQuotedValue(textLine);

          if (!isNaN(xmin) && !isNaN(xmax)) {
            intervals.push({ xmin, xmax, text });
          }
        }
      } else {
        for (let j = 0; j < count; j++) {
          // Skip "points [n]:" line
          i++;
          while (i < lines.length && !(lines[i] ?? '').includes('number')) {
            i++;
          }
          const numberLine = lines[i] ?? '';
          i++;
          const markLine = lines[i] ?? '';

          const num = parseFloat(extractValue(numberLine));
          const mark = extractQuotedValue(markLine);

          if (!isNaN(num)) {
            points.push({ number: num, mark });
          }
        }
      }

      tiers.push({
        name: tierName,
        type: isInterval ? 'IntervalTier' : 'TextTier',
        intervals,
        points,
      });
    }

    i++;
  }

  return tiers;
}

/**
 * Extract a numeric value after `=` from a TextGrid line.
 *
 * @param line - a line like `xmin = 0.0`
 * @returns the string after the `=` sign
 */
function extractValue(line: string): string {
  const parts = line.split('=');
  return (parts[1] ?? '').trim();
}

/**
 * Extract a quoted string value after `=` from a TextGrid line.
 *
 * @param line - a line like `text = "hello"`
 * @returns the content between quotes, or an empty string
 */
function extractQuotedValue(line: string): string {
  const match = /"(.*)"/.exec(line);
  return match?.[1] ?? '';
}

export { PraatImporter };
