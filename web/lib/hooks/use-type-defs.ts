/**
 * TanStack Query hooks for ontology typeDef records.
 *
 * @remarks
 * TypeDefs change rarely, so a 5-minute stale time is appropriate.
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

import { typeDefKeys } from './keys';

/** Stale time for typeDef queries (5 minutes). */
const TYPE_DEF_STALE_TIME = 300_000;

/**
 * Response shape for a single typeDef record.
 */
type TypeDef = components['schemas']['OntologyGetTypeDefOutput'];

/**
 * Paginated response for typeDef lists.
 */
type TypeDefListResponse = components['schemas']['OntologyListTypeDefsOutput'];

/**
 * Fetches a single typeDef from the API.
 */
async function fetchTypeDef(uri: string): Promise<TypeDef> {
  const { data, error } = await api.GET('/xrpc/pub.layers.ontology.getTypeDef', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch typeDef: ${uri}`,
      undefined,
      '/xrpc/pub.layers.ontology.getTypeDef',
    );
  }

  return data;
}

/**
 * Fetches a paginated list of typeDefs from the API.
 */
async function fetchTypeDefs(filters: {
  ontologyRef: string;
  limit?: number;
  cursor?: string;
  typeKind?: string;
}): Promise<TypeDefListResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.ontology.listTypeDefs', {
    params: { query: filters },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch typeDefs',
      undefined,
      '/xrpc/pub.layers.ontology.listTypeDefs',
    );
  }

  return data;
}

/**
 * Fetches a single typeDef by AT-URI.
 *
 * @param uri - AT-URI of the typeDef record
 * @returns query result containing the typeDef, or an error
 *
 * @example
 * ```tsx
 * function TypeDefDetail({ uri }: { uri: string }) {
 *   const { data, isLoading, error } = useTypeDef(uri);
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorDisplay error={error} />;
 *   return <div>{data?.name}</div>;
 * }
 * ```
 */
function useTypeDef(uri: string) {
  return useQuery({
    queryKey: typeDefKeys.detail(uri),
    queryFn: () => fetchTypeDef(uri),
    enabled: Boolean(uri),
    staleTime: TYPE_DEF_STALE_TIME,
  });
}

/**
 * Fetches a paginated list of typeDefs with optional filters.
 *
 * @param filters - query parameters for filtering (e.g., repo, ontologyUri, cursor, limit)
 * @returns query result containing the typeDef list
 *
 * @example
 * ```tsx
 * function TypeDefList() {
 *   const { data, isLoading } = useTypeDefs({ repo: 'did:plc:abc', limit: 50 });
 *   if (isLoading) return <Spinner />;
 *   return (
 *     <ul>
 *       {data?.records.map((td) => (
 *         <li key={td.uri}>{td.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
function useTypeDefs(filters: {
  ontologyRef: string;
  limit?: number;
  cursor?: string;
  typeKind?: string;
}) {
  return useQuery({
    queryKey: typeDefKeys.list(filters),
    queryFn: () => fetchTypeDefs(filters),
    staleTime: TYPE_DEF_STALE_TIME,
  });
}

/**
 * Fetches all typeDefs belonging to a specific ontology.
 *
 * @param ontologyUri - AT-URI of the ontology to filter by
 * @param repo - DID of the repository owner
 * @returns query result containing the typeDef list for that ontology
 *
 * @example
 * ```tsx
 * function OntologyTypeDefs({ ontologyUri, repo }: { ontologyUri: string; repo: string }) {
 *   const { data, isLoading } = useTypeDefsByOntology(ontologyUri, repo);
 *   if (isLoading) return <Spinner />;
 *   return <TypeDefTree typeDefs={data?.records ?? []} />;
 * }
 * ```
 */
function useTypeDefsByOntology(ontologyUri: string) {
  return useTypeDefs({ ontologyRef: ontologyUri });
}

export type { TypeDef, TypeDefListResponse };
export { useTypeDef, useTypeDefs, useTypeDefsByOntology };
