/**
 * Document mapper for transforming collection membership rows into Elasticsearch documents.
 *
 * Collection memberships have a minimal ES presence (uri, did, collection_ref,
 * entry_ref, ordinal, indexed_at) because they are primarily accessed via their
 * parent collection or entry.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { CollectionMembershipRow } from '../../../types/collection-membership.js';

/**
 * Maps a {@link CollectionMembershipRow} to a minimal Elasticsearch document
 * matching the `collection_memberships` index mapping.
 */
class CollectionMembershipDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as CollectionMembershipRow;

    return {
      uri: typed.uri,
      did: typed.did,
      collection_ref: typed.collection_ref,
      entry_ref: typed.entry_ref,
      ordinal: typed.ordinal,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { CollectionMembershipDocumentMapper };
