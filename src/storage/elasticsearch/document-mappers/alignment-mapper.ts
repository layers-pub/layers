/**
 * Document mapper for transforming alignment rows into Elasticsearch documents.
 *
 * Alignments have a minimal ES presence (keyword fields only) because they
 * have no search endpoint.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { AlignmentRow } from '../../../types/alignment.js';

/**
 * Maps an {@link AlignmentRow} to a flat Elasticsearch document
 * matching the `alignments` index mapping.
 */
class AlignmentDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as AlignmentRow;

    return {
      uri: typed.uri,
      did: typed.did,
      expression_ref: typed.expression_ref,
      source_ref: typed.source_ref,
      target_ref: typed.target_ref,
      kind: typed.kind,
      subkind: typed.subkind,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { AlignmentDocumentMapper };
