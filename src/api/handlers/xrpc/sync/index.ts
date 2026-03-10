/**
 * XRPC method map for sync endpoints.
 *
 * Sync endpoints allow the indexer process to trigger immediate
 * record indexing or deletion via the API server.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import { indexRecordHandler } from './indexRecord.js';
import { deleteRecordHandler } from './deleteRecord.js';

/**
 * Returns the XRPC method map for sync endpoints.
 *
 * Both endpoints require service auth. They are procedures (POST)
 * rather than queries (GET).
 */
function syncMethods(): XRPCMethodMap {
  return {
    'pub.layers.sync.indexRecord': {
      handler: indexRecordHandler,
      auth: 'required',
      type: 'procedure',
    },
    'pub.layers.sync.deleteRecord': {
      handler: deleteRecordHandler,
      auth: 'required',
      type: 'procedure',
    },
  };
}

export { syncMethods };
