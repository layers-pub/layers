/**
 * Template repository extending {@link BaseRepository}.
 *
 * Templates have no search endpoint. This repository provides only the
 * standard get, list, index, and delete operations inherited from the base class.
 *
 * @module
 */

import type { TemplateRecord, TemplateRow } from '../../types/template.js';
import { toTemplateView } from '../../types/template.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the template record type.
 */
const templateRepoConfig: RecordTypeConfig<TemplateRecord> = {
  collection: 'pub.layers.resource.template',
  table: 'templates',
  esIndex: 'templates',
  neo4jLabel: 'Template',
  resourceName: 'Template',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      name: record.name,
      slot_count: record.slots?.length ?? null,
      experiment_ref: record.experimentRef ?? null,
      language: record.language ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      name: record.name,
      language: record.language ?? null,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    if (record.ontologyRef) {
      edges.push({ from: uri, to: record.ontologyRef, type: 'REFERENCES' });
    }

    if (record.experimentRef) {
      edges.push({ from: uri, to: record.experimentRef, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for template data access operations.
 */
interface ITemplatesRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: TemplateRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<TemplateRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: TemplateRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Template repository extending the generic base.
 *
 * No search method is needed; templates are accessed directly by URI or listed
 * by repository DID.
 */
class TemplatesRepository
  extends BaseRepository<TemplateRecord, TemplateRow>
  implements ITemplatesRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, templateRepoConfig);
  }
}

export { TemplatesRepository, templateRepoConfig, toTemplateView };
export type { ITemplatesRepository };
