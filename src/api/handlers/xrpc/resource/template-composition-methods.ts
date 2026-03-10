/**
 * XRPC method map for template composition endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Template compositions have no search endpoint.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getTemplateCompositionParamsSchema,
  listTemplateCompositionsParamsSchema,
} from '../../../../types/template-composition.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all template composition endpoints.
 */
function templateCompositionMethods(): XRPCMethodMap {
  return {
    'pub.layers.resource.getTemplateComposition': {
      handler: createGetHandler('TemplateCompositionService', getTemplateCompositionParamsSchema),
      auth: 'none',
    },
    'pub.layers.resource.listTemplateCompositions': {
      handler: createListHandler(
        'TemplateCompositionService',
        listTemplateCompositionsParamsSchema,
      ),
      auth: 'none',
    },
  };
}

export { templateCompositionMethods };
