/**
 * Alignment repository extending {@link BaseRepository}.
 *
 * Alignments link source and target objects (typically expressions) across
 * languages or modalities. They have no search endpoint; they are accessed
 * by URI or by repository DID.
 *
 * @module
 */

import type { AlignmentRecord, AlignmentRow } from '../../types/alignment.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the alignment record type.
 */
const alignmentRepoConfig: RecordTypeConfig<AlignmentRecord> = {
  collection: 'pub.layers.alignment.alignment',
  table: 'alignments',
  esIndex: 'alignments',
  neo4jLabel: 'Alignment',
  resourceName: 'Alignment',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      expression_ref: record.expression ?? null,
      source_ref: JSON.stringify(record.source),
      target_ref: JSON.stringify(record.target),
      kind: record.kind,
      subkind: record.subkind ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      kind: record.kind,
      subkind: record.subkind ?? null,
      expressionRef: record.expression ?? null,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    // ALIGNS edge from this alignment to the expression (if present)
    if (record.expression) {
      edges.push({ from: uri, to: record.expression, type: 'ALIGNS' });
    }

    return edges;
  },
};

/**
 * Contract for alignment data access operations.
 */
interface IAlignmentsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: AlignmentRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<AlignmentRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: AlignmentRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Alignment repository extending the generic base.
 *
 * No search method is needed; alignments are discovered through their
 * associated expression or by direct URI lookup.
 */
class AlignmentsRepository
  extends BaseRepository<AlignmentRecord, AlignmentRow>
  implements IAlignmentsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, alignmentRepoConfig);
  }
}

export { AlignmentsRepository, alignmentRepoConfig };
export type { IAlignmentsRepository };
