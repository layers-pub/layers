/**
 * Segmentation business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Segmentations have no search endpoint; they are accessed via their parent
 * expression. All common operations (get, list, index, delete, caching)
 * are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type SegmentationRecord,
  type SegmentationRow,
  type SegmentationView,
  segmentationRecordSchema,
  toSegmentationView,
} from '../../types/segmentation.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { SegmentationsRepository } from '../../storage/postgresql/segmentations-repository.js';

/**
 * Service configuration for segmentations.
 */
const segmentationServiceConfig: RecordServiceConfig<
  SegmentationRecord,
  SegmentationRow,
  SegmentationView
> = {
  resourceName: 'Segmentation',
  recordSchema: segmentationRecordSchema,
  toView: toSegmentationView,
};

/**
 * Contract for segmentation service operations.
 */
interface ISegmentationService {
  getByUri(uri: string): Promise<Result<SegmentationView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: SegmentationView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link SegmentationService}.
 */
interface SegmentationServiceDeps {
  readonly repository: SegmentationsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Segmentation service extending the generic base.
 *
 * No search method is needed; segmentations are discovered through their
 * parent expression.
 */
class SegmentationService
  extends BaseRecordService<SegmentationRecord, SegmentationRow, SegmentationView>
  implements ISegmentationService
{
  declare protected readonly repository: SegmentationsRepository;

  constructor(deps: SegmentationServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      segmentationServiceConfig,
    );
  }
}

export { SegmentationService };
export type { ISegmentationService };
