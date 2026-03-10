/**
 * Document mapper for transforming segmentation rows into Elasticsearch documents.
 *
 * Segmentations have a minimal ES presence (uri, did, expression_ref, indexed_at)
 * because they are primarily accessed via their parent expression.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { SegmentationRow } from '../../../types/segmentation.js';

/**
 * Maps a {@link SegmentationRow} to a minimal Elasticsearch document
 * matching the `segmentations` index mapping.
 */
class SegmentationDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as SegmentationRow;

    return {
      uri: typed.uri,
      did: typed.did,
      expression_ref: typed.expression_ref,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { SegmentationDocumentMapper };
