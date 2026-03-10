/**
 * Resource entry business logic layer.
 *
 * Extends {@link BaseRecordService} with entry-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type ResourceEntryRecord,
  type ResourceEntryRow,
  type ResourceEntryView,
  resourceEntryRecordSchema,
  toResourceEntryView,
} from '../../types/resource-entry.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { ResourceEntriesRepository } from '../../storage/postgresql/resource-entries-repository.js';

/**
 * Service configuration for resource entries.
 */
const resourceEntryServiceConfig: RecordServiceConfig<
  ResourceEntryRecord,
  ResourceEntryRow,
  ResourceEntryView
> = {
  resourceName: 'ResourceEntry',
  recordSchema: resourceEntryRecordSchema,
  toView: toResourceEntryView,
};

/**
 * Contract for resource entry service operations.
 */
interface IResourceEntryService {
  getByUri(uri: string): Promise<Result<ResourceEntryView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: ResourceEntryView[]; cursor?: string | undefined }, LayersError>>;

  searchEntries(
    query: string,
    filters: { language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<
      { records: ResourceEntryView[]; total: number; cursor?: string | undefined },
      LayersError
    >
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link ResourceEntryService}.
 */
interface ResourceEntryServiceDeps {
  readonly repository: ResourceEntriesRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Resource entry service extending the generic base with search.
 */
class ResourceEntryService
  extends BaseRecordService<ResourceEntryRecord, ResourceEntryRow, ResourceEntryView>
  implements IResourceEntryService
{
  declare protected readonly repository: ResourceEntriesRepository;

  constructor(deps: ResourceEntryServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      resourceEntryServiceConfig,
    );
  }

  async searchEntries(
    query: string,
    filters: { language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<
      { records: ResourceEntryView[]; total: number; cursor?: string | undefined },
      LayersError
    >
  > {
    const result = await this.repository.searchEntries(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toResourceEntryView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { ResourceEntryService };
export type { IResourceEntryService };
