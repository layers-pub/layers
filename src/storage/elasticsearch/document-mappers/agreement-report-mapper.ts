/**
 * Document mapper for transforming agreement report rows into Elasticsearch documents.
 *
 * Agreement reports have a minimal ES presence (keyword fields only) because
 * they have no search endpoint.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { AgreementReportRow } from '../../../types/agreement-report.js';

/**
 * Maps an {@link AgreementReportRow} to a flat Elasticsearch document
 * matching the `agreement_reports` index mapping.
 */
class AgreementReportDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as AgreementReportRow;

    return {
      uri: typed.uri,
      did: typed.did,
      experiment_ref: typed.experiment_ref,
      metric: typed.metric,
      score: typed.score,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { AgreementReportDocumentMapper };
