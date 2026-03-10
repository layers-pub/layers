/**
 * Data link repository extending {@link BaseRepository}.
 *
 * Data links connect eprints to corpora and other resources. They have no
 * search endpoint; they are accessed by URI or by repository DID.
 *
 * @module
 */

import type { DataLinkRecord, DataLinkRow } from '../../types/data-link.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the data link record type.
 */
const dataLinkRepoConfig: RecordTypeConfig<DataLinkRecord> = {
  collection: 'pub.layers.eprint.dataLink',
  table: 'data_links',
  esIndex: 'data_links',
  neo4jLabel: 'DataLink',
  resourceName: 'DataLink',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      eprint_ref: record.eprintUri,
      corpus_ref: record.corpusRef ?? null,
      link_type: record.dataKind ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      eprintRef: record.eprintUri,
      linkType: record.dataKind ?? null,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    // LINKS_TO edge from this data link to the eprint
    if (record.eprintUri) {
      edges.push({ from: uri, to: record.eprintUri, type: 'LINKS_TO' });
    }

    // REFERENCES edge from this data link to the corpus
    if (record.corpusRef) {
      edges.push({ from: uri, to: record.corpusRef, type: 'REFERENCES' });
    }

    return edges;
  },
};

/**
 * Contract for data link data access operations.
 */
interface IDataLinksRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: DataLinkRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<DataLinkRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: DataLinkRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Data link repository extending the generic base.
 *
 * No search method is needed; data links are discovered through their
 * parent eprint or corpus.
 */
class DataLinksRepository
  extends BaseRepository<DataLinkRecord, DataLinkRow>
  implements IDataLinksRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, dataLinkRepoConfig);
  }
}

export { DataLinksRepository, dataLinkRepoConfig };
export type { IDataLinksRepository };
