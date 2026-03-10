/**
 * Graph node repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on label fields
 * and a term filter for node_type.
 *
 * @module
 */

import type { GraphNodeRecord, GraphNodeRow } from '../../types/graph-node.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the graphNode record type.
 */
const graphNodeRepoConfig: RecordTypeConfig<GraphNodeRecord> = {
  collection: 'pub.layers.graph.graphNode',
  table: 'graph_nodes',
  esIndex: 'graph_nodes',
  neo4jLabel: 'Graph',
  resourceName: 'GraphNode',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      node_type: record.nodeType,
      label: record.label ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      nodeType: record.nodeType,
      label: record.label ?? null,
    };
  },

  extractEdges(_uri, _record) {
    // Graph nodes have no default edges; edges come from graphEdge records
    return [];
  },
};

/**
 * Contract for graph node data access operations.
 */
interface IGraphNodesRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: GraphNodeRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<GraphNodeRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: GraphNodeRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchGraphNodes(
    query: string,
    filters: { nodeType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: GraphNodeRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Graph node repository extending the generic base with search.
 */
class GraphNodesRepository
  extends BaseRepository<GraphNodeRecord, GraphNodeRow>
  implements IGraphNodesRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, graphNodeRepoConfig);
  }

  async searchGraphNodes(
    query: string,
    filters: { nodeType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: GraphNodeRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  > {
    // Build ES query
    const must: Record<string, unknown>[] = [
      {
        multi_match: {
          query,
          fields: ['label^3', 'label.keyword'],
        },
      },
    ];

    const filter: Record<string, unknown>[] = [];
    if (filters.nodeType) {
      filter.push({ term: { node_type: filters.nodeType } });
    }

    const esQuery: Record<string, unknown> = {
      bool: {
        must,
        ...(filter.length > 0 ? { filter } : {}),
      },
    };

    const sort: Record<string, unknown>[] = [
      { _score: { order: 'desc' } },
      { uri: { order: 'asc' } },
    ];

    // Decode search_after cursor if present
    let searchAfter: unknown[] | undefined;
    if (cursor) {
      try {
        searchAfter = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as unknown[];
      } catch {
        return Err(new DatabaseError('Invalid search cursor'));
      }
    }

    const searchRequest = {
      index: this.config.esIndex,
      query: esQuery,
      size: limit,
      sort,
      ...(searchAfter ? { search_after: searchAfter } : {}),
    };

    const result = await this.esAdapter.search(searchRequest);
    if (!result.ok) {
      return result as Result<never, DatabaseError>;
    }

    const rows = result.value.hits as unknown as GraphNodeRow[];
    const total = result.value.total;

    // Build next cursor from last hit's sort values
    const lastHit = result.value.hits[result.value.hits.length - 1];
    const nextCursor =
      lastHit && rows.length === limit && '_sort' in lastHit
        ? Buffer.from(JSON.stringify(lastHit._sort)).toString('base64url')
        : undefined;

    return Ok({ rows, total, cursor: nextCursor });
  }
}

export { GraphNodesRepository, graphNodeRepoConfig };
export type { IGraphNodesRepository };
