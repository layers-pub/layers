/**
 * Media-specific repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on title and description fields
 * and term filters for kind and language.
 *
 * @module
 */

import type { MediaRecord, MediaRow } from '../../types/media.js';
import { toMediaView } from '../../types/media.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the media record type.
 */
const mediaRepoConfig: RecordTypeConfig<MediaRecord> = {
  collection: 'pub.layers.media.media',
  table: 'media_records',
  esIndex: 'media_records',
  neo4jLabel: 'Media',
  resourceName: 'Media',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      kind: record.kind,
      mime_type: record.mimeType ?? null,
      duration_ms: record.durationMs ?? null,
      language: record.language ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      kind: record.kind,
      language: record.language ?? null,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.parentMediaRef) {
      edges.push({ from: record.parentMediaRef, to: uri, type: 'PARENT_OF' });
    }

    return edges;
  },
};

/**
 * Contract for media data access operations.
 */
interface IMediaRepository {
  indexRecord(did: string, rkey: string, record: MediaRecord): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<MediaRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: MediaRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchMedia(
    query: string,
    filters: { kind?: string | undefined; language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: MediaRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Media repository extending the generic base with search.
 */
class MediaRepository extends BaseRepository<MediaRecord, MediaRow> implements IMediaRepository {
  constructor(deps: BaseRepositoryDeps) {
    super(deps, mediaRepoConfig);
  }

  async searchMedia(
    query: string,
    filters: { kind?: string | undefined; language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: MediaRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  > {
    // Build ES query
    const must: Record<string, unknown>[] = [
      {
        multi_match: {
          query,
          fields: ['title^3', 'description'],
        },
      },
    ];

    const filter: Record<string, unknown>[] = [];
    if (filters.kind) {
      filter.push({ term: { kind: filters.kind } });
    }
    if (filters.language) {
      filter.push({ term: { language: filters.language } });
    }

    const esQuery: Record<string, unknown> = {
      bool: {
        must,
        ...(filter.length > 0 ? { filter } : {}),
      },
    };

    const sort: Record<string, unknown>[] = [
      { _score: { order: 'desc' } },
      { uri: { order: 'asc' } },
    ];

    // Decode search_after cursor if present
    let searchAfter: unknown[] | undefined;
    if (cursor) {
      try {
        searchAfter = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as unknown[];
      } catch {
        return Err(new DatabaseError('Invalid search cursor'));
      }
    }

    const searchRequest = {
      index: this.config.esIndex,
      query: esQuery,
      size: limit,
      sort,
      ...(searchAfter ? { search_after: searchAfter } : {}),
    };

    const result = await this.esAdapter.search(searchRequest);
    if (!result.ok) {
      return result as Result<never, DatabaseError>;
    }

    const rows = result.value.hits as unknown as MediaRow[];
    const total = result.value.total;

    // Build next cursor from last hit's sort values
    const lastHit = result.value.hits[result.value.hits.length - 1];
    const nextCursor =
      lastHit && rows.length === limit && '_sort' in lastHit
        ? Buffer.from(JSON.stringify(lastHit._sort)).toString('base64url')
        : undefined;

    return Ok({ rows, total, cursor: nextCursor });
  }
}

export { MediaRepository, mediaRepoConfig, toMediaView };
export type { IMediaRepository };
