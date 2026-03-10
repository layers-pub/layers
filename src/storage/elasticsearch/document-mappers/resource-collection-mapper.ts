/**
 * Document mapper for transforming resource collection rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type {
  ResourceCollectionRecord,
  ResourceCollectionRow,
} from '../../../types/resource-collection.js';

/**
 * Maps a {@link ResourceCollectionRow} to a flat Elasticsearch document
 * matching the `resource_collections` index mapping.
 */
class ResourceCollectionDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as ResourceCollectionRow;
    const record = typed.record as ResourceCollectionRecord | undefined;

    return {
      uri: typed.uri,
      did: typed.did,
      name: typed.name,
      kind: typed.kind,
      language: typed.language,
      description: record?.description ?? null,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { ResourceCollectionDocumentMapper };
