/**
 * Agreement report repository extending {@link BaseRepository}.
 *
 * Agreement reports have no search endpoint; they are accessed by URI or
 * listed by repo DID. This repository provides only the standard get,
 * list, index, and delete operations inherited from the base class.
 *
 * @module
 */

import type { AgreementReportRecord, AgreementReportRow } from '../../types/agreement-report.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the agreement report record type.
 */
const agreementReportRepoConfig: RecordTypeConfig<AgreementReportRecord> = {
  collection: 'pub.layers.judgment.agreementReport',
  table: 'agreement_reports',
  esIndex: 'agreement_reports',
  neo4jLabel: 'Judgment',
  resourceName: 'AgreementReport',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      experiment_ref: record.experimentRef,
      metric: record.metric ?? null,
      score: record.value ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      experimentRef: record.experimentRef,
      metric: record.metric ?? null,
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
 * Contract for agreement report data access operations.
 */
interface IAgreementReportsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: AgreementReportRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<AgreementReportRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: AgreementReportRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Agreement report repository extending the generic base.
 *
 * No search method is needed; agreement reports are discovered through their
 * parent experiment definition.
 */
class AgreementReportsRepository
  extends BaseRepository<AgreementReportRecord, AgreementReportRow>
  implements IAgreementReportsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, agreementReportRepoConfig);
  }
}

export { AgreementReportsRepository, agreementReportRepoConfig };
export type { IAgreementReportsRepository };
