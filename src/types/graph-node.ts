/**
 * Zod schemas and TypeScript types for the graph.graphNode record type.
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
 * Zod schema validating a graphNode record from the firehose.
 *
 * Matches the `pub.layers.graph.graphNode` lexicon definition.
 */
const graphNodeRecordSchema = z.object({
  nodeType: z.string().max(128),
  createdAt: z.string(),
  nodeTypeUri: z.string().optional(),
  label: z.string().max(1024).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  knowledgeRefs: z.array(knowledgeRefSchema).max(64).optional(),
  metadata: z.unknown().optional(),
});

/**
 * Validated graphNode record from the firehose.
 */
type GraphNodeRecord = z.infer<typeof graphNodeRecordSchema>;

/**
 * A row from the `graph_nodes` PostgreSQL table.
 */
interface GraphNodeRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly node_type: string;
  readonly label: string | null;
  readonly indexed_at: Date;
  readonly record: GraphNodeRecord;
}

/**
 * API response shape for a graph node (camelCase).
 */
interface GraphNodeView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly nodeType: string;
  readonly label: string | null;
  readonly indexedAt: string;
  readonly record: GraphNodeRecord;
}

/**
 * Transforms a {@link GraphNodeRow} into a {@link GraphNodeView}.
 */
function toGraphNodeView(row: GraphNodeRow): GraphNodeView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    nodeType: row.node_type,
    label: row.label,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getGraphNode.
 */
const getGraphNodeParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listGraphNodes.
 */
const listGraphNodesParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchGraphNodes.
 */
const searchGraphNodesParamsSchema = z.object({
  q: z.string().min(1),
  nodeType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  getGraphNodeParamsSchema,
  graphNodeRecordSchema,
  listGraphNodesParamsSchema,
  searchGraphNodesParamsSchema,
  toGraphNodeView,
};
export type { GraphNodeRecord, GraphNodeRow, GraphNodeView };
