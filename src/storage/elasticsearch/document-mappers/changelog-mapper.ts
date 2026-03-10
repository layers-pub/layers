/**
 * Document mapper for transforming changelog entry rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { ChangelogEntryRow } from '../../../types/changelog-entry.js';

/**
 * Maps a {@link ChangelogEntryRow} to a flat Elasticsearch document
 * matching the `changelogs` index mapping.
 */
class ChangelogDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as ChangelogEntryRow;

    return {
      uri: typed.uri,
      did: typed.did,
      subject_uri: typed.subject_uri,
      subject_collection: typed.subject_collection,
      summary: typed.summary,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { ChangelogDocumentMapper };
