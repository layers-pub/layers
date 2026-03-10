/**
 * Corpus-specific repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on name and description fields
 * and term filters for language and domain.
 *
 * @module
 */

import type { CorpusRecord, CorpusRow } from '../../types/corpus.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the corpus record type.
 */
const corporaRepoConfig: RecordTypeConfig<CorpusRecord> = {
  collection: 'pub.layers.corpus.corpus',
  table: 'corpora',
  esIndex: 'corpora',
  neo4jLabel: 'Corpus',
  resourceName: 'Corpus',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      name: record.name,
      language: record.language ?? null,
      license: record.license ?? null,
      domain: record.domain ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      name: record.name,
      language: record.language ?? null,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.ontologyRefs) {
      for (const ref of record.ontologyRefs) {
        edges.push({ from: uri, to: ref, type: 'REFERENCES' });
      }
    }

    if (record.eprintRefs) {
      for (const ref of record.eprintRefs) {
        edges.push({ from: uri, to: ref, type: 'REFERENCES' });
      }
    }

    return edges;
  },
};

/**
 * Contract for corpus data access operations.
 */
interface ICorporaRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: CorpusRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<CorpusRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: CorpusRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchCorpora(
    query: string,
    filters: { language?: string | undefined; domain?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: CorpusRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Corpus repository extending the generic base with search.
 */
class CorporaRepository
  extends BaseRepository<CorpusRecord, CorpusRow>
  implements ICorporaRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, corporaRepoConfig);
  }

  async searchCorpora(
    query: string,
    filters: { language?: string | undefined; domain?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: CorpusRow[]; total: number; cursor?: string | undefined }, DatabaseError>
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
    if (filters.language) {
      filter.push({ term: { language: filters.language } });
    }
    if (filters.domain) {
      filter.push({ term: { domain: filters.domain } });
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

    const rows = result.value.hits as unknown as CorpusRow[];
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

export { CorporaRepository, corporaRepoConfig };
export type { ICorporaRepository };
