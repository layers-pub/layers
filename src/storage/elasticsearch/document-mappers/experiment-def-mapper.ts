/**
 * Document mapper for transforming experiment definition rows into Elasticsearch documents.
 *
 * @module
 */

import type { IDocumentMapper } from '../document-mapper.js';
import type { ExperimentDefRow } from '../../../types/experiment-def.js';

/**
 * Maps an {@link ExperimentDefRow} to a flat Elasticsearch document
 * matching the `experiment_defs` index mapping.
 *
 * Includes text fields for name and description (searchable) plus
 * keyword fields for measure and task_type (filterable).
 */
class ExperimentDefDocumentMapper implements IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown> {
    const typed = row as unknown as ExperimentDefRow;
    return {
      uri: typed.uri,
      did: typed.did,
      name: typed.name,
      description: typed.record?.description ?? null,
      measure: typed.measure,
      task_type: typed.task_type,
      indexed_at:
        typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at,
    };
  }
}

export { ExperimentDefDocumentMapper };
