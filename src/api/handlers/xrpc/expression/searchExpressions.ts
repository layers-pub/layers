/**
 * XRPC handler for `pub.layers.expression.searchExpressions`.
 *
 * @module
 */

import type { Context } from 'hono';
import type { DependencyContainer } from 'tsyringe';

import { searchExpressionsParamsSchema } from '../../../../types/expression.js';
import type { IExpressionService } from '../../../../services/expression/expression-service.js';

/**
 * Handles GET /xrpc/pub.layers.expression.searchExpressions
 *
 * @param c - the Hono request context
 * @returns a JSON response with search results
 */
async function searchExpressionsHandler(c: Context): Promise<Response> {
  const container = c.get('container') as DependencyContainer;
  const service = container.resolve<IExpressionService>('ExpressionService');

  const parsed = searchExpressionsParamsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: 'InvalidRequest', message: 'Missing or invalid parameters' }, 400);
  }

  const { q, language, kind, limit, cursor } = parsed.data;
  const result = await service.searchExpressions(q, { language, kind }, limit, cursor);
  if (!result.ok) {
    return c.json({ error: result.error.code, message: result.error.message }, 500);
  }

  return c.json(result.value);
}

export { searchExpressionsHandler };
