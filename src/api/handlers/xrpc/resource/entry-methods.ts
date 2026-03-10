/**
 * XRPC method map for resource entry endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getEntryParamsSchema,
  listEntriesParamsSchema,
  searchEntriesParamsSchema,
} from '../../../../types/resource-entry.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all resource entry endpoints.
 */
function resourceEntryMethods(): XRPCMethodMap {
  return {
    'pub.layers.resource.getEntry': {
      handler: createGetHandler('ResourceEntryService', getEntryParamsSchema),
      auth: 'none',
    },
    'pub.layers.resource.listEntries': {
      handler: createListHandler('ResourceEntryService', listEntriesParamsSchema),
      auth: 'none',
    },
    'pub.layers.resource.searchEntries': {
      handler: createSearchHandler(
        'ResourceEntryService',
        searchEntriesParamsSchema,
        'searchEntries',
      ),
      auth: 'none',
    },
  };
}

export { resourceEntryMethods };
