/**
 * Document mapper for transforming ontology rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { OntologyRecord, OntologyRow } from '../../../types/ontology.js';

/**
 * Maps an {@link OntologyRow} to a flat Elasticsearch document
 * matching the `ontologies` index mapping.
 */
class OntologyDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as OntologyRow;
    const record = typed.record as OntologyRecord | undefined;

    return {
      uri: typed.uri,
      did: typed.did,
      name: typed.name,
      domain: typed.domain,
      version: typed.version,
      description: record?.description ?? null,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { OntologyDocumentMapper };
