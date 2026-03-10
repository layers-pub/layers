/**
 * Graph edge set business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional search methods.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type GraphEdgeSetRecord,
  type GraphEdgeSetRow,
  type GraphEdgeSetView,
  graphEdgeSetRecordSchema,
  toGraphEdgeSetView,
} from '../../types/graph-edge-set.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { GraphEdgeSetsRepository } from '../../storage/postgresql/graph-edge-sets-repository.js';

/**
 * Service configuration for graph edge sets.
 */
const graphEdgeSetServiceConfig: RecordServiceConfig<
  GraphEdgeSetRecord,
  GraphEdgeSetRow,
  GraphEdgeSetView
> = {
  resourceName: 'GraphEdgeSet',
  recordSchema: graphEdgeSetRecordSchema,
  toView: toGraphEdgeSetView,
};

/**
 * Contract for graph edge set service operations.
 */
interface IGraphEdgeSetService {
  getByUri(uri: string): Promise<Result<GraphEdgeSetView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: GraphEdgeSetView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link GraphEdgeSetService}.
 */
interface GraphEdgeSetServiceDeps {
  readonly repository: GraphEdgeSetsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Graph edge set service (no search; structural lookups only).
 */
class GraphEdgeSetService
  extends BaseRecordService<GraphEdgeSetRecord, GraphEdgeSetRow, GraphEdgeSetView>
  implements IGraphEdgeSetService
{
  constructor(deps: GraphEdgeSetServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      graphEdgeSetServiceConfig,
    );
  }
}

export { GraphEdgeSetService };
export type { IGraphEdgeSetService };
