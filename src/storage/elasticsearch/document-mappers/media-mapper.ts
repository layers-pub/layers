/**
 * Document mapper for transforming media rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { MediaRecord, MediaRow } from '../../../types/media.js';

/**
 * Maps a {@link MediaRow} to a flat Elasticsearch document
 * matching the `media_records` index mapping.
 */
class MediaDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as MediaRow;
    const record = typed.record as MediaRecord | undefined;

    return {
      uri: typed.uri,
      did: typed.did,
      kind: typed.kind,
      title: record?.title ?? null,
      description: record?.description ?? null,
      mime_type: typed.mime_type,
      language: typed.language,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { MediaDocumentMapper };
