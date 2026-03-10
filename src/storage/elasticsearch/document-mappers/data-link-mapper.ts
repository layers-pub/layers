/**
 * Document mapper for transforming data link rows into Elasticsearch documents.
 *
 * Data links have a minimal ES presence (keyword fields only) because they
 * have no search endpoint.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { DataLinkRow } from '../../../types/data-link.js';

/**
 * Maps a {@link DataLinkRow} to a flat Elasticsearch document
 * matching the `data_links` index mapping.
 */
class DataLinkDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as DataLinkRow;

    return {
      uri: typed.uri,
      did: typed.did,
      eprint_ref: typed.eprint_ref,
      corpus_ref: typed.corpus_ref,
      link_type: typed.link_type,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { DataLinkDocumentMapper };
