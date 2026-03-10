/**
 * Firehose handler and query service for margin.at annotation records.
 *
 * Stores margin.at records in the `margin_annotations` PostgreSQL table
 * and provides query methods to retrieve annotations correlated with
 * Layers expressions by shared source URL.
 *
 * @module
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';

import { Err, Ok, type Result } from '../../types/result.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';
import { createLogger } from '../../observability/logger.js';
import { InteropError } from './interop-error.js';
import {
  MarginAdapter,
  type ExternalAnnotationView,
  type IMarginAdapter,
  type MarginAnnotationRecord,
} from './margin-adapter.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Collection NSIDs from the margin.at namespace that we index.
 */
const MARGIN_NSIDS: ReadonlySet<string> = new Set(['at.margin.annotation']);

/**
 * Redis cache TTL for margin annotation queries (2 minutes).
 */
const MARGIN_CACHE_TTL_SECONDS = 120;

/**
 * Redis key prefix for cached margin annotation queries.
 */
function marginCacheKey(url: string): string {
  return `margin:url:${url}`;
}

// ---------------------------------------------------------------------------
// IMarginIndexer interface
// ---------------------------------------------------------------------------

/**
 * Contract for the margin.at firehose indexer and query service.
 */
interface IMarginIndexer {
  /**
   * Handles a margin.at record from the firehose (create or update).
   *
   * Validates the record, converts it to the internal representation, and
   * stores it in PostgreSQL. Invalidates the Redis cache for the target URL.
   *
   * @param did - DID of the record owner
   * @param rkey - record key
   * @param record - the raw margin.at record from the firehose
   * @returns void on success, or an error
   */
  handleMarginRecord(
    did: string,
    rkey: string,
    record: MarginAnnotationRecord,
  ): Promise<Result<void, InteropError>>;

  /**
   * Handles deletion of a margin.at record from the firehose.
   *
   * @param did - DID of the record owner
   * @param rkey - record key
   * @returns void on success, or an error
   */
  handleMarginDelete(did: string, rkey: string): Promise<Result<void, InteropError>>;

  /**
   * Queries margin.at annotations that target a given URL.
   *
   * Results are cached in Redis for fast repeated lookups from the workspace.
   *
   * @param url - the source URL to match against margin annotation targets
   * @param limit - maximum number of results (default 50)
   * @returns an array of external annotation views, or an error
   */
  getAnnotationsForUrl(
    url: string,
    limit?: number,
  ): Promise<Result<ExternalAnnotationView[], InteropError>>;

  /**
   * Returns true if the given collection NSID is a margin.at namespace we index.
   *
   * @param collection - the NSID to check
   */
  isMarginCollection(collection: string): boolean;
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

/**
 * Dependencies for constructing a {@link MarginIndexer}.
 */
interface MarginIndexerDeps {
  readonly pool: Pool;
  readonly redis: Redis;
  readonly logger?: ILogger;
  readonly adapter?: IMarginAdapter;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Indexes margin.at annotation records from the firehose and serves URL-based queries.
 *
 * Stores records in the `margin_annotations` PostgreSQL table with indexes on
 * `target_url` for fast correlation queries. Uses Redis for caching query results.
 *
 * @example
 * ```typescript
 * const indexer = new MarginIndexer({ pool, redis });
 * await indexer.handleMarginRecord(did, rkey, record);
 * const result = await indexer.getAnnotationsForUrl('https://example.com/article');
 * ```
 */
class MarginIndexer implements IMarginIndexer {
  private readonly pool: Pool;
  private readonly redis: Redis;
  private readonly logger: ILogger;
  private readonly adapter: IMarginAdapter;

  constructor(deps: MarginIndexerDeps) {
    this.pool = deps.pool;
    this.redis = deps.redis;
    this.logger = deps.logger ?? createLogger({ service: 'margin-indexer' });
    this.adapter = deps.adapter ?? new MarginAdapter();
  }

  isMarginCollection(collection: string): boolean {
    return MARGIN_NSIDS.has(collection);
  }

  async handleMarginRecord(
    did: string,
    rkey: string,
    record: MarginAnnotationRecord,
  ): Promise<Result<void, InteropError>> {
    const viewResult = this.adapter.toAnnotationView(record, did, rkey);
    if (!viewResult.ok) {
      return viewResult;
    }

    const view = viewResult.value;

    try {
      await this.pool.query(
        `INSERT INTO margin_annotations (
          uri, did, rkey, target_url, motivation, body_text, body_format,
          creator_did, selector, record, created_at, indexed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (uri) DO UPDATE SET
          target_url = EXCLUDED.target_url,
          motivation = EXCLUDED.motivation,
          body_text = EXCLUDED.body_text,
          body_format = EXCLUDED.body_format,
          selector = EXCLUDED.selector,
          record = EXCLUDED.record,
          indexed_at = NOW()`,
        [
          view.uri,
          did,
          rkey,
          view.targetUrl,
          view.motivation,
          view.text,
          view.format ?? null,
          view.creatorDid,
          record.target.selector ? JSON.stringify(record.target.selector) : null,
          JSON.stringify(record),
          view.createdAt,
        ],
      );

      // Invalidate cache for the target URL
      await this.redis.del(marginCacheKey(view.targetUrl)).catch(() => {
        // Cache invalidation failure is non-critical
      });

      this.logger.info('Indexed margin.at annotation', {
        uri: view.uri,
        targetUrl: view.targetUrl,
        motivation: view.motivation,
      });

      return Ok(undefined);
    } catch (err) {
      const dbError = err instanceof Error ? err : new Error(String(err));
      return Err(
        new InteropError(
          `Failed to store margin.at annotation: ${dbError.message}`,
          'margin.at',
          record.$type,
          dbError,
        ),
      );
    }
  }

  async handleMarginDelete(did: string, rkey: string): Promise<Result<void, InteropError>> {
    try {
      // Fetch the target_url before deletion so we can invalidate cache
      const existing = await this.pool.query<{ target_url: string }>(
        'SELECT target_url FROM margin_annotations WHERE did = $1 AND rkey = $2',
        [did, rkey],
      );

      await this.pool.query('DELETE FROM margin_annotations WHERE did = $1 AND rkey = $2', [
        did,
        rkey,
      ]);

      if (existing.rows[0]?.target_url) {
        await this.redis.del(marginCacheKey(existing.rows[0].target_url)).catch(() => {
          // Cache invalidation failure is non-critical
        });
      }

      this.logger.info('Deleted margin.at annotation', { did, rkey });
      return Ok(undefined);
    } catch (err) {
      const dbError = err instanceof Error ? err : new Error(String(err));
      return Err(
        new InteropError(
          `Failed to delete margin.at annotation: ${dbError.message}`,
          'margin.at',
          'at.margin.annotation',
          dbError,
        ),
      );
    }
  }

  async getAnnotationsForUrl(
    url: string,
    limit = 50,
  ): Promise<Result<ExternalAnnotationView[], InteropError>> {
    // Check cache first
    try {
      const cached = await this.redis.get(marginCacheKey(url));
      if (cached) {
        return Ok(JSON.parse(cached) as ExternalAnnotationView[]);
      }
    } catch {
      // Cache read failure is non-critical; fall through to DB query
    }

    try {
      const result = await this.pool.query<{
        uri: string;
        did: string;
        rkey: string;
        target_url: string;
        motivation: string;
        body_text: string;
        body_format: string | null;
        creator_did: string;
        selector: string | null;
        created_at: Date;
        record: Record<string, unknown>;
      }>(
        `SELECT uri, did, rkey, target_url, motivation, body_text, body_format,
                creator_did, selector, created_at, record
         FROM margin_annotations
         WHERE target_url = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [url, limit],
      );

      const views: ExternalAnnotationView[] = result.rows.map((row) => ({
        id: `margin.at:${row.did}:${row.rkey}`,
        source: 'margin.at' as const,
        uri: row.uri,
        creatorDid: row.creator_did,
        targetUrl: row.target_url,
        text: row.body_text,
        kind: row.motivation,
        motivation: row.motivation as ExternalAnnotationView['motivation'],
        createdAt: row.created_at.toISOString(),
        format: row.body_format ?? undefined,
      }));

      // Cache the result
      try {
        await this.redis.setex(
          marginCacheKey(url),
          MARGIN_CACHE_TTL_SECONDS,
          JSON.stringify(views),
        );
      } catch {
        // Cache write failure is non-critical
      }

      return Ok(views);
    } catch (err) {
      const dbError = err instanceof Error ? err : new Error(String(err));
      return Err(
        new InteropError(
          `Failed to query margin annotations for URL: ${dbError.message}`,
          'margin.at',
          'at.margin.annotation',
          dbError,
        ),
      );
    }
  }
}

export type { IMarginIndexer, MarginIndexerDeps };
export { MarginIndexer, MARGIN_NSIDS, MARGIN_CACHE_TTL_SECONDS };
