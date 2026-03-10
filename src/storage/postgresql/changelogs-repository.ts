/**
 * Changelog entry repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on summary fields
 * and a term filter for subject_collection.
 *
 * @module
 */

import type { ChangelogEntryRecord, ChangelogEntryRow } from '../../types/changelog-entry.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the changelog entry record type.
 */
const changelogRepoConfig: RecordTypeConfig<ChangelogEntryRecord> = {
  collection: 'pub.layers.changelog.entry',
  table: 'changelogs',
  esIndex: 'changelogs',
  neo4jLabel: 'Changelog',
  resourceName: 'ChangelogEntry',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      subject_uri: record.subject,
      subject_collection: record.subjectCollection,
      summary: record.summary,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      subjectUri: record.subject,
      subjectCollection: record.subjectCollection,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    // REFERENCES edge from this changelog entry to the subject record
    if (record.subject) {
      edges.push({ from: uri, to: record.subject, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for changelog entry data access operations.
 */
interface IChangelogsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: ChangelogEntryRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<ChangelogEntryRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: ChangelogEntryRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchEntries(
    query: string,
    filters: { subjectCollection?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: ChangelogEntryRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Changelog entry repository extending the generic base with search.
 */
class ChangelogsRepository
  extends BaseRepository<ChangelogEntryRecord, ChangelogEntryRow>
  implements IChangelogsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, changelogRepoConfig);
  }

  async searchEntries(
    query: string,
    filters: { subjectCollection?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: ChangelogEntryRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  > {
    // Build ES query
    const must: Record<string, unknown>[] = [
      {
        multi_match: {
          query,
          fields: ['summary^3'],
        },
      },
    ];

    const filter: Record<string, unknown>[] = [];
    if (filters.subjectCollection) {
      filter.push({ term: { subject_collection: filters.subjectCollection } });
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

    const rows = result.value.hits as unknown as ChangelogEntryRow[];
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

export { ChangelogsRepository, changelogRepoConfig };
export type { IChangelogsRepository };
