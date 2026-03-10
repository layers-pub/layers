/**
 * Alignment business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Alignments have no search endpoint; they are accessed via their associated
 * expression or by direct URI lookup. All common operations (get, list, index,
 * delete, caching) are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type AlignmentRecord,
  type AlignmentRow,
  type AlignmentView,
  alignmentRecordSchema,
  toAlignmentView,
} from '../../types/alignment.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { AlignmentsRepository } from '../../storage/postgresql/alignments-repository.js';

/**
 * Service configuration for alignments.
 */
const alignmentServiceConfig: RecordServiceConfig<AlignmentRecord, AlignmentRow, AlignmentView> = {
  resourceName: 'Alignment',
  recordSchema: alignmentRecordSchema,
  toView: toAlignmentView,
};

/**
 * Contract for alignment service operations.
 */
interface IAlignmentService {
  getByUri(uri: string): Promise<Result<AlignmentView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: AlignmentView[]; cursor?: string | undefined }, LayersError>>;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing an {@link AlignmentService}.
 */
interface AlignmentServiceDeps {
  readonly repository: AlignmentsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Alignment service extending the generic base.
 *
 * No search method is needed; alignments are discovered through their
 * associated expression or by direct URI lookup.
 */
class AlignmentService
  extends BaseRecordService<AlignmentRecord, AlignmentRow, AlignmentView>
  implements IAlignmentService
{
  declare protected readonly repository: AlignmentsRepository;

  constructor(deps: AlignmentServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      alignmentServiceConfig,
    );
  }
}

export { AlignmentService };
export type { IAlignmentService };
