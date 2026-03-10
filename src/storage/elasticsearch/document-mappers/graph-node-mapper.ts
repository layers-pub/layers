/**
 * Document mapper for transforming graph node rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { GraphNodeRow } from '../../../types/graph-node.js';

/**
 * Maps a {@link GraphNodeRow} to a flat Elasticsearch document
 * matching the `graph_nodes` index mapping.
 */
class GraphNodeDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as GraphNodeRow;

    return {
      uri: typed.uri,
      did: typed.did,
      node_type: typed.node_type,
      label: typed.label,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { GraphNodeDocumentMapper };
