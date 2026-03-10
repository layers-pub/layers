/**
 * XRPC handler for `pub.layers.expression.getExpression`.
 *
 * @module
 */

import type { Context } from 'hono';
import type { DependencyContainer } from 'tsyringe';

import { getExpressionParamsSchema } from '../../../../types/expression.js';
import type { IExpressionService } from '../../../../services/expression/expression-service.js';

/**
 * Handles GET /xrpc/pub.layers.expression.getExpression
 *
 * @param c - the Hono request context
 * @returns a JSON response with the expression record, or an error
 */
async function getExpressionHandler(c: Context): Promise<Response> {
  const container = c.get('container') as DependencyContainer;
  const service = container.resolve<IExpressionService>('ExpressionService');

  const parsed = getExpressionParamsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: 'InvalidRequest', message: 'Missing or invalid uri parameter' }, 400);
  }

  const result = await service.getByUri(parsed.data.uri);
  if (!result.ok) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
    return c.json({ error: result.error.code, message: result.error.message }, status);
  }

  return c.json(result.value);
}

export { getExpressionHandler };
