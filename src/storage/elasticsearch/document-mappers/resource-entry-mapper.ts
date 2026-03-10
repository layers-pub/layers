/**
 * Document mapper for transforming resource entry rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { ResourceEntryRow } from '../../../types/resource-entry.js';

/**
 * Maps a {@link ResourceEntryRow} to a flat Elasticsearch document
 * matching the `resource_entries` index mapping.
 */
class ResourceEntryDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as ResourceEntryRow;

    return {
      uri: typed.uri,
      did: typed.did,
      form: typed.form,
      lemma: typed.lemma,
      language: typed.language,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { ResourceEntryDocumentMapper };
