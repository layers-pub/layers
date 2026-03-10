/**
 * Document mapper for transforming template rows into Elasticsearch documents.
 *
 * Templates have a minimal ES presence (uri, did, name, language, slot_count,
 * experiment_ref, indexed_at) because they have no search endpoint.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { TemplateRow } from '../../../types/template.js';

/**
 * Maps a {@link TemplateRow} to a minimal Elasticsearch document
 * matching the `templates` index mapping.
 */
class TemplateDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as TemplateRow;

    return {
      uri: typed.uri,
      did: typed.did,
      name: typed.name,
      language: typed.language,
      slot_count: typed.slot_count,
      experiment_ref: typed.experiment_ref,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { TemplateDocumentMapper };
