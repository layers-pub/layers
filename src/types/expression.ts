/**
 * Zod schemas and TypeScript types for the expression.expression record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema for a knowledge reference entry.
 */
const knowledgeRefSchema = z.object({
  source: z.string(),
  identifier: z.string(),
  label: z.string().optional(),
  uri: z.string().optional(),
});

/**
 * Zod schema validating an expression record from the firehose.
 *
 * Matches the `pub.layers.expression.expression` lexicon definition.
 */
const expressionRecordSchema = z.object({
  id: z.string().max(1024),
  kindUri: z.string().optional(),
  kind: z.string().max(128).optional(),
  text: z.string().max(10_000_000).optional(),
  language: z.string().max(32).optional(),
  languages: z.array(z.string().max(32)).max(64).optional(),
  parentRef: z.string().optional(),
  anchor: z.record(z.string(), z.unknown()).optional(),
  mediaRef: z.string().optional(),
  mediaBlob: z.unknown().optional(),
  sourceUrl: z.string().optional(),
  sourceRef: z.string().optional(),
  eprintRef: z.string().optional(),
  knowledgeRefs: z.array(knowledgeRefSchema).max(128).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated expression record from the firehose.
 */
type ExpressionRecord = z.infer<typeof expressionRecordSchema>;

/**
 * A row from the `expressions` PostgreSQL table.
 */
interface ExpressionRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly text: string | null;
  readonly kind: string | null;
  readonly language: string | null;
  readonly source_url: string | null;
  readonly source_ref: string | null;
  readonly eprint_ref: string | null;
  readonly parent_ref: string | null;
  readonly indexed_at: Date;
  readonly record: ExpressionRecord;
}

/**
 * API response shape for an expression (camelCase).
 */
interface ExpressionView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly text: string | null;
  readonly kind: string | null;
  readonly language: string | null;
  readonly sourceUrl: string | null;
  readonly sourceRef: string | null;
  readonly eprintRef: string | null;
  readonly parentRef: string | null;
  readonly indexedAt: string;
  readonly record: ExpressionRecord;
}

/**
 * Transforms an {@link ExpressionRow} into an {@link ExpressionView}.
 */
function toExpressionView(row: ExpressionRow): ExpressionView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    text: row.text,
    kind: row.kind,
    language: row.language,
    sourceUrl: row.source_url,
    sourceRef: row.source_ref,
    eprintRef: row.eprint_ref,
    parentRef: row.parent_ref,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getExpression.
 */
const getExpressionParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listExpressions.
 */
const listExpressionsParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchExpressions.
 */
const searchExpressionsParamsSchema = z.object({
  q: z.string().min(1),
  language: z.string().optional(),
  kind: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  expressionRecordSchema,
  getExpressionParamsSchema,
  listExpressionsParamsSchema,
  searchExpressionsParamsSchema,
  toExpressionView,
};
export type { ExpressionRecord, ExpressionRow, ExpressionView };
