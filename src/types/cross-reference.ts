/**
 * Zod schemas and TypeScript types for cross-reference records.
 *
 * Cross-references track AT-URI relationships between records of
 * different types, enabling forward and reverse reference lookups.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema for a cross-reference entry.
 */
const crossReferenceSchema = z.object({
  sourceUri: z.string(),
  targetUri: z.string(),
  refType: z.string(),
  sourceCollection: z.string(),
});

/**
 * A cross-reference between two AT-URI records.
 */
type CrossReference = z.infer<typeof crossReferenceSchema>;

/**
 * A row from the `cross_references` PostgreSQL table.
 */
interface CrossReferenceRow {
  readonly source_uri: string;
  readonly target_uri: string;
  readonly ref_type: string;
  readonly source_collection: string;
  readonly created_at: Date;
}

/**
 * API response shape for a cross-reference (camelCase).
 */
interface CrossReferenceView {
  readonly sourceUri: string;
  readonly targetUri: string;
  readonly refType: string;
  readonly sourceCollection: string;
  readonly createdAt: string;
}

/**
 * Transforms a {@link CrossReferenceRow} into a {@link CrossReferenceView}.
 *
 * @param row - the database row to transform
 * @returns the API-facing view
 */
function toCrossReferenceView(row: CrossReferenceRow): CrossReferenceView {
  return {
    sourceUri: row.source_uri,
    targetUri: row.target_uri,
    refType: row.ref_type,
    sourceCollection: row.source_collection,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Query params schema for getForwardReferences.
 */
const getForwardRefsParamsSchema = z.object({
  uri: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for getReverseReferences.
 */
const getReverseRefsParamsSchema = z.object({
  uri: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  crossReferenceSchema,
  getForwardRefsParamsSchema,
  getReverseRefsParamsSchema,
  toCrossReferenceView,
};
export type { CrossReference, CrossReferenceRow, CrossReferenceView };
