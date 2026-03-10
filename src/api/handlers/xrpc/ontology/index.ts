/**
 * XRPC method map for ontology endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getOntologyParamsSchema,
  listOntologiesParamsSchema,
  searchOntologiesParamsSchema,
} from '../../../../types/ontology.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all ontology endpoints.
 */
function ontologyMethods(): XRPCMethodMap {
  return {
    'pub.layers.ontology.getOntology': {
      handler: createGetHandler('OntologyService', getOntologyParamsSchema),
      auth: 'none',
    },
    'pub.layers.ontology.listOntologies': {
      handler: createListHandler('OntologyService', listOntologiesParamsSchema),
      auth: 'none',
    },
    'pub.layers.ontology.searchOntologies': {
      handler: createSearchHandler(
        'OntologyService',
        searchOntologiesParamsSchema,
        'searchOntologies',
      ),
      auth: 'none',
    },
  };
}

export { ontologyMethods };
