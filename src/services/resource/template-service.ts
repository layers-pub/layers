/**
 * Template business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Templates have no search endpoint. All common operations (get, list, index,
 * delete, caching) are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type TemplateRecord,
  type TemplateRow,
  type TemplateView,
  templateRecordSchema,
  toTemplateView,
} from '../../types/template.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { TemplatesRepository } from '../../storage/postgresql/templates-repository.js';

/**
 * Service configuration for templates.
 */
const templateServiceConfig: RecordServiceConfig<TemplateRecord, TemplateRow, TemplateView> = {
  resourceName: 'Template',
  recordSchema: templateRecordSchema,
  toView: toTemplateView,
};

/**
 * Contract for template service operations.
 */
interface ITemplateService {
  getByUri(uri: string): Promise<Result<TemplateView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: TemplateView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link TemplateService}.
 */
interface TemplateServiceDeps {
  readonly repository: TemplatesRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Template service extending the generic base.
 *
 * No search method is needed; templates are accessed directly by URI or listed
 * by repository DID.
 */
class TemplateService
  extends BaseRecordService<TemplateRecord, TemplateRow, TemplateView>
  implements ITemplateService
{
  declare protected readonly repository: TemplatesRepository;

  constructor(deps: TemplateServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      templateServiceConfig,
    );
  }
}

export { TemplateService };
export type { ITemplateService };
