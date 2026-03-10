/**
 * XRPC method map for graph node endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getGraphNodeParamsSchema,
  listGraphNodesParamsSchema,
  searchGraphNodesParamsSchema,
} from '../../../../types/graph-node.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all graph node endpoints.
 */
function graphNodeMethods(): XRPCMethodMap {
  return {
    'pub.layers.graph.getGraphNode': {
      handler: createGetHandler('GraphNodeService', getGraphNodeParamsSchema),
      auth: 'none',
    },
    'pub.layers.graph.listGraphNodes': {
      handler: createListHandler('GraphNodeService', listGraphNodesParamsSchema),
      auth: 'none',
    },
    'pub.layers.graph.searchGraphNodes': {
      handler: createSearchHandler(
        'GraphNodeService',
        searchGraphNodesParamsSchema,
        'searchGraphNodes',
      ),
      auth: 'none',
    },
  };
}

export { graphNodeMethods };
