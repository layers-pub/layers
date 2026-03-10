/**
 * Persona business logic layer.
 *
 * Extends {@link BaseRecordService} with persona-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type PersonaRecord,
  type PersonaRow,
  type PersonaView,
  personaRecordSchema,
  toPersonaView,
} from '../../types/persona.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { PersonasRepository } from '../../storage/postgresql/personas-repository.js';

/**
 * Service configuration for personas.
 */
const personaServiceConfig: RecordServiceConfig<PersonaRecord, PersonaRow, PersonaView> = {
  resourceName: 'Persona',
  recordSchema: personaRecordSchema,
  toView: toPersonaView,
};

/**
 * Contract for persona service operations.
 */
interface IPersonaService {
  getByUri(uri: string): Promise<Result<PersonaView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: PersonaView[]; cursor?: string | undefined }, LayersError>>;

  searchPersonas(
    query: string,
    filters: { domain?: string | undefined; kind?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: PersonaView[]; total: number; cursor?: string | undefined }, LayersError>
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link PersonaService}.
 */
interface PersonaServiceDeps {
  readonly repository: PersonasRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Persona service extending the generic base with search.
 */
class PersonaService
  extends BaseRecordService<PersonaRecord, PersonaRow, PersonaView>
  implements IPersonaService
{
  declare protected readonly repository: PersonasRepository;

  constructor(deps: PersonaServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      personaServiceConfig,
    );
  }

  async searchPersonas(
    query: string,
    filters: { domain?: string | undefined; kind?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: PersonaView[]; total: number; cursor?: string | undefined }, LayersError>
  > {
    const result = await this.repository.searchPersonas(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toPersonaView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { PersonaService };
export type { IPersonaService };
