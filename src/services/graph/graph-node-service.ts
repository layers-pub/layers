/**
 * Graph node business logic layer.
 *
 * Extends {@link BaseRecordService} with graph-node-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type GraphNodeRecord,
  type GraphNodeRow,
  type GraphNodeView,
  graphNodeRecordSchema,
  toGraphNodeView,
} from '../../types/graph-node.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { GraphNodesRepository } from '../../storage/postgresql/graph-nodes-repository.js';

/**
 * Service configuration for graph nodes.
 */
const graphNodeServiceConfig: RecordServiceConfig<GraphNodeRecord, GraphNodeRow, GraphNodeView> = {
  resourceName: 'GraphNode',
  recordSchema: graphNodeRecordSchema,
  toView: toGraphNodeView,
};

/**
 * Contract for graph node service operations.
 */
interface IGraphNodeService {
  getByUri(uri: string): Promise<Result<GraphNodeView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: GraphNodeView[]; cursor?: string | undefined }, LayersError>>;

  searchGraphNodes(
    query: string,
    filters: { nodeType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: GraphNodeView[]; total: number; cursor?: string | undefined }, LayersError>
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link GraphNodeService}.
 */
interface GraphNodeServiceDeps {
  readonly repository: GraphNodesRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Graph node service extending the generic base with search.
 */
class GraphNodeService
  extends BaseRecordService<GraphNodeRecord, GraphNodeRow, GraphNodeView>
  implements IGraphNodeService
{
  declare protected readonly repository: GraphNodesRepository;

  constructor(deps: GraphNodeServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      graphNodeServiceConfig,
    );
  }

  async searchGraphNodes(
    query: string,
    filters: { nodeType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: GraphNodeView[]; total: number; cursor?: string | undefined }, LayersError>
  > {
    const result = await this.repository.searchGraphNodes(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toGraphNodeView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { GraphNodeService };
export type { IGraphNodeService };
