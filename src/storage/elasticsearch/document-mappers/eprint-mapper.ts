/**
 * Document mapper for transforming eprint rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { EprintRecord, EprintRow } from '../../../types/eprint.js';

/**
 * Maps an {@link EprintRow} to a flat Elasticsearch document
 * matching the `eprints` index mapping.
 */
class EprintDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as EprintRow;
    const record = typed.record as EprintRecord | undefined;

    return {
      uri: typed.uri,
      did: typed.did,
      eprint_identifier: typed.eprint_identifier,
      eprint_identifier_type: typed.eprint_identifier_type,
      link_type: typed.link_type,
      citation: record?.citation ?? null,
      description: record?.description ?? null,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { EprintDocumentMapper };
