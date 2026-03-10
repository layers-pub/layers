/**
 * TypeDef-specific repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on name and gloss fields
 * and term filters for type_kind and ontology_ref.
 *
 * @module
 */

import type { TypeDefRecord, TypeDefRow } from '../../types/type-def.js';
import { toTypeDefView } from '../../types/type-def.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the typeDef record type.
 */
const typeDefRepoConfig: RecordTypeConfig<TypeDefRecord> = {
  collection: 'pub.layers.ontology.typeDef',
  table: 'type_defs',
  esIndex: 'type_defs',
  neo4jLabel: 'TypeDef',
  resourceName: 'TypeDef',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      ontology_ref: record.ontologyRef,
      name: record.name,
      type_kind: record.typeKind,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      name: record.name,
      typeKind: record.typeKind,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    // ontologyRef -> REFERENCES edge from this typeDef to the ontology
    edges.push({ from: uri, to: record.ontologyRef, type: 'REFERENCES' });

    // parentTypeRef -> PARENT_OF edge from parent to this typeDef
    if (record.parentTypeRef) {
      edges.push({ from: record.parentTypeRef, to: uri, type: 'PARENT_OF' });
    }

    return edges;
  },
};

/**
 * Contract for typeDef data access operations.
 */
interface ITypeDefsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: TypeDefRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<TypeDefRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: TypeDefRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchTypeDefs(
    query: string,
    filters: { typeKind?: string | undefined; ontologyRef?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: TypeDefRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * TypeDef repository extending the generic base with search.
 */
class TypeDefsRepository
  extends BaseRepository<TypeDefRecord, TypeDefRow>
  implements ITypeDefsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, typeDefRepoConfig);
  }

  async searchTypeDefs(
    query: string,
    filters: { typeKind?: string | undefined; ontologyRef?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: TypeDefRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  > {
    // Build ES query
    const must: Record<string, unknown>[] = [
      {
        multi_match: {
          query,
          fields: ['name^3', 'name.keyword', 'gloss'],
        },
      },
    ];

    const filter: Record<string, unknown>[] = [];
    if (filters.typeKind) {
      filter.push({ term: { type_kind: filters.typeKind } });
    }
    if (filters.ontologyRef) {
      filter.push({ term: { ontology_ref: filters.ontologyRef } });
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

    const rows = result.value.hits as unknown as TypeDefRow[];
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

export { TypeDefsRepository, toTypeDefView, typeDefRepoConfig };
export type { ITypeDefsRepository };
