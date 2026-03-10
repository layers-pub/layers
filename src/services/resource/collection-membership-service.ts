/**
 * Collection membership business logic layer.
 *
 * Extends {@link BaseRecordService} with no additional methods.
 * Collection memberships have no search endpoint; they are accessed via their
 * parent collection or entry. All common operations (get, list, index, delete,
 * caching) are inherited from the base class.
 *
 * @module
 */

import type { Redis } from 'ioredis';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import {
  type CollectionMembershipRecord,
  type CollectionMembershipRow,
  type CollectionMembershipView,
  collectionMembershipRecordSchema,
  toCollectionMembershipView,
} from '../../types/collection-membership.js';
import type { LayersError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import { BaseRecordService, type RecordServiceConfig } from '../base-record-service.js';
import type { CollectionMembershipsRepository } from '../../storage/postgresql/collection-memberships-repository.js';

/**
 * Service configuration for collection memberships.
 */
const collectionMembershipServiceConfig: RecordServiceConfig<
  CollectionMembershipRecord,
  CollectionMembershipRow,
  CollectionMembershipView
> = {
  resourceName: 'CollectionMembership',
  recordSchema: collectionMembershipRecordSchema,
  toView: toCollectionMembershipView,
};

/**
 * Contract for collection membership service operations.
 */
interface ICollectionMembershipService {
  getByUri(uri: string): Promise<Result<CollectionMembershipView, LayersError>>;

  listByRepo(
    repo: string,
    limit: number,
    cursor?: string,
  ): Promise<
    Result<{ records: CollectionMembershipView[]; cursor?: string | undefined }, LayersError>
  >;

  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;

  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Dependencies for constructing a {@link CollectionMembershipService}.
 */
interface CollectionMembershipServiceDeps {
  readonly repository: CollectionMembershipsRepository;
  readonly redis: Redis;
  readonly logger?: ILogger | undefined;
}

/**
 * Collection membership service extending the generic base.
 *
 * No search method is needed; collection memberships are discovered through
 * their parent collection or entry.
 */
class CollectionMembershipService
  extends BaseRecordService<
    CollectionMembershipRecord,
    CollectionMembershipRow,
    CollectionMembershipView
  >
  implements ICollectionMembershipService
{
  declare protected readonly repository: CollectionMembershipsRepository;

  constructor(deps: CollectionMembershipServiceDeps) {
    super(
      { repository: deps.repository, redis: deps.redis, logger: deps.logger },
      collectionMembershipServiceConfig,
    );
  }
}

export { CollectionMembershipService };
export type { ICollectionMembershipService };
