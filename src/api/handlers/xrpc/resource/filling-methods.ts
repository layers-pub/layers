/**
 * XRPC method map for filling endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Fillings have no search endpoint.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import { getFillingParamsSchema, listFillingsParamsSchema } from '../../../../types/filling.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all filling endpoints.
 */
function fillingMethods(): XRPCMethodMap {
  return {
    'pub.layers.resource.getFilling': {
      handler: createGetHandler('FillingService', getFillingParamsSchema),
      auth: 'none',
    },
    'pub.layers.resource.listFillings': {
      handler: createListHandler('FillingService', listFillingsParamsSchema),
      auth: 'none',
    },
  };
}

export { fillingMethods };
