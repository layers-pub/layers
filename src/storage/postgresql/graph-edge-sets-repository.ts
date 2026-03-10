/**
 * Graph edge set repository extending {@link BaseRepository}.
 *
 * No search method is provided because graph edge sets are not
 * full-text searchable. Lookups are structural (by URI, by repo DID).
 *
 * @module
 */

import type { GraphEdgeSetRecord, GraphEdgeSetRow } from '../../types/graph-edge-set.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the graphEdgeSet record type.
 *
 * Neo4j: creates a minimal GraphEdgeSet node so the base repository's
 * mergeNode call succeeds. The REFERENCES edge from the set to its
 * expressionRef (if present) is created via extractEdges.
 */
const graphEdgeSetsRepoConfig: RecordTypeConfig<GraphEdgeSetRecord> = {
  collection: 'pub.layers.graph.graphEdgeSet',
  table: 'graph_edge_sets',
  esIndex: 'graph_edge_sets',
  neo4jLabel: 'GraphEdgeSet',
  resourceName: 'GraphEdgeSet',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      name: record.name ?? null,
      edge_type: record.edgeType,
      edge_count: Array.isArray(record.edges) ? record.edges.length : null,
      expression_ref: record.expressionRef ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      edgeType: record.edgeType,
      name: record.name ?? null,
    };
  },

  extractEdges(uri, record) {
    if (record.expressionRef) {
      return [{ from: uri, to: record.expressionRef, type: 'REFERENCES' }];
    }
    return [];
  },
};

/**
 * Contract for graph edge set data access operations.
 */
interface IGraphEdgeSetsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: GraphEdgeSetRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<GraphEdgeSetRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: GraphEdgeSetRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Graph edge set repository with no search (structural lookups only).
 */
class GraphEdgeSetsRepository
  extends BaseRepository<GraphEdgeSetRecord, GraphEdgeSetRow>
  implements IGraphEdgeSetsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, graphEdgeSetsRepoConfig);
  }
}

export { GraphEdgeSetsRepository, graphEdgeSetsRepoConfig };
export type { IGraphEdgeSetsRepository };
