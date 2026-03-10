/**
 * XRPC method map for experiment definition endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getExperimentDefParamsSchema,
  listExperimentDefsParamsSchema,
  searchExperimentDefsParamsSchema,
} from '../../../../types/experiment-def.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all experiment definition endpoints.
 */
function experimentDefMethods(): XRPCMethodMap {
  return {
    'pub.layers.judgment.getExperimentDef': {
      handler: createGetHandler('ExperimentDefService', getExperimentDefParamsSchema),
      auth: 'none',
    },
    'pub.layers.judgment.listExperimentDefs': {
      handler: createListHandler('ExperimentDefService', listExperimentDefsParamsSchema),
      auth: 'none',
    },
    'pub.layers.judgment.searchExperimentDefs': {
      handler: createSearchHandler(
        'ExperimentDefService',
        searchExperimentDefsParamsSchema,
        'searchExperimentDefs',
      ),
      auth: 'none',
    },
  };
}

export { experimentDefMethods };
