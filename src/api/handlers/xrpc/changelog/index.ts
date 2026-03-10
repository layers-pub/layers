/**
 * XRPC method map for changelog endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getChangelogEntryParamsSchema,
  listChangelogEntriesParamsSchema,
  searchChangelogEntriesParamsSchema,
} from '../../../../types/changelog-entry.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all changelog endpoints.
 */
function changelogMethods(): XRPCMethodMap {
  return {
    'pub.layers.changelog.getEntry': {
      handler: createGetHandler('ChangelogService', getChangelogEntryParamsSchema),
      auth: 'none',
    },
    'pub.layers.changelog.listEntries': {
      handler: createListHandler('ChangelogService', listChangelogEntriesParamsSchema),
      auth: 'none',
    },
    'pub.layers.changelog.searchEntries': {
      handler: createSearchHandler(
        'ChangelogService',
        searchChangelogEntriesParamsSchema,
        'searchEntries',
      ),
      auth: 'none',
    },
  };
}

export { changelogMethods };
