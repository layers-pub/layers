/**
 * Graph edge business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional search methods.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type GraphEdgeRecord,
  type GraphEdgeRow,
  type GraphEdgeView,
  graphEdgeRecordSchema,
  toGraphEdgeView,
} from '../../types/graph-edge.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { GraphEdgesRepository } from '../../storage/postgresql/graph-edges-repository.js';

/**
 * Service configuration for graph edges.
 */
const graphEdgeServiceConfig: RecordServiceConfig<GraphEdgeRecord, GraphEdgeRow, GraphEdgeView> = {
  resourceName: 'GraphEdge',
  recordSchema: graphEdgeRecordSchema,
  toView: toGraphEdgeView,
};

/**
 * Contract for graph edge service operations.
 */
interface IGraphEdgeService {
  getByUri(uri: string): Promise<Result<GraphEdgeView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: GraphEdgeView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link GraphEdgeService}.
 */
interface GraphEdgeServiceDeps {
  readonly repository: GraphEdgesRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Graph edge service (no search; structural lookups only).
 */
class GraphEdgeService
  extends BaseRecordService<GraphEdgeRecord, GraphEdgeRow, GraphEdgeView>
  implements IGraphEdgeService
{
  constructor(deps: GraphEdgeServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      graphEdgeServiceConfig,
    );
  }
}

export { GraphEdgeService };
export type { IGraphEdgeService };
