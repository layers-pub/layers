/**
 * TanStack Query hooks for corpus records.
 *
 * @remarks
 * Corpora change infrequently, so a 2-minute stale time reduces refetching
 * while keeping data reasonably fresh.
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

import { corpusKeys } from './keys';

/** Stale time for corpus queries (2 minutes). */
const CORPUS_STALE_TIME = 120_000;

/**
 * Response shape for a single corpus record.
 */
type Corpus = components['schemas']['CorpusGetCorpusOutput'];

/**
 * Paginated response for corpus lists.
 */
type CorpusListResponse = components['schemas']['CorpusListCorporaOutput'];

/**
 * Fetches a single corpus from the API.
 */
async function fetchCorpus(uri: string): Promise<Corpus> {
  const { data, error } = await api.GET('/xrpc/pub.layers.corpus.getCorpus', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch corpus: ${uri}`,
      undefined,
      '/xrpc/pub.layers.corpus.getCorpus',
    );
  }

  return data;
}

/**
 * Fetches a paginated list of corpora from the API.
 */
async function fetchCorpora(filters: {
  repo?: string;
  limit?: number;
  cursor?: string;
  domain?: string;
  language?: string;
}): Promise<CorpusListResponse> {
  // repo is optional for global browse; the server returns all records when omitted
  const { data, error } = await api.GET('/xrpc/pub.layers.corpus.listCorpora', {
    params: { query: filters as typeof filters & { repo: string } },
  });

  if (error || !data) {
    throw new APIError('Failed to fetch corpora', undefined, '/xrpc/pub.layers.corpus.listCorpora');
  }

  return data;
}

/**
 * Fetches a single corpus by AT-URI.
 *
 * @param uri - AT-URI of the corpus record
 * @returns query result containing the corpus, or an error
 *
 * @example
 * ```tsx
 * function CorpusDetail({ uri }: { uri: string }) {
 *   const { data, isLoading, error } = useCorpus(uri);
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorDisplay error={error} />;
 *   return <div>{data?.name}</div>;
 * }
 * ```
 */
function useCorpus(uri: string) {
  return useQuery({
    queryKey: corpusKeys.detail(uri),
    queryFn: () => fetchCorpus(uri),
    enabled: Boolean(uri),
    staleTime: CORPUS_STALE_TIME,
  });
}

/**
 * Fetches a paginated list of corpora with optional filters.
 *
 * @param filters - query parameters for filtering (e.g., repo, cursor, limit)
 * @returns query result containing the corpus list
 *
 * @example
 * ```tsx
 * function CorporaList() {
 *   const { data, isLoading } = useCorpora({ repo: 'did:plc:abc', limit: 25 });
 *   if (isLoading) return <Spinner />;
 *   return (
 *     <ul>
 *       {data?.records.map((c) => (
 *         <li key={c.uri}>{c.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
function useCorpora(filters: { repo?: string; limit?: number; cursor?: string; domain?: string; language?: string }) {
  return useQuery({
    queryKey: corpusKeys.list(filters),
    queryFn: () => fetchCorpora(filters),
    staleTime: CORPUS_STALE_TIME,
  });
}

export type { Corpus, CorpusListResponse };
export { useCorpus, useCorpora };
