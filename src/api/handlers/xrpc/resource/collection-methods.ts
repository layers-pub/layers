/**
 * XRPC method map for resource collection endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getCollectionParamsSchema,
  listCollectionsParamsSchema,
  searchCollectionsParamsSchema,
} from '../../../../types/resource-collection.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all resource collection endpoints.
 */
function resourceCollectionMethods(): XRPCMethodMap {
  return {
    'pub.layers.resource.getCollection': {
      handler: createGetHandler('ResourceCollectionService', getCollectionParamsSchema),
      auth: 'none',
    },
    'pub.layers.resource.listCollections': {
      handler: createListHandler('ResourceCollectionService', listCollectionsParamsSchema),
      auth: 'none',
    },
    'pub.layers.resource.searchCollections': {
      handler: createSearchHandler(
        'ResourceCollectionService',
        searchCollectionsParamsSchema,
        'searchCollections',
      ),
      auth: 'none',
    },
  };
}

export { resourceCollectionMethods };
