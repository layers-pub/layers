/**
 * XRPC method map for collection membership endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Collection memberships have no search endpoint; they are accessed via their
 * parent collection or entry.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getCollectionMembershipParamsSchema,
  listCollectionMembershipsParamsSchema,
} from '../../../../types/collection-membership.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all collection membership endpoints.
 */
function collectionMembershipMethods(): XRPCMethodMap {
  return {
    'pub.layers.resource.getCollectionMembership': {
      handler: createGetHandler('CollectionMembershipService', getCollectionMembershipParamsSchema),
      auth: 'none',
    },
    'pub.layers.resource.listCollectionMemberships': {
      handler: createListHandler(
        'CollectionMembershipService',
        listCollectionMembershipsParamsSchema,
      ),
      auth: 'none',
    },
  };
}

export { collectionMembershipMethods };
