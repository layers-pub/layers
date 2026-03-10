/**
 * Zod schemas and TypeScript types for the judgment.judgmentSet record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a judgment set record from the firehose.
 *
 * Matches the `pub.layers.judgment.judgmentSet` lexicon definition.
 */
const judgmentSetRecordSchema = z.object({
  experimentRef: z.string(),
  agent: z.record(z.string(), z.unknown()).optional(),
  judgments: z.array(z.record(z.string(), z.unknown())),
  metadata: z.record(z.string(), z.unknown()).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated judgment set record from the firehose.
 */
type JudgmentSetRecord = z.infer<typeof judgmentSetRecordSchema>;

/**
 * A row from the `judgment_sets` PostgreSQL table.
 */
interface JudgmentSetRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly experiment_ref: string;
  readonly annotator_did: string | null;
  readonly indexed_at: Date;
  readonly record: JudgmentSetRecord;
}

/**
 * API response shape for a judgment set (camelCase).
 */
interface JudgmentSetView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly experimentRef: string;
  readonly annotatorDid: string | null;
  readonly indexedAt: string;
  readonly record: JudgmentSetRecord;
}

/**
 * Transforms a {@link JudgmentSetRow} into a {@link JudgmentSetView}.
 */
function toJudgmentSetView(row: JudgmentSetRow): JudgmentSetView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    experimentRef: row.experiment_ref,
    annotatorDid: row.annotator_did,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getJudgmentSet.
 */
const getJudgmentSetParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listJudgmentSets.
 */
const listJudgmentSetsParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  getJudgmentSetParamsSchema,
  judgmentSetRecordSchema,
  listJudgmentSetsParamsSchema,
  toJudgmentSetView,
};
export type { JudgmentSetRecord, JudgmentSetRow, JudgmentSetView };
