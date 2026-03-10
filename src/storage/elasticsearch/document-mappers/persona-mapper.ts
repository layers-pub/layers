/**
 * Document mapper for transforming persona rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { PersonaRecord, PersonaRow } from '../../../types/persona.js';

/**
 * Maps a {@link PersonaRow} to a flat Elasticsearch document
 * matching the `personas` index mapping.
 */
class PersonaDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as PersonaRow;
    const record = typed.record as PersonaRecord | undefined;

    return {
      uri: typed.uri,
      did: typed.did,
      name: typed.name,
      description: record?.description ?? null,
      domain: typed.domain,
      kind: typed.kind,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { PersonaDocumentMapper };
