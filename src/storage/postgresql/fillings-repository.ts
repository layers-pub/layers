/**
 * Filling repository extending {@link BaseRepository}.
 *
 * Fillings have no search endpoint. This repository provides only the
 * standard get, list, index, and delete operations inherited from the base class.
 *
 * @module
 */

import type { FillingRecord, FillingRow } from '../../types/filling.js';
import { toFillingView } from '../../types/filling.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the filling record type.
 */
const fillingRepoConfig: RecordTypeConfig<FillingRecord> = {
  collection: 'pub.layers.resource.filling',
  table: 'fillings',
  esIndex: 'fillings',
  neo4jLabel: 'Resource',
  resourceName: 'Filling',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      template_ref: record.templateRef,
      expression_ref: record.expressionRef ?? null,
      strategy: record.strategy ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      templateRef: record.templateRef,
      expressionRef: record.expressionRef ?? null,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.templateRef) {
      edges.push({ from: uri, to: record.templateRef, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for filling data access operations.
 */
interface IFillingsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: FillingRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<FillingRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: FillingRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Filling repository extending the generic base.
 *
 * No search method is needed; fillings are accessed directly by URI or listed
 * by repository DID.
 */
class FillingsRepository
  extends BaseRepository<FillingRecord, FillingRow>
  implements IFillingsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, fillingRepoConfig);
  }
}

export { FillingsRepository, fillingRepoConfig, toFillingView };
export type { IFillingsRepository };
