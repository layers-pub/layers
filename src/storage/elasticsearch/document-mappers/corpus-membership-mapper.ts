/**
 * Document mapper for transforming corpus membership rows into Elasticsearch documents.
 *
 * Corpus memberships have a minimal ES index used only for structural lookups,
 * not full-text search.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { CorpusMembershipRow } from '../../../types/corpus-membership.js';

/**
 * Maps a {@link CorpusMembershipRow} to a flat Elasticsearch document
 * matching the `corpus_memberships` index mapping.
 */
class CorpusMembershipDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as CorpusMembershipRow;

    return {
      uri: typed.uri,
      did: typed.did,
      corpus_ref: typed.corpus_ref,
      expression_ref: typed.expression_ref,
      split: typed.split,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { CorpusMembershipDocumentMapper };
