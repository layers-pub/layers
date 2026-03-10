/**
 * Collection membership repository extending {@link BaseRepository}.
 *
 * Collection memberships have no search endpoint; they are accessed via their
 * parent collection or entry. This repository provides only the standard get,
 * list, index, and delete operations inherited from the base class.
 *
 * @module
 */

import type {
  CollectionMembershipRecord,
  CollectionMembershipRow,
} from '../../types/collection-membership.js';
import { toCollectionMembershipView } from '../../types/collection-membership.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the collection membership record type.
 */
const collectionMembershipRepoConfig: RecordTypeConfig<CollectionMembershipRecord> = {
  collection: 'pub.layers.resource.collectionMembership',
  table: 'collection_memberships',
  esIndex: 'collection_memberships',
  neo4jLabel: 'Resource',
  resourceName: 'CollectionMembership',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      collection_ref: record.collectionRef,
      entry_ref: record.entryRef,
      ordinal: record.ordinal ?? null,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      collectionRef: record.collectionRef,
      entryRef: record.entryRef,
    };
  },

  extractEdges(_uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    // Entry -> MEMBER_OF -> Collection
    if (record.entryRef && record.collectionRef) {
      edges.push({ from: record.entryRef, to: record.collectionRef, type: 'MEMBER_OF' });
    }

    return edges;
  },
};

/**
 * Contract for collection membership data access operations.
 */
interface ICollectionMembershipsRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: CollectionMembershipRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<CollectionMembershipRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ rows: CollectionMembershipRow[]; cursor?: string | undefined }, DatabaseError>
  >;
}

/**
 * Collection membership repository extending the generic base.
 *
 * No search method is needed; collection memberships are discovered through
 * their parent collection or entry.
 */
class CollectionMembershipsRepository
  extends BaseRepository<CollectionMembershipRecord, CollectionMembershipRow>
  implements ICollectionMembershipsRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, collectionMembershipRepoConfig);
  }
}

export {
  CollectionMembershipsRepository,
  collectionMembershipRepoConfig,
  toCollectionMembershipView,
};
export type { ICollectionMembershipsRepository };
