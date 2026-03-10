/**
 * XRPC method map for graph edge endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * No search endpoint is provided because graph edges are not
 * full-text searchable.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getGraphEdgeParamsSchema,
  listGraphEdgesParamsSchema,
} from '../../../../types/graph-edge.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for graph edge endpoints.
 */
function graphEdgeMethods(): XRPCMethodMap {
  return {
    'pub.layers.graph.getGraphEdge': {
      handler: createGetHandler('GraphEdgeService', getGraphEdgeParamsSchema),
      auth: 'none',
    },
    'pub.layers.graph.listGraphEdges': {
      handler: createListHandler('GraphEdgeService', listGraphEdgesParamsSchema),
      auth: 'none',
    },
  };
}

export { graphEdgeMethods };
