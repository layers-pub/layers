/**
 * Document mapper for transforming judgment set rows into Elasticsearch documents.
 *
 * Judgment sets have a minimal ES presence (keyword fields only) because
 * they have no search endpoint.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { JudgmentSetRow } from '../../../types/judgment-set.js';

/**
 * Maps a {@link JudgmentSetRow} to a flat Elasticsearch document
 * matching the `judgment_sets` index mapping.
 */
class JudgmentSetDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as JudgmentSetRow;

    return {
      uri: typed.uri,
      did: typed.did,
      experiment_ref: typed.experiment_ref,
      annotator_did: typed.annotator_did,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { JudgmentSetDocumentMapper };
