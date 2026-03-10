/**
 * Media business logic layer.
 *
 * Extends {@link BaseRecordService} with media-specific search.
 * All common operations (get, list, index, delete, caching) are inherited.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type MediaRecord,
  type MediaRow,
  type MediaView,
  mediaRecordSchema,
  toMediaView,
} from '../../types/media.js';
import type { LayersError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { MediaRepository } from '../../storage/postgresql/media-repository.js';

/**
 * Service configuration for media records.
 */
const mediaServiceConfig: RecordServiceConfig<MediaRecord, MediaRow, MediaView> = {
  resourceName: 'Media',
  recordSchema: mediaRecordSchema,
  toView: toMediaView,
};

/**
 * Contract for media service operations.
 */
interface IMediaService {
  getByUri(uri: string): Promise<Result<MediaView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: MediaView[]; cursor?: string | undefined }, LayersError>>;

  searchMedia(
    query: string,
    filters: { kind?: string | undefined; language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: MediaView[]; total: number; cursor?: string | undefined }, LayersError>
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link MediaService}.
 */
interface MediaServiceDeps {
  readonly repository: MediaRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Media service extending the generic base with search.
 */
class MediaService
  extends BaseRecordService<MediaRecord, MediaRow, MediaView>
  implements IMediaService
{
  declare protected readonly repository: MediaRepository;

  constructor(deps: MediaServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      mediaServiceConfig,
    );
  }

  async searchMedia(
    query: string,
    filters: { kind?: string | undefined; language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: MediaView[]; total: number; cursor?: string | undefined }, LayersError>
  > {
    const result = await this.repository.searchMedia(query, filters, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map(toMediaView);
    return Ok({ records, total: result.value.total, cursor: result.value.cursor });
  }
}

export { MediaService };
export type { IMediaService };
