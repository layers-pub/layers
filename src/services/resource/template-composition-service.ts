/**
 * Template composition business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Template compositions have no search endpoint. All common operations (get,
 * list, index, delete, caching) are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type TemplateCompositionRecord,
  type TemplateCompositionRow,
  type TemplateCompositionView,
  templateCompositionRecordSchema,
  toTemplateCompositionView,
} from '../../types/template-composition.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { TemplateCompositionsRepository } from '../../storage/postgresql/template-compositions-repository.js';

/**
 * Service configuration for template compositions.
 */
const templateCompositionServiceConfig: RecordServiceConfig<
  TemplateCompositionRecord,
  TemplateCompositionRow,
  TemplateCompositionView
> = {
  resourceName: 'TemplateComposition',
  recordSchema: templateCompositionRecordSchema,
  toView: toTemplateCompositionView,
};

/**
 * Contract for template composition service operations.
 */
interface ITemplateCompositionService {
  getByUri(uri: string): Promise<Result<TemplateCompositionView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: TemplateCompositionView[]; cursor?: string | undefined }, LayersError>
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link TemplateCompositionService}.
 */
interface TemplateCompositionServiceDeps {
  readonly repository: TemplateCompositionsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Template composition service extending the generic base.
 *
 * No search method is needed; template compositions are accessed directly by URI
 * or listed by repository DID.
 */
class TemplateCompositionService
  extends BaseRecordService<
    TemplateCompositionRecord,
    TemplateCompositionRow,
    TemplateCompositionView
  >
  implements ITemplateCompositionService
{
  declare protected readonly repository: TemplateCompositionsRepository;

  constructor(deps: TemplateCompositionServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      templateCompositionServiceConfig,
    );
  }
}

export { TemplateCompositionService };
export type { ITemplateCompositionService };
