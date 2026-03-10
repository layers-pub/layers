/**
 * Eprint-specific repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on eprint_identifier, citation,
 * and description fields, with term filters for identifierType and linkType.
 *
 * @module
 */

import type { EprintRecord, EprintRow } from '../../types/eprint.js';
import { toEprintView } from '../../types/eprint.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the eprint record type.
 */
const eprintRepoConfig: RecordTypeConfig<EprintRecord> = {
  collection: 'pub.layers.eprint.eprint',
  table: 'eprints',
  esIndex: 'eprints',
  neo4jLabel: 'Eprint',
  resourceName: 'Eprint',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      eprint_identifier: record.eprintIdentifier,
      eprint_identifier_type: record.eprintIdentifierType ?? null,
      link_type: record.linkType,
      corpus_ref: record.corpusRef ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      eprintIdentifier: record.eprintIdentifier,
      linkType: record.linkType,
      indexedAt: new Date().toISOString(),
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.corpusRef) {
      edges.push({ from: uri, to: record.corpusRef, type: 'REFERENCES' });
    }
    if (record.platformEprintRef) {
      edges.push({ from: uri, to: record.platformEprintRef, type: 'REFERENCES' });
    }

    // Link to expression refs (cap at 10 to avoid excessive edges)
    const expressionRefs = record.expressionRefs ?? [];
    const cappedExpressionRefs = expressionRefs.slice(0, 10);
    for (const ref of cappedExpressionRefs) {
      edges.push({ from: uri, to: ref, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for eprint data access operations.
 */
interface IEprintsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: EprintRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<EprintRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: EprintRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchEprints(
    query: string,
    filters: { identifierType?: string | undefined; linkType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: EprintRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Eprint repository extending the generic base with search.
 */
class EprintsRepository
  extends BaseRepository<EprintRecord, EprintRow>
  implements IEprintsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, eprintRepoConfig);
  }

  async searchEprints(
    query: string,
    filters: { identifierType?: string | undefined; linkType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: EprintRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  > {
    // Build ES query
    const must: Record<string, unknown>[] = [
      {
        multi_match: {
          query,
          fields: ['eprint_identifier^3', 'citation', 'description'],
        },
      },
    ];

    const filter: Record<string, unknown>[] = [];
    if (filters.identifierType) {
      filter.push({ term: { eprint_identifier_type: filters.identifierType } });
    }
    if (filters.linkType) {
      filter.push({ term: { link_type: filters.linkType } });
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

    const rows = result.value.hits as unknown as EprintRow[];
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

export { EprintsRepository, eprintRepoConfig, toEprintView };
export type { IEprintsRepository };
