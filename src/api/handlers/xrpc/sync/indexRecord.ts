/**
 * XRPC handler for `pub.layers.sync.indexRecord`.
 *
 * Accepts a record payload and routes it to the appropriate service
 * for immediate indexing. Requires service auth (only the indexer
 * process or admin tooling should call this).
 *
 * @module
 */

import type { Context } from 'hono';
import type { DependencyContainer } from 'tsyringe';

import type { LayersError } from '../../../../types/errors.js';
import { ValidationError } from '../../../../types/errors.js';
import type { Result } from '../../../../types/result.js';

import { COLLECTION_SERVICE_MAP } from './collection-service-map.js';

/**
 * Minimal service contract for indexing a record.
 */
interface IIndexableService {
  indexRecord(did: string, rkey: string, record: unknown): Promise<Result<void, LayersError>>;
}

/**
 * Handles POST /xrpc/pub.layers.sync.indexRecord
 *
 * Validates the collection NSID, resolves the appropriate service from
 * the DI container, and calls indexRecord. Returns `{ success, uri }`
 * on success or an error response on failure.
 *
 * @param c - the Hono request context
 * @returns a JSON response indicating success or failure
 */
async function indexRecordHandler(c: Context): Promise<Response> {
  const body: {
    did?: string;
    collection?: string;
    rkey?: string;
    record?: unknown;
  } = await c.req.json();

  const { did, collection, rkey, record } = body;

  if (!did || !collection || !rkey || record === undefined) {
    return c.json(
      {
        error: 'InvalidRequest',
        message: 'Missing required fields: did, collection, rkey, record',
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

  let service: IIndexableService;
  try {
    service = container.resolve<IIndexableService>(serviceKey);
  } catch {
    return c.json(
      {
        error: 'ServiceUnavailable',
        message: `Service not available for collection: ${collection}`,
      },
      503,
    );
  }

  const result = await service.indexRecord(did, rkey, record);

  if (!result.ok) {
    const error = result.error;
    const status = error instanceof ValidationError ? 400 : 500;
    return c.json(
      {
        error: error.code,
        message: error.message,
        success: false,
      },
      status,
    );
  }

  const uri = `at://${did}/${collection}/${rkey}`;
  return c.json({ success: true, uri });
}

export { indexRecordHandler };
