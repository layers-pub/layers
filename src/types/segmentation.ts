/**
 * Zod schemas and TypeScript types for the segmentation.segmentation record type.
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
 * Zod schema validating a segmentation record from the firehose.
 *
 * Matches the `pub.layers.segmentation.segmentation` lexicon definition.
 */
const segmentationRecordSchema = z.object({
  expression: z.string(),
  tokenizations: z.array(z.record(z.string(), z.unknown())),
  metadata: z.record(z.string(), z.unknown()).optional(),
  knowledgeRefs: z.array(knowledgeRefSchema).max(16).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated segmentation record from the firehose.
 */
type SegmentationRecord = z.infer<typeof segmentationRecordSchema>;

/**
 * A row from the `segmentations` PostgreSQL table.
 */
interface SegmentationRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly expression_ref: string;
  readonly indexed_at: Date;
  readonly record: SegmentationRecord;
}

/**
 * API response shape for a segmentation (camelCase).
 */
interface SegmentationView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly expressionRef: string;
  readonly indexedAt: string;
  readonly record: SegmentationRecord;
}

/**
 * Transforms a {@link SegmentationRow} into a {@link SegmentationView}.
 */
function toSegmentationView(row: SegmentationRow): SegmentationView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    expressionRef: row.expression_ref,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getSegmentation.
 */
const getSegmentationParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listSegmentations.
 */
const listSegmentationsParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  getSegmentationParamsSchema,
  listSegmentationsParamsSchema,
  segmentationRecordSchema,
  toSegmentationView,
};
export type { SegmentationRecord, SegmentationRow, SegmentationView };
