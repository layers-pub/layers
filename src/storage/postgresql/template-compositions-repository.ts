/**
 * Template composition repository extending {@link BaseRepository}.
 *
 * Template compositions have no search endpoint. This repository provides only
 * the standard get, list, index, and delete operations inherited from the base
 * class.
 *
 * @module
 */

import type {
  TemplateCompositionRecord,
  TemplateCompositionRow,
} from '../../types/template-composition.js';
import { toTemplateCompositionView } from '../../types/template-composition.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the template composition record type.
 */
const templateCompositionRepoConfig: RecordTypeConfig<TemplateCompositionRecord> = {
  collection: 'pub.layers.resource.templateComposition',
  table: 'template_compositions',
  esIndex: 'template_compositions',
  neo4jLabel: 'Resource',
  resourceName: 'TemplateComposition',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      name: record.name,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, _record) {
    return {
      uri,
      did,
    };
  },

  extractEdges(_uri, _record) {
    return [];
  },
};

/**
 * Contract for template composition data access operations.
 */
interface ITemplateCompositionsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: TemplateCompositionRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<TemplateCompositionRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: TemplateCompositionRow[]; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Template composition repository extending the generic base.
 *
 * No search method is needed; template compositions are accessed directly by URI
 * or listed by repository DID.
 */
class TemplateCompositionsRepository
  extends BaseRepository<TemplateCompositionRecord, TemplateCompositionRow>
  implements ITemplateCompositionsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, templateCompositionRepoConfig);
  }
}

export { TemplateCompositionsRepository, templateCompositionRepoConfig, toTemplateCompositionView };
export type { ITemplateCompositionsRepository };
