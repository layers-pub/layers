/**
 * A thin service layer built on top of {@link BaseRecordService} that adds a
 * generic `search(query, filters, limit, cursor)` driven by the lens spec.
 *
 * All 26 per-record `searchXxx` methods collapse to this one because their
 * shape is identical: a multi_match on `es.searchFields` plus one term filter
 * per supplied filter key.
 *
 * @module
 */

import type { Redis } from 'ioredis';
import type { ZodType } from 'zod';

import { createLogger } from '../../observability/logger.js';
import type { ElasticsearchAdapter } from '../../storage/elasticsearch/adapter.js';
import { DatabaseError, type LayersError, ValidationError } from '../../types/errors.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { BaseRecordService } from '../base-record-service.js';
import type { BaseRepository } from '../../storage/base-repository.js';

import type { LensStorageSpec } from './lens-spec.js';

interface SearchRow {
  readonly uri: string;
  readonly [key: string]: unknown;
}

interface SearchOutput {
  readonly records: readonly SearchRow[];
  readonly total: number;
  readonly cursor?: string | undefined;
}

interface LensRecordServiceDeps<TRow extends { readonly indexed_at: Date; readonly uri: string }> {
  readonly repository: BaseRepository<unknown, TRow>;
  readonly redis: Redis;
  readonly esAdapter: ElasticsearchAdapter;
  readonly spec: LensStorageSpec;
  readonly recordSchema: ZodType<unknown>;
  readonly toView: (row: TRow) => SearchRow;
  readonly logger?: ILogger;
}

/**
 * Service wrapper that adds lens-driven search to the generic base. The
 * return shape matches what per-record services returned, so XRPC handlers
 * do not need to change.
 */
export class LensRecordService<
  TRow extends { readonly indexed_at: Date; readonly uri: string },
> extends BaseRecordService<unknown, TRow, SearchRow> {
  private readonly esAdapter: ElasticsearchAdapter;
  private readonly spec: LensStorageSpec;

  constructor(deps: LensRecordServiceDeps<TRow>) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      {
        resourceName: deps.spec.resourceName ?? deps.spec.collection,
        recordSchema: deps.recordSchema,
        toView: deps.toView,
      },
    );
    this.esAdapter = deps.esAdapter;
    this.spec = deps.spec;
  }

  /**
   * Runs a bounded search on this record kind's ES index.
   *
   * `query` — user-supplied full-text search (matched against
   * `es.searchFields` from the lens spec). `filters` — any subset of the
   * record's list-endpoint params that should become term filters.
   */
  async search(
    query: string,
    filters: Readonly<Record<string, string | undefined>>,
    limit: number,
    cursor?: string,
  ): Promise<Result<SearchOutput, LayersError>> {
    const index = this.spec.esIndex;
    if (!index) {
      return Err(new DatabaseError(`No esIndex configured for ${this.spec.collection}`));
    }
    const fields = this.spec.es.searchFields ?? [];
    if (fields.length === 0 && query.trim().length > 0) {
      return Err(
        new ValidationError(
          `No searchable fields declared for ${this.spec.resourceName ?? this.spec.collection}`,
        ),
      );
    }

    const must: Record<string, unknown>[] = [];
    if (query.trim().length > 0) {
      must.push({ multi_match: { query, fields: [...fields] } });
    }

    const filter: Record<string, unknown>[] = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === '') continue;
      filter.push({ term: { [key]: value } });
    }

    const esQuery: Record<string, unknown> = {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        ...(filter.length > 0 ? { filter } : {}),
      },
    };

    const from = cursor ? Number(Buffer.from(cursor, 'base64url').toString('utf-8')) : 0;
    const size = Math.max(1, Math.min(limit, 100));

    const searchResult = await this.esAdapter.search({
      index,
      query: esQuery,
      from,
      size,
      sort: [{ _score: { order: 'desc' } }, { uri: { order: 'asc' } }],
    });

    if (!searchResult.ok) {
      return Err(searchResult.error);
    }

    const hits = searchResult.value.hits as SearchRow[];
    const total = searchResult.value.total;
    const nextCursor =
      hits.length === size
        ? Buffer.from(String(from + size)).toString('base64url')
        : undefined;

    return Ok({ records: hits, total, cursor: nextCursor });
  }
}

/**
 * Convenience factory that allocates the logger.
 */
export function createLensRecordService<
  TRow extends { readonly indexed_at: Date; readonly uri: string },
>(deps: LensRecordServiceDeps<TRow>): LensRecordService<TRow> {
  const logger =
    deps.logger ??
    createLogger({ service: `${(deps.spec.resourceName ?? 'record').toLowerCase()}-service` });
  return new LensRecordService({ ...deps, logger });
}
