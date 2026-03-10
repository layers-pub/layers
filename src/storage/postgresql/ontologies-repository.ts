/**
 * Ontology-specific repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on name and description fields
 * and a term filter for domain.
 *
 * @module
 */

import type { OntologyRecord, OntologyRow } from '../../types/ontology.js';
import { toOntologyView } from '../../types/ontology.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the ontology record type.
 */
const ontologyRepoConfig: RecordTypeConfig<OntologyRecord> = {
  collection: 'pub.layers.ontology.ontology',
  table: 'ontologies',
  esIndex: 'ontologies',
  neo4jLabel: 'Ontology',
  resourceName: 'Ontology',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      name: record.name,
      domain: record.domain ?? null,
      version: record.version ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      name: record.name,
      domain: record.domain ?? null,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.parentRef) {
      edges.push({ from: record.parentRef, to: uri, type: 'PARENT_OF' });
    }
    if (record.personaRef) {
      edges.push({ from: uri, to: record.personaRef, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for ontology data access operations.
 */
interface IOntologiesRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: OntologyRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<OntologyRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: OntologyRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchOntologies(
    query: string,
    filters: { domain?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: OntologyRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Ontology repository extending the generic base with search.
 */
class OntologiesRepository
  extends BaseRepository<OntologyRecord, OntologyRow>
  implements IOntologiesRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, ontologyRepoConfig);
  }

  async searchOntologies(
    query: string,
    filters: { domain?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: OntologyRow[]; total: number; cursor?: string | undefined }, DatabaseError>
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

    const rows = result.value.hits as unknown as OntologyRow[];
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

export { OntologiesRepository, ontologyRepoConfig, toOntologyView };
export type { IOntologiesRepository };
