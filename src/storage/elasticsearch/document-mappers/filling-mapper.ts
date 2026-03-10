/**
 * Document mapper for transforming filling rows into Elasticsearch documents.
 *
 * Fillings have a minimal ES presence (uri, did, template_ref, expression_ref,
 * strategy, indexed_at) because they have no search endpoint.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { FillingRow } from '../../../types/filling.js';

/**
 * Maps a {@link FillingRow} to a minimal Elasticsearch document
 * matching the `fillings` index mapping.
 */
class FillingDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as FillingRow;

    return {
      uri: typed.uri,
      did: typed.did,
      template_ref: typed.template_ref,
      expression_ref: typed.expression_ref,
      strategy: typed.strategy,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { FillingDocumentMapper };
