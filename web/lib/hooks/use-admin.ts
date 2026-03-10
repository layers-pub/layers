/**
 * TanStack Query hooks for admin panel data.
 *
 * @remarks
 * Admin hooks fetch from REST endpoints (`/api/v1/admin/*`) rather than
 * XRPC endpoints. Uses standard fetch with getBaseUrl() for all requests.
 * Queue depths auto-refresh every 10 seconds to provide near-real-time
 * monitoring.
 *
 * @packageDocumentation
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getBaseUrl } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

// =============================================================================
// QUERY KEY FACTORIES
// =============================================================================

const adminKeys = {
  all: ['admin'] as const,
  dlq: () => [...adminKeys.all, 'dlq'] as const,
  dlqList: (filters: Record<string, unknown>) => [...adminKeys.dlq(), 'list', filters] as const,
  reconciliation: () => [...adminKeys.all, 'reconciliation'] as const,
  health: () => [...adminKeys.all, 'health'] as const,
  queues: () => [...adminKeys.all, 'queues'] as const,
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * A dead letter queue entry representing a failed indexing operation.
 */
type DLQEntry = components['schemas']['DLQEntry'];

/**
 * Paginated response for DLQ entries.
 */
interface DLQListResponse {
  entries: DLQEntry[];
  total: number;
  cursor?: string;
}

/**
 * Reconciliation status comparing record counts across storage backends.
 */
type ReconciliationStatus = components['schemas']['ReconciliationStatus'];

/**
 * System health metrics for the appview.
 */
type SystemHealth = components['schemas']['SystemHealth'];

/**
 * BullMQ queue depth metrics.
 */
type QueueDepth = components['schemas']['QueueDepth'];

// =============================================================================
// FETCH HELPERS
// =============================================================================

async function adminFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new APIError(`Admin API request failed: ${response.statusText}`, response.status, path);
  }

  return response.json() as Promise<T>;
}

async function adminPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new APIError(`Admin API request failed: ${response.statusText}`, response.status, path);
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetches paginated DLQ entries with optional filters.
 *
 * @param filters - query parameters (cursor, limit, collection)
 * @returns query result containing DLQ entries and total count
 */
function useDLQEntries(filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const queryString = params.toString();
  const path = `/api/v1/admin/dlq${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: adminKeys.dlqList(filters),
    queryFn: () => adminFetch<DLQListResponse>(path),
    staleTime: 30_000,
  });
}

/**
 * Retries a specific DLQ entry by re-queuing it for indexing.
 */
function useRetryDLQEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminPost(`/api/v1/admin/dlq/${id}/replay`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.dlq() });
    },
  });
}

/**
 * Dismisses a specific DLQ entry, removing it from the queue.
 */
function useDismissDLQEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${getBaseUrl()}/api/v1/admin/dlq/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new APIError(
          `Failed to dismiss DLQ entry: ${response.statusText}`,
          response.status,
          `/api/v1/admin/dlq/${id}`,
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.dlq() });
    },
  });
}

/**
 * Fetches reconciliation status comparing record counts across backends.
 */
function useReconciliationStatus() {
  return useQuery({
    queryKey: adminKeys.reconciliation(),
    queryFn: () => adminFetch<ReconciliationStatus[]>('/api/v1/admin/reconciliation'),
    staleTime: 60_000,
  });
}

/**
 * Triggers a reconciliation run across all storage backends.
 */
function useRunReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminPost('/api/v1/admin/reconciliation/run'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.reconciliation() });
    },
  });
}

/**
 * Fetches system health metrics.
 */
function useSystemHealth() {
  return useQuery({
    queryKey: adminKeys.health(),
    queryFn: () => adminFetch<SystemHealth>('/api/v1/admin/health'),
    staleTime: 30_000,
  });
}

/**
 * Fetches BullMQ queue depth metrics.
 *
 * @remarks
 * Auto-refreshes every 10 seconds to provide near-real-time queue monitoring.
 */
function useQueueDepths() {
  return useQuery({
    queryKey: adminKeys.queues(),
    queryFn: () => adminFetch<QueueDepth[]>('/api/v1/admin/queues'),
    refetchInterval: 10_000,
  });
}

export type { DLQEntry, DLQListResponse, ReconciliationStatus, SystemHealth, QueueDepth };
export {
  adminKeys,
  useDLQEntries,
  useRetryDLQEntry,
  useDismissDLQEntry,
  useReconciliationStatus,
  useRunReconciliation,
  useSystemHealth,
  useQueueDepths,
};
