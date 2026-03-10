/**
 * Eprint business logic layer.
 *
 * Extends {@link BaseRecordService} with eprint-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type EprintRecord,
  type EprintRow,
  type EprintView,
  eprintRecordSchema,
  toEprintView,
} from '../../types/eprint.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { EprintsRepository } from '../../storage/postgresql/eprints-repository.js';

/**
 * Service configuration for eprints.
 */
const eprintServiceConfig: RecordServiceConfig<EprintRecord, EprintRow, EprintView> = {
  resourceName: 'Eprint',
  recordSchema: eprintRecordSchema,
  toView: toEprintView,
};

/**
 * Contract for eprint service operations.
 */
interface IEprintService {
  getByUri(uri: string): Promise<Result<EprintView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: EprintView[]; cursor?: string | undefined }, LayersError>>;

  searchEprints(
    query: string,
    filters: { identifierType?: string | undefined; linkType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: EprintView[]; total: number; cursor?: string | undefined }, LayersError>
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing an {@link EprintService}.
 */
interface EprintServiceDeps {
  readonly repository: EprintsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Eprint service extending the generic base with search.
 */
class EprintService
  extends BaseRecordService<EprintRecord, EprintRow, EprintView>
  implements IEprintService
{
  declare protected readonly repository: EprintsRepository;

  constructor(deps: EprintServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      eprintServiceConfig,
    );
  }

  async searchEprints(
    query: string,
    filters: { identifierType?: string | undefined; linkType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: EprintView[]; total: number; cursor?: string | undefined }, LayersError>
  > {
    const result = await this.repository.searchEprints(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toEprintView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { EprintService };
export type { IEprintService };
