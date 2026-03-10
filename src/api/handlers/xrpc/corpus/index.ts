/**
 * XRPC method map for corpus endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getCorpusParamsSchema,
  listCorporaParamsSchema,
  searchCorporaParamsSchema,
} from '../../../../types/corpus.js';
import { createGetHandler, createListHandler, createSearchHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all corpus endpoints.
 */
function corpusMethods(): XRPCMethodMap {
  return {
    'pub.layers.corpus.getCorpus': {
      handler: createGetHandler('CorpusService', getCorpusParamsSchema),
      auth: 'none',
    },
    'pub.layers.corpus.listCorpora': {
      handler: createListHandler('CorpusService', listCorporaParamsSchema),
      auth: 'none',
    },
    'pub.layers.corpus.searchCorpora': {
      handler: createSearchHandler('CorpusService', searchCorporaParamsSchema, 'searchCorpora'),
      auth: 'none',
    },
  };
}

export { corpusMethods };
