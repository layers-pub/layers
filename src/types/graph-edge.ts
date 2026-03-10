/**
 * Zod schemas and TypeScript types for the graph.graphEdge record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a graphEdge record from the firehose.
 *
 * Matches the `pub.layers.graph.graphEdge` lexicon definition.
 */
const graphEdgeRecordSchema = z.object({
  source: z.record(z.string(), z.unknown()),
  target: z.record(z.string(), z.unknown()),
  edgeType: z.string(),
  label: z.string().optional(),
  ordinal: z.number().int().optional(),
  confidence: z.number().int().min(0).max(1000).optional(),
  edgeSetRef: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated graphEdge record from the firehose.
 */
type GraphEdgeRecord = z.infer<typeof graphEdgeRecordSchema>;

/**
 * A row from the `graph_edges` PostgreSQL table.
 */
interface GraphEdgeRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly source_ref: string;
  readonly target_ref: string;
  readonly edge_type: string;
  readonly edge_set_ref: string | null;
  readonly confidence: number | null;
  readonly indexed_at: Date;
  readonly record: GraphEdgeRecord;
}

/**
 * API response shape for a graph edge (camelCase).
 */
interface GraphEdgeView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly sourceRef: string;
  readonly targetRef: string;
  readonly edgeType: string;
  readonly edgeSetRef: string | null;
  readonly confidence: number | null;
  readonly indexedAt: string;
  readonly record: GraphEdgeRecord;
}

/**
 * Transforms a {@link GraphEdgeRow} into a {@link GraphEdgeView}.
 */
function toGraphEdgeView(row: GraphEdgeRow): GraphEdgeView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    sourceRef: row.source_ref,
    targetRef: row.target_ref,
    edgeType: row.edge_type,
    edgeSetRef: row.edge_set_ref,
    confidence: row.confidence,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getGraphEdge.
 */
const getGraphEdgeParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listGraphEdges.
 */
const listGraphEdgesParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  getGraphEdgeParamsSchema,
  graphEdgeRecordSchema,
  listGraphEdgesParamsSchema,
  toGraphEdgeView,
};
export type { GraphEdgeRecord, GraphEdgeRow, GraphEdgeView };
