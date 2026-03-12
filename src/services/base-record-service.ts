/**
 * Generic record service handling validation, caching, and view transformation.
 *
 * Sits between XRPC handlers and the repository. Record types extend this
 * class and add type-specific search methods.
 *
 * @module
 */

import type { Redis } from 'ioredis';
import type { ZodType } from 'zod';

import { createLogger } from '../observability/logger.js';
import type { BaseRepository } from '../storage/base-repository.js';
import { RedisKeys, RedisTTL } from '../storage/redis/structures.js';
import { type LayersError, NotFoundError, ValidationError } from '../types/errors.js';
import type { ILogger } from '../types/interfaces/logger.interface.js';
import { Err, Ok, type Result } from '../types/result.js';

/**
 * Configuration for a record service's validation and view transformation.
 *
 * @typeParam TRecord - the validated record type
 * @typeParam TRow - the PostgreSQL row type
 * @typeParam TView - the API response type
 */
interface RecordServiceConfig<TRecord, TRow, TView> {
  /** Human-readable name for error messages */
  readonly resourceName: string;

  /** Zod schema for validating incoming records */
  readonly recordSchema: ZodType<TRecord>;

  /** Transforms a PG row to an API view */
  toView(row: TRow): TView;
}

/**
 * Dependencies for constructing a {@link BaseRecordService}.
 */
interface BaseRecordServiceDeps<
  TRecord,
  TRow extends { readonly indexed_at: Date; readonly uri: string },
> {
  readonly repository: BaseRepository<TRecord, TRow>;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Generic service implementing validation, caching, and view transformation.
 *
 * Subclasses add record-type-specific search methods.
 *
 * @typeParam TRecord - the validated record type
 * @typeParam TRow - the PostgreSQL row type
 * @typeParam TView - the API response type
 */
class BaseRecordService<
  TRecord,
  TRow extends { readonly indexed_at: Date; readonly uri: string },
  TView,
> {
  protected readonly repository: BaseRepository<TRecord, TRow>;
  protected readonly redis: Redis;
  protected readonly logger: ILogger;
  protected readonly serviceConfig: RecordServiceConfig<TRecord, TRow, TView>;

  constructor(
    deps: BaseRecordServiceDeps<TRecord, TRow>,
    config: RecordServiceConfig<TRecord, TRow, TView>,
  ) {
    this.repository = deps.repository;
    this.redis = deps.redis;
    this.logger =
      deps.logger ?? createLogger({ service: `${config.resourceName.toLowerCase()}-service` });
    this.serviceConfig = config;
  }

  async getByUri(uri: string): Promise<Result<TView, LayersError>> {
    // Check Redis cache
    const cacheKey = RedisKeys.RECORD_CACHE(uri);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${this.serviceConfig.resourceName}`, { uri });
        return Ok(JSON.parse(cached) as TView);
      }
    } catch (err) {
      this.logger.warn('Redis cache read failed, falling back to PG', {
        uri,
        error: (err as Error).message,
      });
    }

    // Fetch from repository
    const result = await this.repository.getByUri(uri);
    if (!result.ok) {
      return Err(result.error);
    }

    if (result.value === null) {
      return Err(new NotFoundError(this.serviceConfig.resourceName, uri));
    }

    const view = this.serviceConfig.toView(result.value);

    // Cache the result
    try {
      await this.redis.setex(cacheKey, RedisTTL.RECORD_CACHE, JSON.stringify(view));
    } catch (err) {
      this.logger.warn('Redis cache write failed', {
        uri,
        error: (err as Error).message,
      });
    }

    return Ok(view);
  }

  async listAll(
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: TView[]; cursor?: string | undefined }, LayersError>> {
    const result = await this.repository.listAll(limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map((row) => this.serviceConfig.toView(row));
    return Ok({ records, cursor: result.value.cursor });
  }

  async listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ records: TView[]; cursor?: string | undefined }, LayersError>> {
    const result = await this.repository.listByDid(repo, limit, cursor);
    if (!result.ok) {
      return Err(result.error);
    }

    const records = result.value.rows.map((row) => this.serviceConfig.toView(row));
    return Ok({ records, cursor: result.value.cursor });
  }

  async indexRecord(
    did: string,
    rkey: string,
    record: unknown,
  ): Promise<Result<void, LayersError>> {
    // Validate against schema
    const parsed = this.serviceConfig.recordSchema.safeParse(record);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return Err(
        new ValidationError(
          `Invalid ${this.serviceConfig.resourceName.toLowerCase()} record: ${firstIssue?.message ?? 'unknown error'}`,
          firstIssue?.path.join('.'),
          firstIssue?.code,
        ),
      );
    }

    const result = await this.repository.indexRecord(did, rkey, parsed.data);
    if (!result.ok) {
      return Err(result.error);
    }

    return Ok(undefined);
  }

  async deleteRecord(uri: string): Promise<Result<void, LayersError>> {
    const result = await this.repository.deleteRecord(uri);
    if (!result.ok) {
      return Err(result.error);
    }

    // Invalidate cache
    try {
      await this.redis.del(RedisKeys.RECORD_CACHE(uri));
    } catch (err) {
      this.logger.warn('Redis cache invalidation failed', {
        uri,
        error: (err as Error).message,
      });
    }

    return Ok(undefined);
  }
}

export { BaseRecordService };
export type { BaseRecordServiceDeps, RecordServiceConfig };
