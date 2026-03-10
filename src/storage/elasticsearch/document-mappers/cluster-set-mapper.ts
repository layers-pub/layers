/**
 * Document mapper for transforming cluster set rows into Elasticsearch documents.
 *
 * Cluster sets have a minimal ES presence (uri, did, layer_ref, kind, indexed_at)
 * because they are primarily accessed via their parent annotation layer.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { ClusterSetRow } from '../../../types/cluster-set.js';

/**
 * Maps a {@link ClusterSetRow} to a minimal Elasticsearch document
 * matching the `cluster_sets` index mapping.
 */
class ClusterSetDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as ClusterSetRow;

    return {
      uri: typed.uri,
      did: typed.did,
      layer_ref: typed.layer_ref,
      kind: typed.kind ?? undefined,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { ClusterSetDocumentMapper };
