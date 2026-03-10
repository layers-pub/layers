/**
 * Annotation layer business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Annotation layers have no search endpoint at the service level;
 * all common operations (get, list, index, delete, caching)
 * are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type AnnotationLayerRecord,
  type AnnotationLayerRow,
  type AnnotationLayerView,
  annotationLayerRecordSchema,
  toAnnotationLayerView,
} from '../../types/annotation-layer.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { AnnotationLayersRepository } from '../../storage/postgresql/annotation-layers-repository.js';

/**
 * Service configuration for annotation layers.
 */
const annotationLayerServiceConfig: RecordServiceConfig<
  AnnotationLayerRecord,
  AnnotationLayerRow,
  AnnotationLayerView
> = {
  resourceName: 'AnnotationLayer',
  recordSchema: annotationLayerRecordSchema,
  toView: toAnnotationLayerView,
};

/**
 * Contract for annotation layer service operations.
 */
interface IAnnotationLayerService {
  getByUri(uri: string): Promise<Result<AnnotationLayerView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: AnnotationLayerView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing an {@link AnnotationLayerService}.
 */
interface AnnotationLayerServiceDeps {
  readonly repository: AnnotationLayersRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Annotation layer service extending the generic base.
 *
 * No search method is needed; annotation layers are discovered through
 * their parent expression or via faceted search at a higher level.
 */
class AnnotationLayerService
  extends BaseRecordService<AnnotationLayerRecord, AnnotationLayerRow, AnnotationLayerView>
  implements IAnnotationLayerService
{
  declare protected readonly repository: AnnotationLayersRepository;

  constructor(deps: AnnotationLayerServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      annotationLayerServiceConfig,
    );
  }
}

export { AnnotationLayerService };
export type { IAnnotationLayerService };
