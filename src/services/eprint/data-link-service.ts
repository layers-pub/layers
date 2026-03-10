/**
 * Data link business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Data links have no search endpoint; they are accessed via their parent
 * eprint or corpus. All common operations (get, list, index, delete, caching)
 * are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type DataLinkRecord,
  type DataLinkRow,
  type DataLinkView,
  dataLinkRecordSchema,
  toDataLinkView,
} from '../../types/data-link.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { DataLinksRepository } from '../../storage/postgresql/data-links-repository.js';

/**
 * Service configuration for data links.
 */
const dataLinkServiceConfig: RecordServiceConfig<DataLinkRecord, DataLinkRow, DataLinkView> = {
  resourceName: 'DataLink',
  recordSchema: dataLinkRecordSchema,
  toView: toDataLinkView,
};

/**
 * Contract for data link service operations.
 */
interface IDataLinkService {
  getByUri(uri: string): Promise<Result<DataLinkView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: DataLinkView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link DataLinkService}.
 */
interface DataLinkServiceDeps {
  readonly repository: DataLinksRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Data link service extending the generic base.
 *
 * No search method is needed; data links are discovered through their
 * parent eprint or corpus.
 */
class DataLinkService
  extends BaseRecordService<DataLinkRecord, DataLinkRow, DataLinkView>
  implements IDataLinkService
{
  declare protected readonly repository: DataLinksRepository;

  constructor(deps: DataLinkServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      dataLinkServiceConfig,
    );
  }
}

export { DataLinkService };
export type { IDataLinkService };
