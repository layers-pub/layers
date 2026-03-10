/**
 * TanStack Query hooks for cross-reference records.
 *
 * @remarks
 * Cross-references use the REST endpoint `GET /api/v1/references` rather
 * than XRPC, so fetch calls use the base URL directly instead of
 * the openapi-fetch client.
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { getBaseUrl } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

import { crossReferenceKeys } from './keys';

/** Stale time for cross-reference queries (60 seconds). */
const CROSS_REFERENCE_STALE_TIME = 60_000;

/**
 * A single cross-reference between two records.
 */
type CrossReference = components['schemas']['CrossReference'];

/**
 * Paginated response for cross-reference lists.
 */
interface CrossReferenceListResponse {
  references: CrossReference[];
  cursor?: string;
}

/**
 * Fetches cross-references pointing to a target URI.
 *
 * @remarks
 * Uses the REST endpoint because cross-references are a composite query
 * that spans multiple record types, not a single XRPC method.
 */
async function fetchCrossReferences(targetUri: string): Promise<CrossReferenceListResponse> {
  const baseUrl = getBaseUrl();
  const url = new URL('/api/v1/references', baseUrl);
  url.searchParams.set('target', targetUri);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new APIError(
      `Failed to fetch cross-references for: ${targetUri}`,
      response.status,
      '/api/v1/references',
    );
  }

  const data = (await response.json()) as CrossReferenceListResponse;
  return data;
}

/**
 * Fetches cross-references pointing to a given target URI.
 *
 * @param targetUri - AT-URI of the target record
 * @returns query result containing the cross-reference list
 *
 * @example
 * ```tsx
 * function References({ uri }: { uri: string }) {
 *   const { data, isLoading } = useCrossReferences(uri);
 *   if (isLoading) return <Skeleton />;
 *   return (
 *     <ul>
 *       {data?.references.map((ref) => (
 *         <li key={ref.uri}>{ref.sourceUri}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
function useCrossReferences(targetUri: string) {
  return useQuery({
    queryKey: crossReferenceKeys.list({ target: targetUri }),
    queryFn: () => fetchCrossReferences(targetUri),
    enabled: Boolean(targetUri),
    staleTime: CROSS_REFERENCE_STALE_TIME,
  });
}

export type { CrossReference, CrossReferenceListResponse };
export { useCrossReferences };
