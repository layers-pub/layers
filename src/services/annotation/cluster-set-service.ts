/**
 * Cluster set business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Cluster sets have no search endpoint; all common operations
 * (get, list, index, delete, caching) are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type ClusterSetRecord,
  type ClusterSetRow,
  type ClusterSetView,
  clusterSetRecordSchema,
  toClusterSetView,
} from '../../types/cluster-set.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { ClusterSetsRepository } from '../../storage/postgresql/cluster-sets-repository.js';

/**
 * Service configuration for cluster sets.
 */
const clusterSetServiceConfig: RecordServiceConfig<
  ClusterSetRecord,
  ClusterSetRow,
  ClusterSetView
> = {
  resourceName: 'ClusterSet',
  recordSchema: clusterSetRecordSchema,
  toView: toClusterSetView,
};

/**
 * Contract for cluster set service operations.
 */
interface IClusterSetService {
  getByUri(uri: string): Promise<Result<ClusterSetView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: ClusterSetView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link ClusterSetService}.
 */
interface ClusterSetServiceDeps {
  readonly repository: ClusterSetsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Cluster set service extending the generic base.
 *
 * No search method is needed; cluster sets are discovered through
 * their parent annotation layer.
 */
class ClusterSetService
  extends BaseRecordService<ClusterSetRecord, ClusterSetRow, ClusterSetView>
  implements IClusterSetService
{
  declare protected readonly repository: ClusterSetsRepository;

  constructor(deps: ClusterSetServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      clusterSetServiceConfig,
    );
  }
}

export { ClusterSetService };
export type { IClusterSetService };
