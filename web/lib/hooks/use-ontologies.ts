/**
 * TanStack Query hooks for ontology records.
 *
 * @remarks
 * Ontologies change rarely, so a 5-minute stale time is appropriate.
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

import { ontologyKeys } from './keys';

/** Stale time for ontology queries (5 minutes). */
const ONTOLOGY_STALE_TIME = 300_000;

/**
 * Response shape for a single ontology record.
 */
type Ontology = components['schemas']['OntologyGetOntologyOutput'];

/**
 * Paginated response for ontology lists.
 */
type OntologyListResponse = components['schemas']['OntologyListOntologiesOutput'];

/**
 * Fetches a single ontology from the API.
 */
async function fetchOntology(uri: string): Promise<Ontology> {
  const { data, error } = await api.GET('/xrpc/pub.layers.ontology.getOntology', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch ontology: ${uri}`,
      undefined,
      '/xrpc/pub.layers.ontology.getOntology',
    );
  }

  return data;
}

/**
 * Fetches a paginated list of ontologies from the API.
 */
async function fetchOntologies(filters: {
  repo?: string;
  limit?: number;
  cursor?: string;
  domain?: string;
}): Promise<OntologyListResponse> {
  // repo is optional for global browse; the server returns all records when omitted
  const { data, error } = await api.GET('/xrpc/pub.layers.ontology.listOntologies', {
    params: { query: filters as typeof filters & { repo: string } },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch ontologies',
      undefined,
      '/xrpc/pub.layers.ontology.listOntologies',
    );
  }

  return data;
}

/**
 * Fetches a single ontology by AT-URI.
 *
 * @param uri - AT-URI of the ontology record
 * @returns query result containing the ontology, or an error
 *
 * @example
 * ```tsx
 * function OntologyDetail({ uri }: { uri: string }) {
 *   const { data, isLoading, error } = useOntology(uri);
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorDisplay error={error} />;
 *   return <div>{data?.name}</div>;
 * }
 * ```
 */
function useOntology(uri: string) {
  return useQuery({
    queryKey: ontologyKeys.detail(uri),
    queryFn: () => fetchOntology(uri),
    enabled: Boolean(uri),
    staleTime: ONTOLOGY_STALE_TIME,
  });
}

/**
 * Fetches a paginated list of ontologies with optional filters.
 *
 * @param filters - query parameters for filtering (e.g., repo, cursor, limit)
 * @returns query result containing the ontology list
 *
 * @example
 * ```tsx
 * function OntologyList() {
 *   const { data, isLoading } = useOntologies({ repo: 'did:plc:abc', limit: 25 });
 *   if (isLoading) return <Spinner />;
 *   return (
 *     <ul>
 *       {data?.records.map((o) => (
 *         <li key={o.uri}>{o.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
function useOntologies(filters: { repo?: string; limit?: number; cursor?: string; domain?: string }) {
  return useQuery({
    queryKey: ontologyKeys.list(filters),
    queryFn: () => fetchOntologies(filters),
    staleTime: ONTOLOGY_STALE_TIME,
  });
}

export type { Ontology, OntologyListResponse };
export { useOntology, useOntologies };
