/**
 * Resource entry repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on lemma and form fields
 * and a term filter for language.
 *
 * @module
 */

import type { ResourceEntryRecord, ResourceEntryRow } from '../../types/resource-entry.js';
import { toResourceEntryView } from '../../types/resource-entry.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the resource entry record type.
 */
const resourceEntryRepoConfig: RecordTypeConfig<ResourceEntryRecord> = {
  collection: 'pub.layers.resource.entry',
  table: 'resource_entries',
  esIndex: 'resource_entries',
  neo4jLabel: 'Resource',
  resourceName: 'ResourceEntry',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      form: record.form,
      lemma: record.lemma ?? null,
      language: record.language ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      form: record.form,
      lemma: record.lemma ?? null,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.ontologyTypeRef) {
      edges.push({ from: uri, to: record.ontologyTypeRef, type: 'REFERENCES' });
    }
    if (record.sourceRef) {
      edges.push({ from: uri, to: record.sourceRef, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for resource entry data access operations.
 */
interface IResourceEntriesRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: ResourceEntryRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<ResourceEntryRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: ResourceEntryRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchEntries(
    query: string,
    filters: { language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: ResourceEntryRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Resource entry repository extending the generic base with search.
 */
class ResourceEntriesRepository
  extends BaseRepository<ResourceEntryRecord, ResourceEntryRow>
  implements IResourceEntriesRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, resourceEntryRepoConfig);
  }

  async searchEntries(
    query: string,
    filters: { language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: ResourceEntryRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  > {
    // Build ES query
    const must: Record<string, unknown>[] = [
      {
        multi_match: {
          query,
          fields: ['lemma^3', 'form^2', 'lemma.keyword', 'form.keyword'],
        },
      },
    ];

    const filter: Record<string, unknown>[] = [];
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

    const rows = result.value.hits as unknown as ResourceEntryRow[];
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

export { ResourceEntriesRepository, resourceEntryRepoConfig, toResourceEntryView };
export type { IResourceEntriesRepository };
