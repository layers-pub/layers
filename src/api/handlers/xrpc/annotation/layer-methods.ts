/**
 * XRPC method map for annotation layer endpoints.
 *
 * Uses handler factories to eliminate per-endpoint boilerplate.
 * Annotation layers have no search endpoint at this level.
 *
 * @module
 */

import type { XRPCMethodMap } from '../../../xrpc/types.js';
import {
  getAnnotationLayerParamsSchema,
  listAnnotationLayersParamsSchema,
} from '../../../../types/annotation-layer.js';
import { createGetHandler, createListHandler } from '../handler-factories.js';

/**
 * Returns the XRPC method map for all annotation layer endpoints.
 */
function annotationLayerMethods(): XRPCMethodMap {
  return {
    'pub.layers.annotation.getAnnotationLayer': {
      handler: createGetHandler('AnnotationLayerService', getAnnotationLayerParamsSchema),
      auth: 'none',
    },
    'pub.layers.annotation.listAnnotationLayers': {
      handler: createListHandler('AnnotationLayerService', listAnnotationLayersParamsSchema),
      auth: 'none',
    },
  };
}

export { annotationLayerMethods };
