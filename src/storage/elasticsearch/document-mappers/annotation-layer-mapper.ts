/**
 * Document mapper for transforming annotation layer rows into Elasticsearch documents.
 *
 * Indexes kind, subkind, formalism, and expression_ref as keyword fields
 * for faceted search across annotation layers.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { AnnotationLayerRow } from '../../../types/annotation-layer.js';

/**
 * Maps an {@link AnnotationLayerRow} to an Elasticsearch document
 * matching the `annotation_layers` index mapping.
 */
class AnnotationLayerDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as AnnotationLayerRow;

    return {
      uri: typed.uri,
      did: typed.did,
      expression_ref: typed.expression_ref,
      kind: typed.kind,
      subkind: typed.subkind ?? undefined,
      formalism: typed.formalism ?? undefined,
      annotation_count: typed.annotation_count,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { AnnotationLayerDocumentMapper };
