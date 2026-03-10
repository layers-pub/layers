/**
 * XRPC method map for cluster set endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Cluster sets have no search endpoint.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getClusterSetParamsSchema,
  listClusterSetsParamsSchema,
} from '../../../../types/cluster-set.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all cluster set endpoints.
 */
function clusterSetMethods(): XRPCMethodMap {
  return {
    'pub.layers.annotation.getClusterSet': {
      handler: createGetHandler('ClusterSetService', getClusterSetParamsSchema),
      auth: 'none',
    },
    'pub.layers.annotation.listClusterSets': {
      handler: createListHandler('ClusterSetService', listClusterSetsParamsSchema),
      auth: 'none',
    },
  };
}

export { clusterSetMethods };
