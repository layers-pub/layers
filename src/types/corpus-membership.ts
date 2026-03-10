/**
 * Zod schemas and TypeScript types for the corpus.membership record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a corpus membership record from the firehose.
 *
 * Matches the `pub.layers.corpus.membership` lexicon definition.
 */
const corpusMembershipRecordSchema = z.object({
  corpusRef: z.string(),
  expressionRef: z.string(),
  splitUri: z.string().optional(),
  split: z.string().max(64).optional(),
  ordinal: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated corpus membership record from the firehose.
 */
type CorpusMembershipRecord = z.infer<typeof corpusMembershipRecordSchema>;

/**
 * A row from the `corpus_memberships` PostgreSQL table.
 */
interface CorpusMembershipRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly corpus_ref: string;
  readonly expression_ref: string;
  readonly split: string | null;
  readonly indexed_at: Date;
  readonly record: CorpusMembershipRecord;
}

/**
 * API response shape for a corpus membership (camelCase).
 */
interface CorpusMembershipView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly corpusRef: string;
  readonly expressionRef: string;
  readonly split: string | null;
  readonly indexedAt: string;
  readonly record: CorpusMembershipRecord;
}

/**
 * Transforms a {@link CorpusMembershipRow} into a {@link CorpusMembershipView}.
 */
function toCorpusMembershipView(row: CorpusMembershipRow): CorpusMembershipView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    corpusRef: row.corpus_ref,
    expressionRef: row.expression_ref,
    split: row.split,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getMembership.
 */
const getMembershipParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listMemberships.
 */
const listMembershipsParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  corpusMembershipRecordSchema,
  getMembershipParamsSchema,
  listMembershipsParamsSchema,
  toCorpusMembershipView,
};
export type { CorpusMembershipRecord, CorpusMembershipRow, CorpusMembershipView };
