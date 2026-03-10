/**
 * Document mapper for transforming corpus rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { CorpusRecord, CorpusRow } from '../../../types/corpus.js';

/**
 * Maps a {@link CorpusRow} to a flat Elasticsearch document
 * matching the `corpora` index mapping.
 */
class CorpusDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as CorpusRow;
    const record = typed.record as CorpusRecord | undefined;

    return {
      uri: typed.uri,
      did: typed.did,
      name: typed.name,
      description: record?.description ?? null,
      language: typed.language,
      domain: typed.domain,
      license: typed.license,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { CorpusDocumentMapper };
