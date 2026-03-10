/**
 * Document mapper for transforming template composition rows into Elasticsearch documents.
 *
 * Template compositions have a minimal ES presence (uri, did, name, indexed_at)
 * because they have no search endpoint.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { TemplateCompositionRow } from '../../../types/template-composition.js';

/**
 * Maps a {@link TemplateCompositionRow} to a minimal Elasticsearch document
 * matching the `template_compositions` index mapping.
 */
class TemplateCompositionDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as TemplateCompositionRow;

    return {
      uri: typed.uri,
      did: typed.did,
      name: typed.name,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { TemplateCompositionDocumentMapper };
