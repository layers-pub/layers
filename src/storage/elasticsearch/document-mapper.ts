/**
 * Document mappers for transforming database rows into Elasticsearch documents.
 *
 * @module
 */

import type { ExpressionRow } from '../../types/expression.js';

/**
 * Contract for transforming a database row into an Elasticsearch document.
 */
interface IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Maps an {@link ExpressionRow} to a flat Elasticsearch document
 * matching the `expressions` index mapping.
 */
class ExpressionDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as ExpressionRow;
    return {
      uri: typed.uri,
      did: typed.did,
      text: typed.text,
      kind: typed.kind,
      language: typed.language,
      source_url: typed.source_url,
      source_ref: typed.source_ref,
      eprint_ref: typed.eprint_ref,
      parent_ref: typed.parent_ref,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { ExpressionDocumentMapper };
export type { IDocumentMapper };
