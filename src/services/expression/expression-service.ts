/**
 * Expression business logic layer.
 *
 * Extends {@link BaseRecordService} with expression-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type ExpressionRecord,
  type ExpressionRow,
  type ExpressionView,
  expressionRecordSchema,
  toExpressionView,
} from '../../types/expression.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { ExpressionsRepository } from '../../storage/postgresql/expressions-repository.js';

/**
 * Service configuration for expressions.
 */
const expressionServiceConfig: RecordServiceConfig<
  ExpressionRecord,
  ExpressionRow,
  ExpressionView
> = {
  resourceName: 'Expression',
  recordSchema: expressionRecordSchema,
  toView: toExpressionView,
};

/**
 * Contract for expression service operations.
 */
interface IExpressionService {
  getByUri(uri: string): Promise<Result<ExpressionView, LayersError>>;

  listAll(
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: ExpressionView[]; cursor?: string | undefined }, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: ExpressionView[]; cursor?: string | undefined }, LayersError>>;

  searchExpressions(
    query: string,
    filters: { language?: string | undefined; kind?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: ExpressionView[]; total: number; cursor?: string | undefined }, LayersError>
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing an {@link ExpressionService}.
 */
interface ExpressionServiceDeps {
  readonly repository: ExpressionsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Expression service extending the generic base with search.
 */
class ExpressionService
  extends BaseRecordService<ExpressionRecord, ExpressionRow, ExpressionView>
  implements IExpressionService
{
  declare protected readonly repository: ExpressionsRepository;

  constructor(deps: ExpressionServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      expressionServiceConfig,
    );
  }

  async searchExpressions(
    query: string,
    filters: { language?: string | undefined; kind?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: ExpressionView[]; total: number; cursor?: string | undefined }, LayersError>
  > {
    const result = await this.repository.searchExpressions(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toExpressionView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { ExpressionService };
export type { IExpressionService };
