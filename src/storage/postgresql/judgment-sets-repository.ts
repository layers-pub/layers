/**
 * Judgment set repository extending {@link BaseRepository}.
 *
 * Judgment sets have no search endpoint; they are accessed by URI or
 * listed by repo DID. This repository provides only the standard get,
 * list, index, and delete operations inherited from the base class.
 *
 * @module
 */

import type { JudgmentSetRecord, JudgmentSetRow } from '../../types/judgment-set.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the judgment set record type.
 */
const judgmentSetRepoConfig: RecordTypeConfig<JudgmentSetRecord> = {
  collection: 'pub.layers.judgment.judgmentSet',
  table: 'judgment_sets',
  esIndex: 'judgment_sets',
  neo4jLabel: 'Judgment',
  resourceName: 'JudgmentSet',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      experiment_ref: record.experimentRef,
      annotator_did: (record.agent?.did as string) ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      experimentRef: record.experimentRef,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.experimentRef) {
      edges.push({ from: uri, to: record.experimentRef, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for judgment set data access operations.
 */
interface IJudgmentSetsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: JudgmentSetRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<JudgmentSetRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: JudgmentSetRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Judgment set repository extending the generic base.
 *
 * No search method is needed; judgment sets are discovered through their
 * parent experiment definition.
 */
class JudgmentSetsRepository
  extends BaseRepository<JudgmentSetRecord, JudgmentSetRow>
  implements IJudgmentSetsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, judgmentSetRepoConfig);
  }
}

export { JudgmentSetsRepository, judgmentSetRepoConfig };
export type { IJudgmentSetsRepository };
