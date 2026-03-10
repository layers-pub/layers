/**
 * Experiment definition business logic layer.
 *
 * Extends {@link BaseRecordService} with experiment-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type ExperimentDefRecord,
  type ExperimentDefRow,
  type ExperimentDefView,
  experimentDefRecordSchema,
  toExperimentDefView,
} from '../../types/experiment-def.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { ExperimentDefsRepository } from '../../storage/postgresql/experiment-defs-repository.js';

/**
 * Service configuration for experiment definitions.
 */
const experimentDefServiceConfig: RecordServiceConfig<
  ExperimentDefRecord,
  ExperimentDefRow,
  ExperimentDefView
> = {
  resourceName: 'ExperimentDef',
  recordSchema: experimentDefRecordSchema,
  toView: toExperimentDefView,
};

/**
 * Contract for experiment definition service operations.
 */
interface IExperimentDefService {
  getByUri(uri: string): Promise<Result<ExperimentDefView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: ExperimentDefView[]; cursor?: string | undefined }, LayersError>>;

  searchExperimentDefs(
    query: string,
    filters: { measureType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<
      { records: ExperimentDefView[]; total: number; cursor?: string | undefined },
      LayersError
    >
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing an {@link ExperimentDefService}.
 */
interface ExperimentDefServiceDeps {
  readonly repository: ExperimentDefsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Experiment definition service extending the generic base with search.
 */
class ExperimentDefService
  extends BaseRecordService<ExperimentDefRecord, ExperimentDefRow, ExperimentDefView>
  implements IExperimentDefService
{
  declare protected readonly repository: ExperimentDefsRepository;

  constructor(deps: ExperimentDefServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      experimentDefServiceConfig,
    );
  }

  async searchExperimentDefs(
    query: string,
    filters: { measureType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<
      { records: ExperimentDefView[]; total: number; cursor?: string | undefined },
      LayersError
    >
  > {
    const result = await this.repository.searchExperimentDefs(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toExperimentDefView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { ExperimentDefService };
export type { IExperimentDefService };
