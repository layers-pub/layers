/**
 * Filling business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Fillings have no search endpoint. All common operations (get, list, index,
 * delete, caching) are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type FillingRecord,
  type FillingRow,
  type FillingView,
  fillingRecordSchema,
  toFillingView,
} from '../../types/filling.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { FillingsRepository } from '../../storage/postgresql/fillings-repository.js';

/**
 * Service configuration for fillings.
 */
const fillingServiceConfig: RecordServiceConfig<FillingRecord, FillingRow, FillingView> = {
  resourceName: 'Filling',
  recordSchema: fillingRecordSchema,
  toView: toFillingView,
};

/**
 * Contract for filling service operations.
 */
interface IFillingService {
  getByUri(uri: string): Promise<Result<FillingView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: FillingView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link FillingService}.
 */
interface FillingServiceDeps {
  readonly repository: FillingsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Filling service extending the generic base.
 *
 * No search method is needed; fillings are accessed directly by URI or listed
 * by repository DID.
 */
class FillingService
  extends BaseRecordService<FillingRecord, FillingRow, FillingView>
  implements IFillingService
{
  declare protected readonly repository: FillingsRepository;

  constructor(deps: FillingServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      fillingServiceConfig,
    );
  }
}

export { FillingService };
export type { IFillingService };
