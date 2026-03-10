/**
 * Experiment definition repository extending {@link BaseRepository}.
 *
 * Adds Elasticsearch search with multi_match on name and description
 * fields and an optional term filter for measure.
 *
 * @module
 */

import type { ExperimentDefRecord, ExperimentDefRow } from '../../types/experiment-def.js';
import { DatabaseError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the experiment definition record type.
 */
const experimentDefRepoConfig: RecordTypeConfig<ExperimentDefRecord> = {
  collection: 'pub.layers.judgment.experimentDef',
  table: 'experiment_defs',
  esIndex: 'experiment_defs',
  neo4jLabel: 'ExperimentDef',
  resourceName: 'ExperimentDef',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      name: record.name,
      measure: record.measureType ?? null,
      task_type: record.taskType ?? null,
      design_type: (record.design?.type as string) ?? null,
      ontology_ref: record.ontologyRef ?? null,
      persona_ref: record.personaRef ?? null,
      corpus_ref: record.corpusRef ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      name: record.name,
      measure: record.measureType ?? null,
      taskType: record.taskType ?? null,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.ontologyRef) {
      edges.push({ from: uri, to: record.ontologyRef, type: 'REFERENCES' });
    }
    if (record.personaRef) {
      edges.push({ from: uri, to: record.personaRef, type: 'REFERENCES' });
    }
    if (record.corpusRef) {
      edges.push({ from: uri, to: record.corpusRef, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for experiment definition data access operations.
 */
interface IExperimentDefsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: ExperimentDefRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<ExperimentDefRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: ExperimentDefRow[]; cursor?: string | undefined }, DatabaseError>>;

  searchExperimentDefs(
    query: string,
    filters: { measureType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: ExperimentDefRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Experiment definition repository extending the generic base with search.
 */
class ExperimentDefsRepository
  extends BaseRepository<ExperimentDefRecord, ExperimentDefRow>
  implements IExperimentDefsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, experimentDefRepoConfig);
  }

  async searchExperimentDefs(
    query: string,
    filters: { measureType?: string | undefined },
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: ExperimentDefRow[]; total: number; cursor?: string | undefined }, DatabaseError>
  > {
    // Build ES query
    const must: Record<string, unknown>[] = [
      {
        multi_match: {
          query,
          fields: ['name^3', 'description'],
        },
      },
    ];

    const filter: Record<string, unknown>[] = [];
    if (filters.measureType) {
      filter.push({ term: { measure: filters.measureType } });
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

    const rows = result.value.hits as unknown as ExperimentDefRow[];
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

export { ExperimentDefsRepository, experimentDefRepoConfig };
export type { IExperimentDefsRepository };
