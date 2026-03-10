/**
 * TypeDef business logic layer.
 *
 * Extends {@link BaseRecordService} with typeDef-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type TypeDefRecord,
  type TypeDefRow,
  type TypeDefView,
  typeDefRecordSchema,
  toTypeDefView,
} from '../../types/type-def.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { TypeDefsRepository } from '../../storage/postgresql/type-defs-repository.js';

/**
 * Service configuration for typeDefs.
 */
const typeDefServiceConfig: RecordServiceConfig<TypeDefRecord, TypeDefRow, TypeDefView> = {
  resourceName: 'TypeDef',
  recordSchema: typeDefRecordSchema,
  toView: toTypeDefView,
};

/**
 * Contract for typeDef service operations.
 */
interface ITypeDefService {
  getByUri(uri: string): Promise<Result<TypeDefView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: TypeDefView[]; cursor?: string | undefined }, LayersError>>;

  searchTypeDefs(
    query: string,
    filters: { typeKind?: string | undefined; ontologyRef?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: TypeDefView[]; total: number; cursor?: string | undefined }, LayersError>
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link TypeDefService}.
 */
interface TypeDefServiceDeps {
  readonly repository: TypeDefsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * TypeDef service extending the generic base with search.
 */
class TypeDefService
  extends BaseRecordService<TypeDefRecord, TypeDefRow, TypeDefView>
  implements ITypeDefService
{
  declare protected readonly repository: TypeDefsRepository;

  constructor(deps: TypeDefServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      typeDefServiceConfig,
    );
  }

  async searchTypeDefs(
    query: string,
    filters: { typeKind?: string | undefined; ontologyRef?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: TypeDefView[]; total: number; cursor?: string | undefined }, LayersError>
  > {
    const result = await this.repository.searchTypeDefs(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toTypeDefView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { TypeDefService };
export type { ITypeDefService };
