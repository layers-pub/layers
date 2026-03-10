/**
 * Document mapper for transforming typeDef rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { TypeDefRecord, TypeDefRow } from '../../../types/type-def.js';

/**
 * Maps a {@link TypeDefRow} to a flat Elasticsearch document
 * matching the `type_defs` index mapping.
 */
class TypeDefDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as TypeDefRow;
    const record = typed.record as TypeDefRecord | undefined;

    return {
      uri: typed.uri,
      did: typed.did,
      name: typed.name,
      ontology_ref: typed.ontology_ref,
      type_kind: typed.type_kind,
      gloss: record?.gloss ?? null,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { TypeDefDocumentMapper };
