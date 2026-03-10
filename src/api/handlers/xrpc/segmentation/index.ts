/**
 * XRPC method map for segmentation endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Segmentations have no search endpoint; they are accessed via their
 * parent expression.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getSegmentationParamsSchema,
  listSegmentationsParamsSchema,
} from '../../../../types/segmentation.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all segmentation endpoints.
 */
function segmentationMethods(): XRPCMethodMap {
  return {
    'pub.layers.segmentation.getSegmentation': {
      handler: createGetHandler('SegmentationService', getSegmentationParamsSchema),
      auth: 'none',
    },
    'pub.layers.segmentation.listSegmentations': {
      handler: createListHandler('SegmentationService', listSegmentationsParamsSchema),
      auth: 'none',
    },
  };
}

export { segmentationMethods };
