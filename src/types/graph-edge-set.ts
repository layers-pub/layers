/**
 * Zod schemas and TypeScript types for the graph.graphEdgeSet record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a graphEdgeSet record from the firehose.
 *
 * Matches the `pub.layers.graph.graphEdgeSet` lexicon definition.
 */
const graphEdgeSetRecordSchema = z.object({
  expressionRef: z.string().optional(),
  edgeType: z.string(),
  name: z.string().optional(),
  edges: z.array(z.record(z.string(), z.unknown())),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated graphEdgeSet record from the firehose.
 */
type GraphEdgeSetRecord = z.infer<typeof graphEdgeSetRecordSchema>;

/**
 * A row from the `graph_edge_sets` PostgreSQL table.
 */
interface GraphEdgeSetRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string | null;
  readonly edge_type: string;
  readonly edge_count: number | null;
  readonly expression_ref: string | null;
  readonly indexed_at: Date;
  readonly record: GraphEdgeSetRecord;
}

/**
 * API response shape for a graph edge set (camelCase).
 */
interface GraphEdgeSetView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string | null;
  readonly edgeType: string;
  readonly edgeCount: number | null;
  readonly expressionRef: string | null;
  readonly indexedAt: string;
  readonly record: GraphEdgeSetRecord;
}

/**
 * Transforms a {@link GraphEdgeSetRow} into a {@link GraphEdgeSetView}.
 */
function toGraphEdgeSetView(row: GraphEdgeSetRow): GraphEdgeSetView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    name: row.name,
    edgeType: row.edge_type,
    edgeCount: row.edge_count,
    expressionRef: row.expression_ref,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getGraphEdgeSet.
 */
const getGraphEdgeSetParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listGraphEdgeSets.
 */
const listGraphEdgeSetsParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  getGraphEdgeSetParamsSchema,
  graphEdgeSetRecordSchema,
  listGraphEdgeSetsParamsSchema,
  toGraphEdgeSetView,
};
export type { GraphEdgeSetRecord, GraphEdgeSetRow, GraphEdgeSetView };
