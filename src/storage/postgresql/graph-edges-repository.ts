/**
 * Graph edge repository extending {@link BaseRepository}.
 *
 * No search method is provided because graph edges are not
 * full-text searchable. Lookups are structural (by URI, by repo DID).
 *
 * @module
 */

import type { GraphEdgeRecord, GraphEdgeRow } from '../../types/graph-edge.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the graphEdge record type.
 *
 * Source and target are objectRef objects stored as stringified JSON.
 * Neo4j edges are built during enrichment rather than at index time,
 * since the objectRefs may reference complex structures.
 */
const graphEdgeRepoConfig: RecordTypeConfig<GraphEdgeRecord> = {
  collection: 'pub.layers.graph.graphEdge',
  table: 'graph_edges',
  esIndex: 'graph_edges',
  neo4jLabel: 'GraphEdge',
  resourceName: 'GraphEdge',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      source_ref:
        typeof record.source === 'object' ? JSON.stringify(record.source) : String(record.source),
      target_ref:
        typeof record.target === 'object' ? JSON.stringify(record.target) : String(record.target),
      edge_type: record.edgeType,
      edge_set_ref: record.edgeSetRef ?? null,
      confidence: record.confidence ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      edgeType: record.edgeType,
    };
  },

  extractEdges() {
    // Graph edges are stored as PG records; Neo4j edges built during enrichment
    return [];
  },
};

/**
 * Contract for graph edge data access operations.
 */
interface IGraphEdgesRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: GraphEdgeRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<GraphEdgeRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: GraphEdgeRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Graph edge repository with no search (structural lookups only).
 */
class GraphEdgesRepository
  extends BaseRepository<GraphEdgeRecord, GraphEdgeRow>
  implements IGraphEdgesRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, graphEdgeRepoConfig);
  }
}

export { GraphEdgesRepository, graphEdgeRepoConfig };
export type { IGraphEdgesRepository };
