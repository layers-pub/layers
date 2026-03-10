/**
 * XRPC method map for typeDef endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getTypeDefParamsSchema,
  listTypeDefsParamsSchema,
  searchTypeDefsParamsSchema,
} from '../../../../types/type-def.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all typeDef endpoints.
 */
function typeDefMethods(): XRPCMethodMap {
  return {
    'pub.layers.ontology.getTypeDef': {
      handler: createGetHandler('TypeDefService', getTypeDefParamsSchema),
      auth: 'none',
    },
    'pub.layers.ontology.listTypeDefs': {
      handler: createListHandler('TypeDefService', listTypeDefsParamsSchema),
      auth: 'none',
    },
    'pub.layers.ontology.searchTypeDefs': {
      handler: createSearchHandler('TypeDefService', searchTypeDefsParamsSchema, 'searchTypeDefs'),
      auth: 'none',
    },
  };
}

export { typeDefMethods };
