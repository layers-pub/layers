/**
 * TanStack Query hooks for expression records.
 *
 * @remarks
 * Reference implementation for all record-type query hooks. Uses a 60-second
 * stale time because expressions are active annotation targets that benefit
 * from fresh data without excessive refetching.
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

import { expressionKeys } from './keys';

/** Stale time for expression queries (60 seconds). */
const EXPRESSION_STALE_TIME = 60 * 1000;

/**
 * Response shape for a single expression record.
 */
type Expression = components['schemas']['ExpressionGetExpressionOutput'];

/**
 * Paginated response for expression lists.
 */
type ExpressionListResponse = components['schemas']['ExpressionListExpressionsOutput'];

/**
 * Fetches a single expression from the API.
 */
async function fetchExpression(uri: string): Promise<Expression> {
  const { data, error } = await api.GET('/xrpc/pub.layers.expression.getExpression', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch expression: ${uri}`,
      undefined,
      '/xrpc/pub.layers.expression.getExpression',
    );
  }

  return data;
}

/**
 * Fetches a paginated list of expressions from the API.
 */
async function fetchExpressions(filters: {
  repo?: string;
  limit?: number;
  cursor?: string;
  kind?: string;
  language?: string;
  parentRef?: string;
}): Promise<ExpressionListResponse> {
  // repo is optional for global browse; the server returns all records when omitted
  const { data, error } = await api.GET('/xrpc/pub.layers.expression.listExpressions', {
    params: { query: filters as typeof filters & { repo: string } },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch expressions',
      undefined,
      '/xrpc/pub.layers.expression.listExpressions',
    );
  }

  return data;
}

/**
 * Fetches a single expression by AT-URI.
 *
 * @param uri - AT-URI of the expression record
 * @returns query result containing the expression, or an error
 *
 * @example
 * ```tsx
 * function ExpressionDetail({ uri }: { uri: string }) {
 *   const { data, isLoading, error } = useExpression(uri);
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorDisplay error={error} />;
 *   return <div>{data?.text}</div>;
 * }
 * ```
 */
function useExpression(uri: string) {
  return useQuery({
    queryKey: expressionKeys.detail(uri),
    queryFn: () => fetchExpression(uri),
    enabled: Boolean(uri),
    staleTime: EXPRESSION_STALE_TIME,
  });
}

/**
 * Fetches a paginated list of expressions with optional filters.
 *
 * @param filters - query parameters for filtering (e.g., repo, cursor, limit)
 * @returns query result containing the expression list
 *
 * @example
 * ```tsx
 * function ExpressionList() {
 *   const { data, isLoading } = useExpressions({ limit: 25 });
 *   if (isLoading) return <Spinner />;
 *   return (
 *     <ul>
 *       {data?.records.map((expr) => (
 *         <li key={expr.uri}>{expr.text}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
function useExpressions(filters: { repo?: string; limit?: number; cursor?: string; kind?: string; language?: string; parentRef?: string }) {
  return useQuery({
    queryKey: expressionKeys.list(filters),
    queryFn: () => fetchExpressions(filters),
    staleTime: EXPRESSION_STALE_TIME,
  });
}

export type { Expression, ExpressionListResponse };
export { useExpression, useExpressions };
