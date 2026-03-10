/**
 * XRPC method map for persona endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getPersonaParamsSchema,
  listPersonasParamsSchema,
  searchPersonasParamsSchema,
} from '../../../../types/persona.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all persona endpoints.
 */
function personaMethods(): XRPCMethodMap {
  return {
    'pub.layers.persona.getPersona': {
      handler: createGetHandler('PersonaService', getPersonaParamsSchema),
      auth: 'none',
    },
    'pub.layers.persona.listPersonas': {
      handler: createListHandler('PersonaService', listPersonasParamsSchema),
      auth: 'none',
    },
    'pub.layers.persona.searchPersonas': {
      handler: createSearchHandler('PersonaService', searchPersonasParamsSchema, 'searchPersonas'),
      auth: 'none',
    },
  };
}

export { personaMethods };
