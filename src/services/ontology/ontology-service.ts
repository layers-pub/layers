/**
 * Ontology business logic layer.
 *
 * Extends {@link BaseRecordService} with ontology-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type OntologyRecord,
  type OntologyRow,
  type OntologyView,
  ontologyRecordSchema,
  toOntologyView,
} from '../../types/ontology.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { OntologiesRepository } from '../../storage/postgresql/ontologies-repository.js';

/**
 * Service configuration for ontologies.
 */
const ontologyServiceConfig: RecordServiceConfig<OntologyRecord, OntologyRow, OntologyView> = {
  resourceName: 'Ontology',
  recordSchema: ontologyRecordSchema,
  toView: toOntologyView,
};

/**
 * Contract for ontology service operations.
 */
interface IOntologyService {
  getByUri(uri: string): Promise<Result<OntologyView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: OntologyView[]; cursor?: string | undefined }, LayersError>>;

  searchOntologies(
    query: string,
    filters: { domain?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: OntologyView[]; total: number; cursor?: string | undefined }, LayersError>
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing an {@link OntologyService}.
 */
interface OntologyServiceDeps {
  readonly repository: OntologiesRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Ontology service extending the generic base with search.
 */
class OntologyService
  extends BaseRecordService<OntologyRecord, OntologyRow, OntologyView>
  implements IOntologyService
{
  declare protected readonly repository: OntologiesRepository;

  constructor(deps: OntologyServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      ontologyServiceConfig,
    );
  }

  async searchOntologies(
    query: string,
    filters: { domain?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: OntologyView[]; total: number; cursor?: string | undefined }, LayersError>
  > {
    const result = await this.repository.searchOntologies(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toOntologyView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { OntologyService };
export type { IOntologyService };
