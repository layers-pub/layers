/**
 * TanStack Query hooks for sidecar API calls in the /design section.
 *
 * @remarks
 * Sidecar endpoints handle compute-intensive operations (CSP solving, MLM
 * generation) and external resource queries that run outside the main
 * appview process. These hooks use the REST API client rather than XRPC.
 *
 * @packageDocumentation
 */

import { useMutation, useQuery } from '@tanstack/react-query';

import { getBaseUrl } from '@/lib/api/client';
import { APIError } from '@/lib/errors';

import { sidecarKeys } from './keys';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Stale time for sidecar resource queries (60 seconds). */
const SIDECAR_RESOURCE_STALE_TIME = 60_000;

// =============================================================================
// TYPES
// =============================================================================

/** A resource returned by the sidecar resource endpoint. */
interface SidecarResource {
  id: string;
  label: string;
  description?: string;
  source: string;
  features?: Record<string, unknown>;
}

/** Response from the sidecar resource listing endpoint. */
interface SidecarResourceResponse {
  resources: SidecarResource[];
  cursor?: string;
  total?: number;
}

/** Parameters for a CSP filling computation. */
interface CSPFillParams {
  templateRef: string;
  collectionRefs: string[];
  constraints?: Array<{
    expression: string;
    expressionFormat?: string;
  }>;
  maxSolutions?: number;
}

/** Result of a CSP filling computation. */
interface CSPFillResult {
  fillings: Array<{
    slotFillings: Array<{
      slotName: string;
      entryRef?: string;
      literalValue?: string;
    }>;
    renderedText: string;
  }>;
  totalFound: number;
  solveTimeMs: number;
}

/** Parameters for an MLM filling computation. */
interface MLMFillParams {
  templateRef: string;
  collectionRefs: string[];
  modelName?: string;
  numCandidates?: number;
  temperature?: number;
}

/** Result of an MLM filling computation. */
interface MLMFillResult {
  fillings: Array<{
    slotFillings: Array<{
      slotName: string;
      entryRef?: string;
      literalValue?: string;
    }>;
    renderedText: string;
    score: number;
  }>;
  modelName: string;
  generateTimeMs: number;
}

/** Parameters for a jsPsych experiment preview. */
interface ExperimentPreviewParams {
  experimentRef: string;
  fillingRefs: string[];
  maxTrials?: number;
}

/** Result of a jsPsych experiment preview. */
interface ExperimentPreviewResult {
  timeline: unknown[];
  estimatedDurationMs: number;
  trialCount: number;
}

// =============================================================================
// FETCH HELPERS
// =============================================================================

async function fetchSidecarResources(
  source: string,
  filters: Record<string, unknown>,
): Promise<SidecarResourceResponse> {
  const baseUrl = getBaseUrl();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value != null) {
      params.set(key, String(value));
    }
  }

  const url = `${baseUrl}/api/v1/design/resources/${encodeURIComponent(source)}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new APIError(
      `Failed to fetch sidecar resources from ${source}`,
      response.status,
      `/api/v1/design/resources/${source}`,
    );
  }

  return (await response.json()) as SidecarResourceResponse;
}

async function postSidecarCompute<TParams, TResult>(
  endpoint: string,
  params: TParams,
  authToken?: string,
): Promise<TResult> {
  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new APIError(`Sidecar compute failed: ${text}`, response.status, endpoint);
  }

  return (await response.json()) as TResult;
}

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetches external resources from a sidecar data source.
 *
 * @param source - data source identifier (e.g., "wordnet", "framenet")
 * @param filters - source-specific query parameters
 * @returns query result containing the resource list
 */
function useSidecarResourceQuery(source: string, filters: Record<string, unknown>) {
  return useQuery({
    queryKey: sidecarKeys.resource(source, filters),
    queryFn: () => fetchSidecarResources(source, filters),
    enabled: Boolean(source),
    staleTime: SIDECAR_RESOURCE_STALE_TIME,
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Runs a CSP (constraint satisfaction problem) solver to generate template
 * fillings that satisfy all slot and cross-slot constraints.
 *
 * @param authToken - optional bearer token for authenticated sidecar calls
 */
function useSidecarCSPFill(authToken?: string) {
  return useMutation<CSPFillResult, APIError, CSPFillParams>({
    mutationFn: (params) =>
      postSidecarCompute<CSPFillParams, CSPFillResult>(
        '/api/v1/design/compute/csp',
        params,
        authToken,
      ),
  });
}

/**
 * Runs a masked language model to generate template fillings by predicting
 * plausible slot values from context.
 *
 * @param authToken - optional bearer token for authenticated sidecar calls
 */
function useSidecarMLMFill(authToken?: string) {
  return useMutation<MLMFillResult, APIError, MLMFillParams>({
    mutationFn: (params) =>
      postSidecarCompute<MLMFillParams, MLMFillResult>(
        '/api/v1/design/compute/mlm',
        params,
        authToken,
      ),
  });
}

/**
 * Generates a jsPsych experiment preview from an experiment definition
 * and a set of fillings.
 *
 * @param authToken - optional bearer token for authenticated sidecar calls
 */
function useSidecarExperimentPreview(authToken?: string) {
  return useMutation<ExperimentPreviewResult, APIError, ExperimentPreviewParams>({
    mutationFn: (params) =>
      postSidecarCompute<ExperimentPreviewParams, ExperimentPreviewResult>(
        '/api/v1/design/preview/jspsych',
        params,
        authToken,
      ),
  });
}

export type {
  SidecarResource,
  SidecarResourceResponse,
  CSPFillParams,
  CSPFillResult,
  MLMFillParams,
  MLMFillResult,
  ExperimentPreviewParams,
  ExperimentPreviewResult,
};
export {
  useSidecarResourceQuery,
  useSidecarCSPFill,
  useSidecarMLMFill,
  useSidecarExperimentPreview,
};
