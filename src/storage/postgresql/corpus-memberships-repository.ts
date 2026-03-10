/**
 * Corpus membership repository extending {@link BaseRepository}.
 *
 * No search method is provided because corpus memberships are not
 * full-text searchable. Lookups are structural (by URI, by repo DID).
 *
 * @module
 */

import type { CorpusMembershipRecord, CorpusMembershipRow } from '../../types/corpus-membership.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the corpus membership record type.
 *
 * Neo4j: creates a minimal CorpusMembership node so the base repository's
 * mergeNode call succeeds. The meaningful graph structure is the MEMBER_OF
 * edge from expressionRef to corpusRef, created via extractEdges.
 */
const corpusMembershipsRepoConfig: RecordTypeConfig<CorpusMembershipRecord> = {
  collection: 'pub.layers.corpus.membership',
  table: 'corpus_memberships',
  esIndex: 'corpus_memberships',
  neo4jLabel: 'CorpusMembership',
  resourceName: 'CorpusMembership',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      corpus_ref: record.corpusRef,
      expression_ref: record.expressionRef,
      split: record.split ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did) {
    return {
      uri,
      did,
    };
  },

  extractEdges(_uri, record) {
    return [{ from: record.expressionRef, to: record.corpusRef, type: 'MEMBER_OF' }];
  },
};

/**
 * Contract for corpus membership data access operations.
 */
interface ICorpusMembershipsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: CorpusMembershipRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<CorpusMembershipRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: CorpusMembershipRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Corpus membership repository with no search (structural lookups only).
 */
class CorpusMembershipsRepository
  extends BaseRepository<CorpusMembershipRecord, CorpusMembershipRow>
  implements ICorpusMembershipsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, corpusMembershipsRepoConfig);
  }
}

export { CorpusMembershipsRepository, corpusMembershipsRepoConfig };
export type { ICorpusMembershipsRepository };
