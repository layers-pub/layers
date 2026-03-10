/**
 * XRPC method map for cross-reference endpoints.
 *
 * Cross-references are not a standard record type, so these handlers
 * are written manually rather than using handler factories.
 *
 * @module
 */

import type { Context } from 'hono';
import type { DependencyContainer } from 'tsyringe';

import type { ICrossReferencesRepository } from '../../../../storage/postgresql/cross-references-repository.js';
import {
  getForwardRefsParamsSchema,
  getReverseRefsParamsSchema,
  toCrossReferenceView,
} from '../../../../types/cross-reference.js';
import type { XRPCMethodMap } from '../../../xrpc/types.js';

/**
 * Handles GET /xrpc/pub.layers.crossReference.getForwardReferences
 *
 * Returns cross-references originating from the given URI, with
 * keyset pagination via limit and cursor parameters.
 *
 * @param c - the Hono request context
 * @returns a JSON response with forward references and optional cursor
 */
async function getForwardReferencesHandler(c: Context): Promise<Response> {
  const container = c.get('container') as DependencyContainer;
  const repository = container.resolve<ICrossReferencesRepository>('CrossReferencesRepository');

  const parsed = getForwardRefsParamsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: 'InvalidRequest', message: 'Missing or invalid uri parameter' }, 400);
  }

  const { uri, limit, cursor } = parsed.data;
  const result = await repository.getForwardRefs(uri, limit, cursor);
  if (!result.ok) {
    return c.json({ error: result.error.code, message: result.error.message }, 500);
  }

  const refs = result.value.rows.map(toCrossReferenceView);
  return c.json({ refs, cursor: result.value.cursor ?? null });
}

/**
 * Handles GET /xrpc/pub.layers.crossReference.getReverseReferences
 *
 * Returns cross-references pointing to the given URI, with
 * keyset pagination via limit and cursor parameters.
 *
 * @param c - the Hono request context
 * @returns a JSON response with reverse references and optional cursor
 */
async function getReverseReferencesHandler(c: Context): Promise<Response> {
  const container = c.get('container') as DependencyContainer;
  const repository = container.resolve<ICrossReferencesRepository>('CrossReferencesRepository');

  const parsed = getReverseRefsParamsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: 'InvalidRequest', message: 'Missing or invalid uri parameter' }, 400);
  }

  const { uri, limit, cursor } = parsed.data;
  const result = await repository.getReverseRefs(uri, limit, cursor);
  if (!result.ok) {
    return c.json({ error: result.error.code, message: result.error.message }, 500);
  }

  const refs = result.value.rows.map(toCrossReferenceView);
  return c.json({ refs, cursor: result.value.cursor ?? null });
}

/**
 * Returns the XRPC method map for cross-reference endpoints.
 */
function crossReferenceMethods(): XRPCMethodMap {
  return {
    'pub.layers.crossReference.getForwardReferences': {
      handler: getForwardReferencesHandler,
      auth: 'none',
    },
    'pub.layers.crossReference.getReverseReferences': {
      handler: getReverseReferencesHandler,
      auth: 'none',
    },
  };
}

export { crossReferenceMethods };
