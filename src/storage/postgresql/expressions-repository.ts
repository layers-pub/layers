/**
 * Expression-specific repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on text fields
 * and term filters for language/kind.
 *
 * @module
 */

import type { ExpressionRecord, ExpressionRow } from '../../types/expression.js';
import { toExpressionView } from '../../types/expression.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the expression record type.
 */
const expressionRepoConfig: RecordTypeConfig<ExpressionRecord> = {
  collection: 'pub.layers.expression.expression',
  table: 'expressions',
  esIndex: 'expressions',
  neo4jLabel: 'Expression',
  resourceName: 'Expression',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      text: record.text ?? null,
      kind: record.kind ?? null,
      language: record.language ?? null,
      source_url: record.sourceUrl ?? null,
      source_ref: record.sourceRef ?? null,
      eprint_ref: record.eprintRef ?? null,
      parent_ref: record.parentRef ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      kind: record.kind ?? null,
      language: record.language ?? null,
      text: record.text ? record.text.slice(0, 500) : null,
      indexedAt: new Date().toISOString(),
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.parentRef) {
      edges.push({ from: record.parentRef, to: uri, type: 'PARENT_OF' });
    }
    if (record.sourceRef) {
      edges.push({ from: uri, to: record.sourceRef, type: 'REFERENCES' });
    }
    if (record.eprintRef) {
      edges.push({ from: uri, to: record.eprintRef, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for expression data access operations.
 */
interface IExpressionsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: ExpressionRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<ExpressionRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: ExpressionRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchExpressions(
    query: string,
    filters: { language?: string | undefined; kind?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: ExpressionRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Expression repository extending the generic base with search.
 */
class ExpressionsRepository
  extends BaseRepository<ExpressionRecord, ExpressionRow>
  implements IExpressionsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, expressionRepoConfig);
  }

  async searchExpressions(
    query: string,
    filters: { language?: string | undefined; kind?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: ExpressionRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  > {
    // Build ES query
    const must: Record<string, unknown>[] = [
      {
        multi_match: {
          query,
          fields: ['text^3', 'text.raw'],
        },
      },
    ];

    const filter: Record<string, unknown>[] = [];
    if (filters.language) {
      filter.push({ term: { language: filters.language } });
    }
    if (filters.kind) {
      filter.push({ term: { kind: filters.kind } });
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

    const rows = result.value.hits as unknown as ExpressionRow[];
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

export { ExpressionsRepository, expressionRepoConfig, toExpressionView };
export type { IExpressionsRepository };
