/**
 * Resource collection repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on name and description fields
 * and term filters for kind and language.
 *
 * @module
 */

import type {
  ResourceCollectionRecord,
  ResourceCollectionRow,
} from '../../types/resource-collection.js';
import { toResourceCollectionView } from '../../types/resource-collection.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the resource collection record type.
 */
const resourceCollectionRepoConfig: RecordTypeConfig<ResourceCollectionRecord> = {
  collection: 'pub.layers.resource.collection',
  table: 'resource_collections',
  esIndex: 'resource_collections',
  neo4jLabel: 'Resource',
  resourceName: 'ResourceCollection',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      name: record.name,
      kind: record.kind ?? null,
      language: record.language ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      name: record.name,
      kind: record.kind ?? null,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.ontologyRef) {
      edges.push({ from: uri, to: record.ontologyRef, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for resource collection data access operations.
 */
interface IResourceCollectionsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: ResourceCollectionRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<ResourceCollectionRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: ResourceCollectionRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchCollections(
    query: string,
    filters: { kind?: string | undefined; language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<
      { rows: ResourceCollectionRow[]; total: number; cursor?: string | undefined },
      DatabaseError
    >
  >;
}

/**
 * Resource collection repository extending the generic base with search.
 */
class ResourceCollectionsRepository
  extends BaseRepository<ResourceCollectionRecord, ResourceCollectionRow>
  implements IResourceCollectionsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, resourceCollectionRepoConfig);
  }

  async searchCollections(
    query: string,
    filters: { kind?: string | undefined; language?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<
      { rows: ResourceCollectionRow[]; total: number; cursor?: string | undefined },
      DatabaseError
    >
  > {
    // Build ES query
    const must: Record<string, unknown>[] = [
      {
        multi_match: {
          query,
          fields: ['name^3', 'name.keyword', 'description'],
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

    const rows = result.value.hits as unknown as ResourceCollectionRow[];
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

export { ResourceCollectionsRepository, resourceCollectionRepoConfig, toResourceCollectionView };
export type { IResourceCollectionsRepository };
