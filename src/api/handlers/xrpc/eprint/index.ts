/**
 * XRPC method map for eprint endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getEprintParamsSchema,
  listEprintsParamsSchema,
  searchEprintsParamsSchema,
} from '../../../../types/eprint.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all eprint endpoints.
 */
function eprintMethods(): XRPCMethodMap {
  return {
    'pub.layers.eprint.getEprint': {
      handler: createGetHandler('EprintService', getEprintParamsSchema),
      auth: 'none',
    },
    'pub.layers.eprint.listEprints': {
      handler: createListHandler('EprintService', listEprintsParamsSchema),
      auth: 'none',
    },
    'pub.layers.eprint.searchEprints': {
      handler: createSearchHandler('EprintService', searchEprintsParamsSchema, 'searchEprints'),
      auth: 'none',
    },
  };
}

export { eprintMethods };
