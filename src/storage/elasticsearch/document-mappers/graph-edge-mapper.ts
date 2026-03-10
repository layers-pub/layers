/**
 * Document mapper for transforming graph edge rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { GraphEdgeRow } from '../../../types/graph-edge.js';

/**
 * Maps a {@link GraphEdgeRow} to a flat Elasticsearch document
 * matching the `graph_edges` index mapping.
 */
class GraphEdgeDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as GraphEdgeRow;

    return {
      uri: typed.uri,
      did: typed.did,
      source_ref: typed.source_ref,
      target_ref: typed.target_ref,
      edge_type: typed.edge_type,
      edge_set_ref: typed.edge_set_ref,
      confidence: typed.confidence,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { GraphEdgeDocumentMapper };
