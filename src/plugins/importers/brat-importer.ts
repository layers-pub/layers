/**
 * BRAT standoff format importer.
 *
 * Parses BRAT .ann files containing text-bound annotations (T-lines),
 * relations (R-lines), and attributes (A-lines) into Layers annotation
 * layer records.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import { ValidationError } from '../../types/errors.js';
import type { LayersError } from '../../types/errors.js';
import type { IFormatImporter, ImportResult } from '../../types/interfaces/plugin.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';

/**
 * A parsed text-bound annotation from a BRAT T-line.
 */
interface TextBoundAnnotation {
  readonly id: string;
  readonly type: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/**
 * A parsed relation annotation from a BRAT R-line.
 */
interface RelationAnnotation {
  readonly id: string;
  readonly type: string;
  readonly arg1: string;
  readonly arg2: string;
}

/**
 * A parsed attribute from a BRAT A-line.
 */
interface AttributeAnnotation {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly value?: string | undefined;
}

/**
 * Parses BRAT standoff annotation files into Layers records.
 *
 * BRAT .ann files use a line-oriented format where each line starts
 * with a type prefix:
 * - `T` for text-bound annotations (e.g., `T1\tPerson 0 5\tJohn`)
 * - `R` for relations (e.g., `R1\tLocated Arg1:T1 Arg2:T2`)
 * - `A` for attributes (e.g., `A1\tNegation T1`)
 * - `#` for comments
 */
class BratImporter implements IFormatImporter {
  readonly format = 'brat' as const;
  readonly name = 'BRAT Standoff Importer';
  readonly version = '1.0.0';
  private readonly logger = createLogger({ service: 'brat-importer' });

  validate(input: string): Result<void, LayersError> {
    if (!input || input.trim().length === 0) {
      return Err(new ValidationError('Input is empty'));
    }

    const lines = input.trim().split('\n');
    const dataLines = lines.filter((l) => l.trim().length > 0);

    if (dataLines.length === 0) {
      return Err(new ValidationError('No annotation lines found in BRAT input'));
    }

    // Verify that lines start with expected prefixes
    for (const line of dataLines) {
      const prefix = line[0];
      if (
        prefix !== 'T' &&
        prefix !== 'R' &&
        prefix !== 'A' &&
        prefix !== 'E' &&
        prefix !== '#' &&
        prefix !== 'M' &&
        prefix !== 'N'
      ) {
        return Err(
          new ValidationError(
            `Invalid BRAT line prefix '${prefix ?? ''}': expected T, R, A, E, M, N, or #`,
          ),
        );
      }
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

    const lines = input.trim().split('\n');
    const textBounds: TextBoundAnnotation[] = [];
    const relations: RelationAnnotation[] = [];
    const attributes: AttributeAnnotation[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

      const prefix = trimmed[0];
      if (prefix === 'T') {
        const parsed = parseTextBound(trimmed);
        if (parsed) textBounds.push(parsed);
      } else if (prefix === 'R') {
        const parsed = parseRelation(trimmed);
        if (parsed) relations.push(parsed);
      } else if (prefix === 'A' || prefix === 'M') {
        const parsed = parseAttribute(trimmed);
        if (parsed) attributes.push(parsed);
      }
    }

    const annotationLayers: Record<string, unknown>[] = [];

    // Group text-bound annotations by type
    const typeGroups = new Map<string, TextBoundAnnotation[]>();
    for (const ann of textBounds) {
      const existing = typeGroups.get(ann.type) ?? [];
      existing.push(ann);
      typeGroups.set(ann.type, existing);
    }

    for (const [type, annotations] of typeGroups) {
      annotationLayers.push({
        kind: 'entity',
        subkind: type.toLowerCase(),
        formalism: 'brat-standoff',
        annotations: annotations.map((a) => ({
          id: a.id,
          label: a.type,
          text: a.text,
          anchor: { textSpan: { start: a.start, end: a.end } },
        })),
      });
    }

    // Relations as a separate layer
    if (relations.length > 0) {
      annotationLayers.push({
        kind: 'relation',
        subkind: 'binary',
        formalism: 'brat-standoff',
        annotations: relations.map((r) => ({
          id: r.id,
          label: r.type,
          arg1: r.arg1,
          arg2: r.arg2,
        })),
      });
    }

    this.logger.debug('BRAT parsed', {
      textBounds: textBounds.length,
      relations: relations.length,
      attributes: attributes.length,
    });

    return Ok({
      format: 'brat',
      expressions: [],
      segmentations: [],
      annotationLayers,
      metadata: {
        textBoundCount: textBounds.length,
        relationCount: relations.length,
        attributeCount: attributes.length,
      },
    });
  }
}

/**
 * Parse a BRAT T-line into a text-bound annotation.
 *
 * Format: `T{id}\t{type} {start} {end}\t{text}`
 */
function parseTextBound(line: string): TextBoundAnnotation | undefined {
  const parts = line.split('\t');
  if (parts.length < 3) return undefined;

  const id = parts[0] ?? '';
  const typePart = parts[1] ?? '';
  const text = parts[2] ?? '';

  const typeFields = typePart.split(' ');
  if (typeFields.length < 3) return undefined;

  const type = typeFields[0] ?? '';
  const start = parseInt(typeFields[1] ?? '', 10);
  const end = parseInt(typeFields[2] ?? '', 10);

  if (isNaN(start) || isNaN(end)) return undefined;

  return { id, type, start, end, text };
}

/**
 * Parse a BRAT R-line into a relation annotation.
 *
 * Format: `R{id}\t{type} Arg1:{target1} Arg2:{target2}`
 */
function parseRelation(line: string): RelationAnnotation | undefined {
  const parts = line.split('\t');
  if (parts.length < 2) return undefined;

  const id = parts[0] ?? '';
  const typePart = parts[1] ?? '';
  const fields = typePart.split(' ');

  if (fields.length < 3) return undefined;

  const type = fields[0] ?? '';
  const arg1Match = /^Arg1:(.+)$/.exec(fields[1] ?? '');
  const arg2Match = /^Arg2:(.+)$/.exec(fields[2] ?? '');

  if (!arg1Match || !arg2Match) return undefined;

  return { id, type, arg1: arg1Match[1] ?? '', arg2: arg2Match[1] ?? '' };
}

/**
 * Parse a BRAT A-line into an attribute annotation.
 *
 * Format: `A{id}\t{type} {target} [{value}]`
 */
function parseAttribute(line: string): AttributeAnnotation | undefined {
  const parts = line.split('\t');
  if (parts.length < 2) return undefined;

  const id = parts[0] ?? '';
  const typePart = parts[1] ?? '';
  const fields = typePart.split(' ');

  if (fields.length < 2) return undefined;

  const type = fields[0] ?? '';
  const target = fields[1] ?? '';
  const value = fields.length > 2 ? (fields[2] ?? undefined) : undefined;

  return { id, type, target, value };
}

export { BratImporter };
