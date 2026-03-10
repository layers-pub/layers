/**
 * XRPC method map for media endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getMediaParamsSchema,
  listMediaParamsSchema,
  searchMediaParamsSchema,
} from '../../../../types/media.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all media endpoints.
 */
function mediaMethods(): XRPCMethodMap {
  return {
    'pub.layers.media.getMedia': {
      handler: createGetHandler('MediaService', getMediaParamsSchema),
      auth: 'none',
    },
    'pub.layers.media.listMedia': {
      handler: createListHandler('MediaService', listMediaParamsSchema),
      auth: 'none',
    },
    'pub.layers.media.searchMedia': {
      handler: createSearchHandler('MediaService', searchMediaParamsSchema, 'searchMedia'),
      auth: 'none',
    },
  };
}

export { mediaMethods };
