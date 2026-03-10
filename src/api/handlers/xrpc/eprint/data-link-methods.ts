/**
 * XRPC method map for data link endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Data links have no search endpoint.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import { getDataLinkParamsSchema, listDataLinksParamsSchema } from '../../../../types/data-link.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all data link endpoints.
 */
function dataLinkMethods(): XRPCMethodMap {
  return {
    'pub.layers.eprint.getDataLink': {
      handler: createGetHandler('DataLinkService', getDataLinkParamsSchema),
      auth: 'none',
    },
    'pub.layers.eprint.listDataLinks': {
      handler: createListHandler('DataLinkService', listDataLinksParamsSchema),
      auth: 'none',
    },
  };
}

export { dataLinkMethods };
