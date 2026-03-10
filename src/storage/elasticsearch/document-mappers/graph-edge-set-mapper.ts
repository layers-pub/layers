/**
 * Document mapper for transforming graph edge set rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { GraphEdgeSetRow } from '../../../types/graph-edge-set.js';

/**
 * Maps a {@link GraphEdgeSetRow} to a flat Elasticsearch document
 * matching the `graph_edge_sets` index mapping.
 */
class GraphEdgeSetDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as GraphEdgeSetRow;

    return {
      uri: typed.uri,
      did: typed.did,
      name: typed.name,
      edge_type: typed.edge_type,
      edge_count: typed.edge_count,
      expression_ref: typed.expression_ref,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { GraphEdgeSetDocumentMapper };
