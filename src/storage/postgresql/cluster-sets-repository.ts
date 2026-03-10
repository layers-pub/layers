/**
 * Cluster set repository extending {@link BaseRepository}.
 *
 * Cluster sets have no search endpoint at the repository level.
 * Neo4j edges connect cluster sets to their parent annotation layer.
 *
 * @module
 */

import type { ClusterSetRecord, ClusterSetRow } from '../../types/cluster-set.js';
import { toClusterSetView } from '../../types/cluster-set.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the cluster set record type.
 */
const clusterSetRepoConfig: RecordTypeConfig<ClusterSetRecord> = {
  collection: 'pub.layers.annotation.clusterSet',
  table: 'cluster_sets',
  esIndex: 'cluster_sets',
  neo4jLabel: 'ClusterSet',
  resourceName: 'ClusterSet',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      expression_ref: record.expression ?? null,
      layer_ref: record.layerRef,
      kind: record.kind ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      layerRef: record.layerRef,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    // REFERENCES edge from this cluster set to the annotation layer
    if (record.layerRef) {
      edges.push({ from: uri, to: record.layerRef, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for cluster set data access operations.
 */
interface IClusterSetsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: ClusterSetRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<ClusterSetRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: ClusterSetRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Cluster set repository extending the generic base.
 *
 * No search method is needed; cluster sets are discovered through
 * their parent annotation layer.
 */
class ClusterSetsRepository
  extends BaseRepository<ClusterSetRecord, ClusterSetRow>
  implements IClusterSetsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, clusterSetRepoConfig);
  }
}

export { ClusterSetsRepository, clusterSetRepoConfig, toClusterSetView };
export type { IClusterSetsRepository };
