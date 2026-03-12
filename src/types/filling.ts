/**
 * Zod schemas and TypeScript types for the resource.filling record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a filling record from the firehose.
 *
 * Matches the `pub.layers.resource.filling` lexicon definition.
 */
const fillingRecordSchema = z.object({
  templateRef: z.string(),
  slotFillings: z.array(z.record(z.string(), z.unknown())),
  renderedText: z.string(),
  expressionRef: z.string().optional(),
  strategy: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated filling record from the firehose.
 */
type FillingRecord = z.infer<typeof fillingRecordSchema>;

/**
 * A row from the `fillings` PostgreSQL table.
 */
interface FillingRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly template_ref: string;
  readonly expression_ref: string | null;
  readonly strategy: string | null;
  readonly indexed_at: Date;
  readonly record: FillingRecord;
}

/**
 * API response shape for a filling (camelCase).
 */
interface FillingView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly templateRef: string;
  readonly expressionRef: string | null;
  readonly strategy: string | null;
  readonly indexedAt: string;
  readonly record: FillingRecord;
}

/**
 * Transforms a {@link FillingRow} into a {@link FillingView}.
 */
function toFillingView(row: FillingRow): FillingView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    templateRef: row.template_ref,
    expressionRef: row.expression_ref,
    strategy: row.strategy,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getFilling.
 */
const getFillingParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listFillings.
 */
const listFillingsParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export { fillingRecordSchema, getFillingParamsSchema, listFillingsParamsSchema, toFillingView };
export type { FillingRecord, FillingRow, FillingView };
