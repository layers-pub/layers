/**
 * Corpus business logic layer.
 *
 * Extends {@link BaseRecordService} with corpus-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type CorpusRecord,
  type CorpusRow,
  type CorpusView,
  corpusRecordSchema,
  toCorpusView,
} from '../../types/corpus.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { CorporaRepository } from '../../storage/postgresql/corpora-repository.js';

/**
 * Service configuration for corpora.
 */
const corpusServiceConfig: RecordServiceConfig<CorpusRecord, CorpusRow, CorpusView> = {
  resourceName: 'Corpus',
  recordSchema: corpusRecordSchema,
  toView: toCorpusView,
};

/**
 * Contract for corpus service operations.
 */
interface ICorpusService {
  getByUri(uri: string): Promise<Result<CorpusView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: CorpusView[]; cursor?: string | undefined }, LayersError>>;

  searchCorpora(
    query: string,
    filters: { language?: string | undefined; domain?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: CorpusView[]; total: number; cursor?: string | undefined }, LayersError>
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link CorpusService}.
 */
interface CorpusServiceDeps {
  readonly repository: CorporaRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Corpus service extending the generic base with search.
 */
class CorpusService
  extends BaseRecordService<CorpusRecord, CorpusRow, CorpusView>
  implements ICorpusService
{
  declare protected readonly repository: CorporaRepository;

  constructor(deps: CorpusServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      corpusServiceConfig,
    );
  }

  async searchCorpora(
    query: string,
    filters: { language?: string | undefined; domain?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: CorpusView[]; total: number; cursor?: string | undefined }, LayersError>
  > {
    const result = await this.repository.searchCorpora(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toCorpusView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { CorpusService };
export type { ICorpusService };
