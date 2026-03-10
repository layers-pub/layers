/**
 * Resource collection business logic layer.
 *
 * Extends {@link BaseRecordService} with collection-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type ResourceCollectionRecord,
  type ResourceCollectionRow,
  type ResourceCollectionView,
  resourceCollectionRecordSchema,
  toResourceCollectionView,
} from '../../types/resource-collection.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { ResourceCollectionsRepository } from '../../storage/postgresql/resource-collections-repository.js';

/**
 * Service configuration for resource collections.
 */
const resourceCollectionServiceConfig: RecordServiceConfig<
  ResourceCollectionRecord,
  ResourceCollectionRow,
  ResourceCollectionView
> = {
  resourceName: 'ResourceCollection',
  recordSchema: resourceCollectionRecordSchema,
  toView: toResourceCollectionView,
};

/**
 * Contract for resource collection service operations.
 */
interface IResourceCollectionService {
  getByUri(uri: string): Promise<Result<ResourceCollectionView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: ResourceCollectionView[]; cursor?: string | undefined }, LayersError>
  >;

  searchCollections(
    query: string,
    filters: { kind?: string | undefined; language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<
      { records: ResourceCollectionView[]; total: number; cursor?: string | undefined },
      LayersError
    >
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link ResourceCollectionService}.
 */
interface ResourceCollectionServiceDeps {
  readonly repository: ResourceCollectionsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Resource collection service extending the generic base with search.
 */
class ResourceCollectionService
  extends BaseRecordService<ResourceCollectionRecord, ResourceCollectionRow, ResourceCollectionView>
  implements IResourceCollectionService
{
  declare protected readonly repository: ResourceCollectionsRepository;

  constructor(deps: ResourceCollectionServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      resourceCollectionServiceConfig,
    );
  }

  async searchCollections(
    query: string,
    filters: { kind?: string | undefined; language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<
      { records: ResourceCollectionView[]; total: number; cursor?: string | undefined },
      LayersError
    >
  > {
    const result = await this.repository.searchCollections(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toResourceCollectionView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { ResourceCollectionService };
export type { IResourceCollectionService };
