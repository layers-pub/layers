/**
 * XRPC handler for `pub.layers.expression.listExpressions`.
 *
 * @module
 */

import type { Context } from 'hono';
import type { DependencyContainer } from 'tsyringe';

import { listExpressionsParamsSchema } from '../../../../types/expression.js';
import type { IExpressionService } from '../../../../services/expression/expression-service.js';

/**
 * Handles GET /xrpc/pub.layers.expression.listExpressions
 *
 * @param c - the Hono request context
 * @returns a JSON response with paginated expression records
 */
async function listExpressionsHandler(c: Context): Promise<Response> {
  const container = c.get('container') as DependencyContainer;
  const service = container.resolve<IExpressionService>('ExpressionService');

  const parsed = listExpressionsParamsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: 'InvalidRequest', message: 'Missing or invalid parameters' }, 400);
  }

  const result = await service.listByRepo(parsed.data.repo, parsed.data.limit, parsed.data.cursor);
  if (!result.ok) {
    return c.json({ error: result.error.code, message: result.error.message }, 500);
  }

  return c.json(result.value);
}

export { listExpressionsHandler };
