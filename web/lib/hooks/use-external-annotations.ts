/**
 * TanStack Query hook for fetching external (margin.at) annotations.
 *
 * @remarks
 * Queries the REST endpoint for external annotations correlated with a
 * Layers expression by its source URL. Results include margin.at annotations
 * that target the same resource.
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { APIError } from '@/lib/errors';

import { externalAnnotationKeys } from './keys';

/** Stale time for external annotation queries (30 seconds). */
const EXTERNAL_ANNOTATION_STALE_TIME = 30 * 1000;

/**
 * Source system identifier for external annotations.
 */
type ExternalAnnotationSource = 'margin.at';

/**
 * View model for an external annotation displayed alongside native Layers annotations.
 */
interface ExternalAnnotationView {
  /** Synthetic identifier: `{source}:{did}:{rkey}`. */
  readonly id: string;
  /** The external system that produced this annotation. */
  readonly source: ExternalAnnotationSource;
  /** AT-URI of the original external record. */
  readonly uri: string;
  /** DID of the annotation creator. */
  readonly creatorDid: string;
  /** URL of the annotated resource. */
  readonly targetUrl: string;
  /** The annotation text content. */
  readonly text: string;
  /** Display-friendly motivation label (e.g., 'Comment', 'Highlight', 'Tag'). */
  readonly kind: string;
  /** W3C motivation value from the original record. */
  readonly motivation: string;
  /** Resolved text span anchor, if the selector could be converted. */
  readonly anchor?: {
    readonly type: 'textSpan';
    readonly byteStart: number;
    readonly byteEnd: number;
  };
  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;
  /** MIME format of the body content. */
  readonly format?: string;
}

/**
 * Fetches external annotations for a given source URL.
 */
/**
 * Returns the API base URL for direct fetch calls.
 *
 * This endpoint is not in the OpenAPI schema, so we use plain fetch
 * instead of the typed openapi-fetch client.
 */
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  }
  if (process.env.NEXT_PUBLIC_DEV_MODE === 'tunnel') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
}

async function fetchExternalAnnotations(sourceUrl: string): Promise<ExternalAnnotationView[]> {
  const base = getApiBaseUrl();
  const url = new URL('/api/v1/external-annotations', base);
  url.searchParams.set('url', sourceUrl);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new APIError(
      `Failed to fetch external annotations for URL: ${sourceUrl}`,
      response.status,
      '/api/v1/external-annotations',
    );
  }

  const body = (await response.json()) as { annotations?: ExternalAnnotationView[] };
  return body.annotations ?? [];
}

/**
 * Fetches external annotations correlated with a Layers expression by source URL.
 *
 * Returns an empty array when no source URL is provided (the expression has
 * no external source to correlate against).
 *
 * @param sourceUrl - the source URL of the Layers expression
 * @returns query result containing external annotations
 *
 * @example
 * ```tsx
 * function ExpressionAnnotations({ sourceUrl }: { sourceUrl?: string }) {
 *   const { data, isLoading } = useExternalAnnotations(sourceUrl);
 *   if (!sourceUrl) return null;
 *   if (isLoading) return <Spinner />;
 *   return (
 *     <ul>
 *       {data?.map((ann) => (
 *         <li key={ann.id}>{ann.text}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
function useExternalAnnotations(sourceUrl: string | undefined) {
  return useQuery({
    queryKey: externalAnnotationKeys.list({ url: sourceUrl ?? '' }),
    queryFn: () => fetchExternalAnnotations(sourceUrl!),
    enabled: Boolean(sourceUrl),
    staleTime: EXTERNAL_ANNOTATION_STALE_TIME,
  });
}

export type { ExternalAnnotationView, ExternalAnnotationSource };
export { useExternalAnnotations };
