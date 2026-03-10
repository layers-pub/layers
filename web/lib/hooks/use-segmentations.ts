/**
 * TanStack Query hooks for segmentation records.
 *
 * @remarks
 * Segmentations define token boundaries for expressions. They change
 * infrequently after creation, so a 60-second stale time is appropriate.
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

import { segmentationKeys } from './keys';

/** Stale time for segmentation queries (60 seconds). */
const SEGMENTATION_STALE_TIME = 60_000;

/**
 * Segmentation record shape.
 */
type Segmentation = components['schemas']['SegmentationGetSegmentationOutput'];

/**
 * Paginated response for segmentation lists.
 */
type SegmentationListResponse = components['schemas']['SegmentationListSegmentationsOutput'];

/**
 * Fetches a single segmentation from the API.
 */
async function fetchSegmentation(uri: string): Promise<Segmentation> {
  const { data, error } = await api.GET('/xrpc/pub.layers.segmentation.getSegmentation', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch segmentation: ${uri}`,
      undefined,
      '/xrpc/pub.layers.segmentation.getSegmentation',
    );
  }

  return data;
}

/**
 * Fetches a paginated list of segmentations from the API.
 */
async function fetchSegmentations(filters: {
  expression: string;
  limit?: number;
  cursor?: string;
}): Promise<SegmentationListResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.segmentation.listSegmentations', {
    params: { query: filters },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch segmentations',
      undefined,
      '/xrpc/pub.layers.segmentation.listSegmentations',
    );
  }

  return data;
}

/**
 * Fetches a single segmentation by AT-URI.
 *
 * @param uri - AT-URI of the segmentation record
 * @returns query result containing the segmentation, or an error
 */
function useSegmentation(uri: string) {
  return useQuery({
    queryKey: segmentationKeys.detail(uri),
    queryFn: () => fetchSegmentation(uri),
    enabled: Boolean(uri),
    staleTime: SEGMENTATION_STALE_TIME,
  });
}

/**
 * Fetches a paginated list of segmentations with optional filters.
 *
 * @param filters - query parameters (e.g., repo, expressionUri, limit, cursor)
 * @returns query result containing the segmentation list
 */
function useSegmentations(filters: { expression: string; limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: segmentationKeys.list(filters),
    queryFn: () => fetchSegmentations(filters),
    staleTime: SEGMENTATION_STALE_TIME,
  });
}

/**
 * Convenience wrapper to fetch segmentations for a specific expression.
 *
 * @param expressionUri - AT-URI of the expression
 * @param repo - DID of the repository owner
 * @returns query result containing segmentations for the expression
 */
function useSegmentationsByExpression(expressionUri: string) {
  return useSegmentations({ expression: expressionUri });
}

export type { Segmentation, SegmentationListResponse };
export { useSegmentation, useSegmentations, useSegmentationsByExpression };
