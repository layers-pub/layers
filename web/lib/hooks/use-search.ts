/**
 * TanStack Query hooks for cross-type search.
 *
 * @remarks
 * Search results are volatile, so a 30-second stale time balances freshness
 * with request efficiency. Queries are disabled when the search string is empty.
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components, operations } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

import { searchKeys } from './keys';

/** Stale time for search queries (30 seconds). */
const SEARCH_STALE_TIME = 30_000;

/**
 * A single search result from the cross-type search endpoint.
 */
type SearchResult = components['schemas']['SearchResult'];

/**
 * Response shape for cross-type search.
 */
type SearchResponse = operations['search']['responses']['200']['content']['application/json'];

/**
 * Fetches search results from the REST search endpoint.
 */
async function fetchSearchResults(
  query: string,
  filters: { type?: string; language?: string; limit?: number; cursor?: string },
): Promise<SearchResponse> {
  const { data, error } = await api.GET('/api/v1/search', {
    params: { query: { q: query, ...filters } },
  });

  if (error || !data) {
    throw new APIError(`Search failed for query: ${query}`, undefined, '/api/v1/search');
  }

  return data;
}

/**
 * Searches across all record types with optional filters.
 *
 * @param query - search query string
 * @param filters - additional search filters (e.g., type, language, limit, cursor)
 * @returns query result containing search results with total count and facets
 *
 * @remarks
 * The query is automatically disabled when the search string is empty.
 *
 * @example
 * ```tsx
 * function SearchResults({ query }: { query: string }) {
 *   const { data, isLoading } = useSearch(query, { limit: 20 });
 *   if (isLoading) return <Spinner />;
 *   return (
 *     <div>
 *       <p>{data?.total} results</p>
 *       {data?.results.map((r) => (
 *         <div key={r.uri}>{r.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
function useSearch(
  query: string,
  filters: { type?: string; language?: string; limit?: number; cursor?: string } = {},
) {
  return useQuery({
    queryKey: searchKeys.list({ q: query, ...filters }),
    queryFn: () => fetchSearchResults(query, filters),
    enabled: query.length > 0,
    staleTime: SEARCH_STALE_TIME,
  });
}

export type { SearchResult, SearchResponse };
export { useSearch };
