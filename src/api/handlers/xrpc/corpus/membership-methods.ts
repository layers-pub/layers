/**
 * XRPC method map for corpus membership endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * No search endpoint is provided because corpus memberships are
 * not full-text searchable.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getMembershipParamsSchema,
  listMembershipsParamsSchema,
} from '../../../../types/corpus-membership.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for corpus membership endpoints.
 */
function corpusMembershipMethods(): XRPCMethodMap {
  return {
    'pub.layers.corpus.getMembership': {
      handler: createGetHandler('CorpusMembershipService', getMembershipParamsSchema),
      auth: 'none',
    },
    'pub.layers.corpus.listMemberships': {
      handler: createListHandler('CorpusMembershipService', listMembershipsParamsSchema),
      auth: 'none',
    },
  };
}

export { corpusMembershipMethods };
