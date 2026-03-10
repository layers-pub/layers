/**
 * XRPC method map for template endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Templates have no search endpoint.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import { getTemplateParamsSchema, listTemplatesParamsSchema } from '../../../../types/template.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all template endpoints.
 */
function templateMethods(): XRPCMethodMap {
  return {
    'pub.layers.resource.getTemplate': {
      handler: createGetHandler('TemplateService', getTemplateParamsSchema),
      auth: 'none',
    },
    'pub.layers.resource.listTemplates': {
      handler: createListHandler('TemplateService', listTemplatesParamsSchema),
      auth: 'none',
    },
  };
}

export { templateMethods };
