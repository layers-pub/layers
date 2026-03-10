/**
 * Praat TextGrid format importer.
 *
 * Parses Praat TextGrid files containing interval tiers and point
 * tiers for phonetic annotation. Supports both long (key=value) and
 * short (positional) formats, multi-line text values, and linked tier
 * heuristic detection. Produces annotation layers with temporal span
 * anchors for intervals and point timestamps for point tiers.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import { PluginError, ValidationError } from '../../types/errors.js';
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
  readonly linkedTo?: string | undefined;
}

/**
 * Parses Praat TextGrid files into Layers records.
 *
 * Supports both "ooTextFile" long format and the short positional
 * format. Multi-line text values (where the closing quote appears on
 * a subsequent line) are handled correctly. After parsing, a heuristic
 * detects potential tier linkage when all points in a point tier fall
 * within intervals of an interval tier.
 *
 * All temporal values are in seconds (Praat's native unit).
 */
class PraatImporter implements IFormatImporter {
  readonly format = 'praat' as const;
  readonly name = 'Praat TextGrid Importer';
  readonly version = '2.0.0';
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
    await Promise.resolve();

    const validation = this.validate(input);
    if (!validation.ok) {
      return Err(validation.error);
    }

    try {
      return Ok(this.parseInternal(input));
    } catch (err) {
      return Err(
        new PluginError(
          this.name,
          'import',
          err instanceof Error ? err.message : 'Unknown parse error',
          err instanceof Error ? err : undefined,
        ),
      );
    }
  }

  /**
   * Internal parse logic separated for cleaner error handling.
   */
  private parseInternal(input: string): ImportResult {
    const isShort = isShortFormat(input);
    const tiers = isShort ? parseShortFormat(input) : parseLongFormat(input);

    // Apply linked tier heuristic
    detectLinkedTiers(tiers);

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
          const layer: Record<string, unknown> = {
            kind: 'interval',
            subkind: tier.name.toLowerCase(),
            formalism: 'praat-textgrid',
            tierName: tier.name,
            annotations,
          };
          if (tier.linkedTo) {
            layer.metadata = { linkedTo: tier.linkedTo };
          }
          annotationLayers.push(layer);

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
          const layer: Record<string, unknown> = {
            kind: 'point',
            subkind: tier.name.toLowerCase(),
            formalism: 'praat-textgrid',
            tierName: tier.name,
            annotations,
          };
          if (tier.linkedTo) {
            layer.metadata = { linkedTo: tier.linkedTo };
          }
          annotationLayers.push(layer);
        }
      }
    }

    this.logger.debug('Praat TextGrid parsed', {
      tiers: tiers.length,
      annotationLayers: annotationLayers.length,
      format: isShort ? 'short' : 'long',
    });

    return {
      format: 'praat',
      expressions,
      segmentations: [],
      annotationLayers,
      metadata: {
        tierCount: tiers.length,
        formatVariant: isShort ? 'short' : 'long',
      },
    };
  }
}

/**
 * Detects whether a TextGrid string uses the short positional format.
 *
 * The short format has no "key = value" assignments after the header
 * lines. Detection examines the first several non-header lines for
 * the presence or absence of "=" signs.
 *
 * @param input - the raw TextGrid content
 * @returns true if the file uses the short format
 */
function isShortFormat(input: string): boolean {
  const lines = input.split('\n');
  let nonHeaderAssignments = 0;
  let nonHeaderPlain = 0;
  // Skip the first 3 lines (File type, Object class, blank line)
  for (let i = 3; i < Math.min(lines.length, 20); i++) {
    const line = (lines[i] ?? '').trim();
    if (line === '') continue;
    if (line.includes('=')) {
      nonHeaderAssignments++;
    } else {
      nonHeaderPlain++;
    }
  }
  return nonHeaderAssignments === 0 && nonHeaderPlain > 0;
}

/**
 * Extracts a quoted string value from lines, handling multi-line text.
 *
 * Praat text values are delimited by double quotes and may span
 * multiple lines. The closing quote is the last `"` on the final
 * line of the value.
 *
 * @param lines - all lines of the file
 * @param startIdx - the index of the line containing the opening quote
 * @returns a tuple of [extracted text, index of the last line consumed]
 */
function extractMultiLineQuoted(lines: string[], startIdx: number): [string, number] {
  const firstLine = lines[startIdx] ?? '';
  const quoteStart = firstLine.indexOf('"');
  if (quoteStart === -1) {
    return ['', startIdx];
  }

  const afterOpen = firstLine.substring(quoteStart + 1);
  // Check if the closing quote is on the same line
  const closeIdx = afterOpen.lastIndexOf('"');
  if (closeIdx !== -1) {
    return [afterOpen.substring(0, closeIdx), startIdx];
  }

  // Multi-line: accumulate until we find a line containing a closing quote
  const parts: string[] = [afterOpen];
  let idx = startIdx + 1;
  while (idx < lines.length) {
    const line = lines[idx] ?? '';
    const lineCloseIdx = line.lastIndexOf('"');
    if (lineCloseIdx !== -1) {
      parts.push(line.substring(0, lineCloseIdx));
      return [parts.join('\n'), idx];
    }
    parts.push(line);
    idx++;
  }
  // Unterminated string; return what we collected
  return [parts.join('\n'), idx - 1];
}

/**
 * Parse tier definitions from a Praat TextGrid in long (key=value) format.
 *
 * Handles multi-line text values by accumulating lines when a text
 * value's opening quote has no matching closing quote on the same line.
 *
 * @param input - the raw TextGrid content
 * @returns array of parsed tiers (mutable for linked tier detection)
 */
function parseLongFormat(input: string): PraatTier[] {
  const tiers: PraatTier[] = [];
  const lines = input.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = (lines[i] ?? '').trim();

    // Detect tier type
    if (line.includes('"IntervalTier"') || line.includes('"TextTier"')) {
      const isInterval = line.includes('"IntervalTier"');

      // Next line should be the tier name
      i++;
      const nameLine = lines[i] ?? '';
      const nameMatch = /name\s*=\s*"(.*)"/.exec(nameLine.trim());
      // Fall back: if the line is just a quoted string (e.g., in
      // files where class and name share key=value syntax), try
      // extracting without the "name =" prefix.
      const tierName = nameMatch?.[1] ?? extractSimpleQuoted(nameLine.trim());

      // Skip xmin, xmax, size lines
      i++; // xmin
      i++; // xmax
      i++; // intervals: size or points: size
      const sizeLine = (lines[i] ?? '').trim();
      const sizeMatch = /(\d+)/.exec(sizeLine);
      const count = sizeMatch ? parseInt(sizeMatch[1] ?? '0', 10) : 0;

      const intervals: PraatInterval[] = [];
      const points: PraatPoint[] = [];

      if (isInterval) {
        for (let j = 0; j < count; j++) {
          // Find xmin line
          i++;
          while (i < lines.length && !(lines[i] ?? '').includes('xmin')) {
            i++;
          }
          const xminLine = lines[i] ?? '';
          i++;
          const xmaxLine = lines[i] ?? '';
          i++;
          // Handle multi-line text
          const [text, lastIdx] = extractMultiLineQuotedFromKeyValue(lines, i);
          i = lastIdx;

          const xmin = parseFloat(extractValue(xminLine));
          const xmax = parseFloat(extractValue(xmaxLine));

          if (!isNaN(xmin) && !isNaN(xmax)) {
            intervals.push({ xmin, xmax, text });
          }
        }
      } else {
        for (let j = 0; j < count; j++) {
          // Find number line
          i++;
          while (i < lines.length && !(lines[i] ?? '').includes('number')) {
            i++;
          }
          const numberLine = lines[i] ?? '';
          i++;
          // Handle multi-line mark
          const [mark, lastIdx] = extractMultiLineQuotedFromKeyValue(lines, i);
          i = lastIdx;

          const num = parseFloat(extractValue(numberLine));

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
 * Parse tier definitions from a Praat TextGrid in the short positional format.
 *
 * The short format encodes values one per line without key names:
 * - File type = "ooTextFile"
 * - Object class = "TextGrid"
 * - (blank)
 * - xmin
 * - xmax
 * - <exists>
 * - tierCount
 * - Per tier: "TierType", "tierName", tierXmin, tierXmax, itemCount
 * - Per interval: xmin, xmax, "text"
 * - Per point: number, "text"
 *
 * @param input - the raw TextGrid content
 * @returns array of parsed tiers (mutable for linked tier detection)
 */
function parseShortFormat(input: string): PraatTier[] {
  const tiers: PraatTier[] = [];
  const lines = input.split('\n');

  // Skip header lines containing "="
  let idx = 0;
  while (idx < lines.length && (lines[idx] ?? '').includes('=')) {
    idx++;
  }
  // Skip blank lines after header
  while (idx < lines.length && (lines[idx] ?? '').trim() === '') {
    idx++;
  }

  // Root xmin, xmax
  idx++; // xmin (skip)
  idx++; // xmax (skip)

  // <exists> flag
  idx++;

  // Tier count
  const tierCount = parseInt((lines[idx] ?? '').trim(), 10);
  idx++;

  for (let t = 0; t < tierCount && idx < lines.length; t++) {
    // Tier type (quoted): "IntervalTier" or "TextTier"
    const tierTypeLine = (lines[idx] ?? '').trim().replace(/"/g, '');
    const isInterval = tierTypeLine === 'IntervalTier';
    idx++;

    // Tier name (quoted)
    const [tierName, nameLastIdx] = extractMultiLineQuoted(lines, idx);
    idx = nameLastIdx + 1;

    // Tier xmin, xmax (skip)
    idx++;
    idx++;

    // Item count
    const itemCount = parseInt((lines[idx] ?? '').trim(), 10);
    idx++;

    const intervals: PraatInterval[] = [];
    const points: PraatPoint[] = [];

    for (let n = 0; n < itemCount && idx < lines.length; n++) {
      if (isInterval) {
        const xmin = parseFloat((lines[idx] ?? '').trim());
        idx++;
        const xmax = parseFloat((lines[idx] ?? '').trim());
        idx++;
        const [text, lastIdx] = extractMultiLineQuoted(lines, idx);
        idx = lastIdx + 1;

        if (!isNaN(xmin) && !isNaN(xmax)) {
          intervals.push({ xmin, xmax, text });
        }
      } else {
        const num = parseFloat((lines[idx] ?? '').trim());
        idx++;
        const [mark, lastIdx] = extractMultiLineQuoted(lines, idx);
        idx = lastIdx + 1;

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

  return tiers;
}

/**
 * Detects potential tier linkage using a containment heuristic.
 *
 * If all non-empty points in a point tier fall within the non-empty
 * intervals of an interval tier, the point tier is marked as
 * potentially linked to that interval tier. This is a heuristic;
 * Praat TextGrids do not have explicit tier linkage.
 *
 * The `linkedTo` field is set on the tier objects in place.
 *
 * @param tiers - mutable array of parsed tiers
 */
function detectLinkedTiers(tiers: PraatTier[]): void {
  const intervalTiers = tiers.filter((t) => t.type === 'IntervalTier');
  const pointTiers = tiers.filter((t) => t.type === 'TextTier');

  for (const pointTier of pointTiers) {
    const nonEmptyPoints = pointTier.points.filter((p) => p.mark.trim().length > 0);
    if (nonEmptyPoints.length === 0) continue;

    for (const intervalTier of intervalTiers) {
      const nonEmptyIntervals = intervalTier.intervals.filter((iv) => iv.text.trim().length > 0);
      if (nonEmptyIntervals.length === 0) continue;

      const allContained = nonEmptyPoints.every((pt) =>
        nonEmptyIntervals.some((iv) => pt.number >= iv.xmin && pt.number <= iv.xmax),
      );

      if (allContained) {
        // Mutate the tier to set linkedTo. PraatTier is readonly in its
        // interface, but we cast here since we own the array.
        (pointTier as { linkedTo?: string }).linkedTo = intervalTier.name;
        break; // Link to the first matching interval tier
      }
    }
  }
}

/**
 * Extract a quoted string from a key=value TextGrid line, handling multi-line text.
 *
 * @param lines - all lines of the file
 * @param idx - the index of the line containing the text/mark key
 * @returns a tuple of [extracted text, index of the last line consumed]
 */
function extractMultiLineQuotedFromKeyValue(lines: string[], idx: number): [string, number] {
  const line = lines[idx] ?? '';
  const quoteStart = line.indexOf('"');
  if (quoteStart === -1) {
    // No quote on this line; return empty
    return ['', idx];
  }

  const afterOpen = line.substring(quoteStart + 1);
  const closeIdx = afterOpen.lastIndexOf('"');
  if (closeIdx !== -1) {
    return [afterOpen.substring(0, closeIdx), idx];
  }

  // Multi-line: accumulate
  const parts: string[] = [afterOpen];
  let i = idx + 1;
  while (i < lines.length) {
    const nextLine = lines[i] ?? '';
    const lineCloseIdx = nextLine.lastIndexOf('"');
    if (lineCloseIdx !== -1) {
      parts.push(nextLine.substring(0, lineCloseIdx));
      return [parts.join('\n'), i];
    }
    parts.push(nextLine);
    i++;
  }
  return [parts.join('\n'), i - 1];
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
 * Extract a simple quoted string from a line (no key prefix).
 *
 * @param line - a line like `"Mary"`
 * @returns the content between quotes, or 'unnamed' if no quotes found
 */
function extractSimpleQuoted(line: string): string {
  const match = /"(.*)"/.exec(line);
  return match?.[1] ?? 'unnamed';
}

export { PraatImporter };
