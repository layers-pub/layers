/**
 * XRPC method map for graph edge set endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * No search endpoint is provided because graph edge sets are not
 * full-text searchable.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getGraphEdgeSetParamsSchema,
  listGraphEdgeSetsParamsSchema,
} from '../../../../types/graph-edge-set.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for graph edge set endpoints.
 */
function graphEdgeSetMethods(): XRPCMethodMap {
  return {
    'pub.layers.graph.getGraphEdgeSet': {
      handler: createGetHandler('GraphEdgeSetService', getGraphEdgeSetParamsSchema),
      auth: 'none',
    },
    'pub.layers.graph.listGraphEdgeSets': {
      handler: createListHandler('GraphEdgeSetService', listGraphEdgeSetsParamsSchema),
      auth: 'none',
    },
  };
}

export { graphEdgeSetMethods };
