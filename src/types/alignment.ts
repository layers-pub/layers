/**
 * Zod schemas and TypeScript types for the alignment.alignment record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating an alignment record from the firehose.
 *
 * Matches the `pub.layers.alignment.alignment` lexicon definition.
 */
const alignmentRecordSchema = z.object({
  expression: z.string().optional(),
  kind: z.string(),
  subkind: z.string().optional(),
  source: z.record(z.string(), z.unknown()),
  target: z.record(z.string(), z.unknown()),
  sourceLang: z.string().optional(),
  targetLang: z.string().optional(),
  links: z.array(z.record(z.string(), z.unknown())),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated alignment record from the firehose.
 */
type AlignmentRecord = z.infer<typeof alignmentRecordSchema>;

/**
 * A row from the `alignments` PostgreSQL table.
 */
interface AlignmentRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly expression_ref: string | null;
  readonly source_ref: string;
  readonly target_ref: string;
  readonly kind: string;
  readonly subkind: string | null;
  readonly indexed_at: Date;
  readonly record: AlignmentRecord;
}

/**
 * API response shape for an alignment (camelCase).
 */
interface AlignmentView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly expressionRef: string | null;
  readonly sourceRef: string;
  readonly targetRef: string;
  readonly kind: string;
  readonly subkind: string | null;
  readonly indexedAt: string;
  readonly record: AlignmentRecord;
}

/**
 * Transforms an {@link AlignmentRow} into an {@link AlignmentView}.
 */
function toAlignmentView(row: AlignmentRow): AlignmentView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    expressionRef: row.expression_ref,
    sourceRef: row.source_ref,
    targetRef: row.target_ref,
    kind: row.kind,
    subkind: row.subkind,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getAlignment.
 */
const getAlignmentParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listAlignments.
 */
const listAlignmentsParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  alignmentRecordSchema,
  getAlignmentParamsSchema,
  listAlignmentsParamsSchema,
  toAlignmentView,
};
export type { AlignmentRecord, AlignmentRow, AlignmentView };
