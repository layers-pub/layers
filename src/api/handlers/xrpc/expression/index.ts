/**
 * XRPC method map for expression endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getExpressionParamsSchema,
  listExpressionsParamsSchema,
  searchExpressionsParamsSchema,
} from '../../../../types/expression.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all expression endpoints.
 */
function expressionMethods(): XRPCMethodMap {
  return {
    'pub.layers.expression.getExpression': {
      handler: createGetHandler('ExpressionService', getExpressionParamsSchema),
      auth: 'none',
    },
    'pub.layers.expression.listExpressions': {
      handler: createListHandler('ExpressionService', listExpressionsParamsSchema),
      auth: 'none',
    },
    'pub.layers.expression.searchExpressions': {
      handler: createSearchHandler(
        'ExpressionService',
        searchExpressionsParamsSchema,
        'searchExpressions',
      ),
      auth: 'none',
    },
  };
}

export { expressionMethods };
