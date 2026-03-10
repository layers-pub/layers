/**
 * Judgment set business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Judgment sets have no search endpoint; they are accessed via their parent
 * experiment definition. All common operations (get, list, index, delete,
 * caching) are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type JudgmentSetRecord,
  type JudgmentSetRow,
  type JudgmentSetView,
  judgmentSetRecordSchema,
  toJudgmentSetView,
} from '../../types/judgment-set.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { JudgmentSetsRepository } from '../../storage/postgresql/judgment-sets-repository.js';

/**
 * Service configuration for judgment sets.
 */
const judgmentSetServiceConfig: RecordServiceConfig<
  JudgmentSetRecord,
  JudgmentSetRow,
  JudgmentSetView
> = {
  resourceName: 'JudgmentSet',
  recordSchema: judgmentSetRecordSchema,
  toView: toJudgmentSetView,
};

/**
 * Contract for judgment set service operations.
 */
interface IJudgmentSetService {
  getByUri(uri: string): Promise<Result<JudgmentSetView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: JudgmentSetView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link JudgmentSetService}.
 */
interface JudgmentSetServiceDeps {
  readonly repository: JudgmentSetsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Judgment set service extending the generic base.
 *
 * No search method is needed; judgment sets are discovered through their
 * parent experiment definition.
 */
class JudgmentSetService
  extends BaseRecordService<JudgmentSetRecord, JudgmentSetRow, JudgmentSetView>
  implements IJudgmentSetService
{
  declare protected readonly repository: JudgmentSetsRepository;

  constructor(deps: JudgmentSetServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      judgmentSetServiceConfig,
    );
  }
}

export { JudgmentSetService };
export type { IJudgmentSetService };
