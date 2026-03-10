/**
 * Zod schemas and TypeScript types for the annotation.clusterSet record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a cluster set record from the firehose.
 *
 * Matches the `pub.layers.annotation.clusterSet` lexicon definition.
 */
const clusterSetRecordSchema = z.object({
  expression: z.string().optional(),
  expressionRefs: z.array(z.string()).optional(),
  corpusRef: z.string().optional(),
  kind: z.string().optional(),
  layerRef: z.string(),
  clusters: z.array(z.record(z.string(), z.unknown())),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated cluster set record from the firehose.
 */
type ClusterSetRecord = z.infer<typeof clusterSetRecordSchema>;

/**
 * A row from the `cluster_sets` PostgreSQL table.
 */
interface ClusterSetRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly expression_ref: string | null;
  readonly layer_ref: string;
  readonly kind: string | null;
  readonly indexed_at: Date;
  readonly record: ClusterSetRecord;
}

/**
 * API response shape for a cluster set (camelCase).
 */
interface ClusterSetView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly expressionRef: string | null;
  readonly layerRef: string;
  readonly kind: string | null;
  readonly indexedAt: string;
  readonly record: ClusterSetRecord;
}

/**
 * Transforms a {@link ClusterSetRow} into a {@link ClusterSetView}.
 */
function toClusterSetView(row: ClusterSetRow): ClusterSetView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    expressionRef: row.expression_ref,
    layerRef: row.layer_ref,
    kind: row.kind,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getClusterSet.
 */
const getClusterSetParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listClusterSets.
 */
const listClusterSetsParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  clusterSetRecordSchema,
  getClusterSetParamsSchema,
  listClusterSetsParamsSchema,
  toClusterSetView,
};
export type { ClusterSetRecord, ClusterSetRow, ClusterSetView };
