/**
 * XRPC handler for `pub.layers.sync.deleteRecord`.
 *
 * Accepts a record identifier and routes it to the appropriate service
 * for deletion from all storage backends. Requires service auth (only
 * the indexer process or admin tooling should call this).
 *
 * @module
 */

import type { Context } from 'hono';
import type { DependencyContainer } from 'tsyringe';

import type { LayersError } from '../../../../types/errors.js';
import type { Result } from '../../../../types/result.js';

import { COLLECTION_SERVICE_MAP } from './collection-service-map.js';

/**
 * Minimal service contract for deleting a record.
 */
interface IDeletableService {
  deleteRecord(uri: string): Promise<Result<void, LayersError>>;
}

/**
 * Handles POST /xrpc/pub.layers.sync.deleteRecord
 *
 * Validates the collection NSID, resolves the appropriate service from
 * the DI container, constructs the AT-URI, and calls deleteRecord.
 * Returns `{ success }` on success or an error response on failure.
 *
 * @param c - the Hono request context
 * @returns a JSON response indicating success or failure
 */
async function deleteRecordHandler(c: Context): Promise<Response> {
  const body: {
    did?: string;
    collection?: string;
    rkey?: string;
  } = await c.req.json();

  const { did, collection, rkey } = body;

  if (!did || !collection || !rkey) {
    return c.json(
      {
        error: 'InvalidRequest',
        message: 'Missing required fields: did, collection, rkey',
      },
      400,
    );
  }

  const serviceKey = COLLECTION_SERVICE_MAP.get(collection);
  if (!serviceKey) {
    return c.json(
      {
        error: 'InvalidRequest',
        message: `Unknown collection: ${collection}`,
      },
      400,
    );
  }

  const container = c.get('container') as DependencyContainer;

  let service: IDeletableService;
  try {
    service = container.resolve<IDeletableService>(serviceKey);
  } catch {
    return c.json(
      {
        error: 'ServiceUnavailable',
        message: `Service not available for collection: ${collection}`,
      },
      503,
    );
  }

  const uri = `at://${did}/${collection}/${rkey}`;
  const result = await service.deleteRecord(uri);

  if (!result.ok) {
    return c.json(
      {
        error: result.error.code,
        message: result.error.message,
        success: false,
      },
      500,
    );
  }

  return c.json({ success: true });
}

export { deleteRecordHandler };
