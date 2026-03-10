/**
 * Corpus membership business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional search methods.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type CorpusMembershipRecord,
  type CorpusMembershipRow,
  type CorpusMembershipView,
  corpusMembershipRecordSchema,
  toCorpusMembershipView,
} from '../../types/corpus-membership.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { CorpusMembershipsRepository } from '../../storage/postgresql/corpus-memberships-repository.js';

/**
 * Service configuration for corpus memberships.
 */
const corpusMembershipServiceConfig: RecordServiceConfig<
  CorpusMembershipRecord,
  CorpusMembershipRow,
  CorpusMembershipView
> = {
  resourceName: 'CorpusMembership',
  recordSchema: corpusMembershipRecordSchema,
  toView: toCorpusMembershipView,
};

/**
 * Contract for corpus membership service operations.
 */
interface ICorpusMembershipService {
  getByUri(uri: string): Promise<Result<CorpusMembershipView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: CorpusMembershipView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link CorpusMembershipService}.
 */
interface CorpusMembershipServiceDeps {
  readonly repository: CorpusMembershipsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Corpus membership service (no search; structural lookups only).
 */
class CorpusMembershipService
  extends BaseRecordService<CorpusMembershipRecord, CorpusMembershipRow, CorpusMembershipView>
  implements ICorpusMembershipService
{
  constructor(deps: CorpusMembershipServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      corpusMembershipServiceConfig,
    );
  }
}

export { CorpusMembershipService };
export type { ICorpusMembershipService };
