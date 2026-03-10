/**
 * Changelog entry business logic layer.
 *
 * Extends {@link BaseRecordService} with changelog-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type ChangelogEntryRecord,
  type ChangelogEntryRow,
  type ChangelogEntryView,
  changelogEntryRecordSchema,
  toChangelogEntryView,
} from '../../types/changelog-entry.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { ChangelogsRepository } from '../../storage/postgresql/changelogs-repository.js';

/**
 * Service configuration for changelog entries.
 */
const changelogServiceConfig: RecordServiceConfig<
  ChangelogEntryRecord,
  ChangelogEntryRow,
  ChangelogEntryView
> = {
  resourceName: 'ChangelogEntry',
  recordSchema: changelogEntryRecordSchema,
  toView: toChangelogEntryView,
};

/**
 * Contract for changelog entry service operations.
 */
interface IChangelogService {
  getByUri(uri: string): Promise<Result<ChangelogEntryView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: ChangelogEntryView[]; cursor?: string | undefined }, LayersError>>;

  searchEntries(
    query: string,
    filters: { subjectCollection?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<
      { records: ChangelogEntryView[]; total: number; cursor?: string | undefined },
      LayersError
    >
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link ChangelogService}.
 */
interface ChangelogServiceDeps {
  readonly repository: ChangelogsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Changelog entry service extending the generic base with search.
 */
class ChangelogService
  extends BaseRecordService<ChangelogEntryRecord, ChangelogEntryRow, ChangelogEntryView>
  implements IChangelogService
{
  declare protected readonly repository: ChangelogsRepository;

  constructor(deps: ChangelogServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      changelogServiceConfig,
    );
  }

  async searchEntries(
    query: string,
    filters: { subjectCollection?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<
      { records: ChangelogEntryView[]; total: number; cursor?: string | undefined },
      LayersError
    >
  > {
    const result = await this.repository.searchEntries(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toChangelogEntryView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { ChangelogService };
export type { IChangelogService };
