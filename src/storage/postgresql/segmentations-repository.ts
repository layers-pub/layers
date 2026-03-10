/**
 * Segmentation-specific repository extending {@link BaseRepository}.
 *
 * Segmentations have no search endpoint; they are accessed via their parent
 * expression. This repository provides only the standard get, list, index,
 * and delete operations inherited from the base class.
 *
 * @module
 */

import type { SegmentationRecord, SegmentationRow } from '../../types/segmentation.js';
import { toSegmentationView } from '../../types/segmentation.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the segmentation record type.
 */
const segmentationRepoConfig: RecordTypeConfig<SegmentationRecord> = {
  collection: 'pub.layers.segmentation.segmentation',
  table: 'segmentations',
  esIndex: 'segmentations',
  neo4jLabel: 'Segmentation',
  resourceName: 'Segmentation',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      expression_ref: record.expression,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      expressionRef: record.expression,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    // Expression -> SEGMENTED_BY -> Segmentation
    if (record.expression) {
      edges.push({ from: record.expression, to: uri, type: 'SEGMENTED_BY' });
    }

    return edges;
  },
};

/**
 * Contract for segmentation data access operations.
 */
interface ISegmentationsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: SegmentationRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<SegmentationRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: SegmentationRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Segmentation repository extending the generic base.
 *
 * No search method is needed; segmentations are discovered through their
 * parent expression.
 */
class SegmentationsRepository
  extends BaseRepository<SegmentationRecord, SegmentationRow>
  implements ISegmentationsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, segmentationRepoConfig);
  }
}

export { SegmentationsRepository, segmentationRepoConfig, toSegmentationView };
export type { ISegmentationsRepository };
