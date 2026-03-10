/**
 * XRPC method map for alignment endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Alignments have no search endpoint.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getAlignmentParamsSchema,
  listAlignmentsParamsSchema,
} from '../../../../types/alignment.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all alignment endpoints.
 */
function alignmentMethods(): XRPCMethodMap {
  return {
    'pub.layers.alignment.getAlignment': {
      handler: createGetHandler('AlignmentService', getAlignmentParamsSchema),
      auth: 'none',
    },
    'pub.layers.alignment.listAlignments': {
      handler: createListHandler('AlignmentService', listAlignmentsParamsSchema),
      auth: 'none',
    },
  };
}

export { alignmentMethods };
