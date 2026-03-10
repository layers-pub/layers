/**
 * XRPC method map for judgment set endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Judgment sets have no search endpoint; they are accessed via their
 * parent experiment definition.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getJudgmentSetParamsSchema,
  listJudgmentSetsParamsSchema,
} from '../../../../types/judgment-set.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all judgment set endpoints.
 */
function judgmentSetMethods(): XRPCMethodMap {
  return {
    'pub.layers.judgment.getJudgmentSet': {
      handler: createGetHandler('JudgmentSetService', getJudgmentSetParamsSchema),
      auth: 'none',
    },
    'pub.layers.judgment.listJudgmentSets': {
      handler: createListHandler('JudgmentSetService', listJudgmentSetsParamsSchema),
      auth: 'none',
    },
  };
}

export { judgmentSetMethods };
