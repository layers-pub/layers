/**
 * TanStack Query hooks for annotation layer records.
 *
 * @remarks
 * Annotation layers are the most frequently queried record type alongside
 * expressions. Uses a 30-second stale time because annotation data changes
 * more frequently during active annotation sessions.
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

import { annotationLayerKeys } from './keys';

/** Stale time for annotation layer queries (30 seconds). */
const ANNOTATION_LAYER_STALE_TIME = 30_000;

/**
 * Annotation layer record shape.
 */
type AnnotationLayer = components['schemas']['AnnotationGetAnnotationLayerOutput'];

/**
 * Paginated response for annotation layer lists.
 */
type AnnotationLayerListResponse = components['schemas']['AnnotationListAnnotationLayersOutput'];

/**
 * Fetches a single annotation layer from the API.
 */
async function fetchAnnotationLayer(uri: string): Promise<AnnotationLayer> {
  const { data, error } = await api.GET('/xrpc/pub.layers.annotation.getAnnotationLayer', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch annotation layer: ${uri}`,
      undefined,
      '/xrpc/pub.layers.annotation.getAnnotationLayer',
    );
  }

  return data;
}

/**
 * Fetches a paginated list of annotation layers from the API.
 */
async function fetchAnnotationLayers(filters: {
  expression: string;
  limit?: number;
  cursor?: string;
  kind?: string;
  subkind?: string;
}): Promise<AnnotationLayerListResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.annotation.listAnnotationLayers', {
    params: { query: filters },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch annotation layers',
      undefined,
      '/xrpc/pub.layers.annotation.listAnnotationLayers',
    );
  }

  return data;
}

/**
 * Fetches a single annotation layer by AT-URI.
 *
 * @param uri - AT-URI of the annotation layer record
 * @returns query result containing the annotation layer, or an error
 */
function useAnnotationLayer(uri: string) {
  return useQuery({
    queryKey: annotationLayerKeys.detail(uri),
    queryFn: () => fetchAnnotationLayer(uri),
    enabled: Boolean(uri),
    staleTime: ANNOTATION_LAYER_STALE_TIME,
  });
}

/**
 * Fetches a paginated list of annotation layers with optional filters.
 *
 * @param filters - query parameters (e.g., repo, expressionUri, kind, limit, cursor)
 * @returns query result containing the annotation layer list
 */
function useAnnotationLayers(filters: {
  expression: string;
  limit?: number;
  cursor?: string;
  kind?: string;
  subkind?: string;
}) {
  return useQuery({
    queryKey: annotationLayerKeys.list(filters),
    queryFn: () => fetchAnnotationLayers(filters),
    staleTime: ANNOTATION_LAYER_STALE_TIME,
  });
}

/**
 * Convenience wrapper to fetch annotation layers for a specific expression.
 *
 * @param expressionUri - AT-URI of the expression to fetch layers for
 * @param repo - DID of the repository owner
 * @returns query result containing annotation layers for the expression
 */
function useAnnotationLayersByExpression(expressionUri: string) {
  return useAnnotationLayers({ expression: expressionUri });
}

export type { AnnotationLayer, AnnotationLayerListResponse };
export { useAnnotationLayer, useAnnotationLayers, useAnnotationLayersByExpression };
