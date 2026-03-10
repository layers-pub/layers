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
  overview: () => [...adminKeys.all, 'overview'] as const,
  content: (type: string, filters: Record<string, unknown>) =>
    [...adminKeys.all, 'content', type, filters] as const,
  users: (query: string) => [...adminKeys.all, 'users', query] as const,
  userDetail: (did: string) => [...adminKeys.all, 'users', 'detail', did] as const,
  imports: (cursor?: string) => [...adminKeys.all, 'imports', cursor] as const,
  firehose: () => [...adminKeys.all, 'firehose'] as const,
  plugins: () => [...adminKeys.all, 'plugins'] as const,
  searchAnalytics: () => [...adminKeys.all, 'search-analytics'] as const,
  graphStats: () => [...adminKeys.all, 'graph-stats'] as const,
  runtime: () => [...adminKeys.all, 'runtime'] as const,
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

/**
 * Aggregate overview statistics for the admin dashboard.
 */
interface AdminOverview {
  expressionCount: number;
  corporaCount: number;
  ontologyCount: number;
  annotationLayerCount: number;
  activeUsers24h: number;
  importCount: number;
  firehose: {
    cursor: string;
    eventsPerSecond: number;
    dlqCount: number;
    status: 'connected' | 'disconnected' | 'reconnecting';
  };
  queues: {
    totalWaiting: number;
    totalActive: number;
    totalFailed: number;
  };
  databases: {
    postgresql: DatabaseStatus;
    elasticsearch: DatabaseStatus;
    neo4j: DatabaseStatus;
    redis: DatabaseStatus;
  };
}

/**
 * Database connection status for the health bar.
 */
interface DatabaseStatus {
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  connections?: { active: number; idle: number; total: number };
}

/**
 * Detailed health for all four databases.
 */
interface DetailedHealth {
  process: {
    uptime: number;
    memoryRss: number;
    heapUsed: number;
    heapTotal: number;
    nodeVersion: string;
    pid: number;
  };
  databases: {
    postgresql: DatabaseStatus;
    elasticsearch: DatabaseStatus;
    neo4j: DatabaseStatus;
    redis: DatabaseStatus;
  };
}

/**
 * Paginated content listing for admin content management.
 */
interface AdminContentResponse {
  items: AdminContentItem[];
  total: number;
  cursor?: string;
}

/**
 * A single content item in the admin content table.
 */
interface AdminContentItem {
  uri: string;
  did: string;
  createdAt: string;
  collection: string;
}

/**
 * Admin user search result.
 */
interface AdminUser {
  did: string;
  handle: string;
  roles: string[];
  lastActive?: string;
}

/**
 * Detailed user info for admin user management.
 */
interface AdminUserDetail {
  did: string;
  handle: string;
  roles: string[];
  lastActive?: string;
  recordCounts: Record<string, number>;
}

/**
 * An import job record for the imports page.
 */
interface AdminImport {
  id: string;
  format: string;
  fileName: string;
  importerDid: string;
  timestamp: string;
  recordCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * Import list response with cursor-based pagination.
 */
interface AdminImportResponse {
  imports: AdminImport[];
  cursor?: string;
}

/**
 * Firehose status information.
 */
interface FirehoseStatus {
  cursor: string;
  eventsPerSecond: number;
  status: 'connected' | 'disconnected' | 'reconnecting';
  lastEventAt?: string;
  totalEventsProcessed: number;
}

/**
 * Plugin registry entry.
 */
interface AdminPlugin {
  name: string;
  version: string;
  type: 'importer' | 'importing' | 'backlink' | 'search';
  enabled: boolean;
  health: 'healthy' | 'degraded' | 'error';
  description?: string;
}

/**
 * Search analytics data.
 */
interface SearchAnalytics {
  topQueries: Array<{ query: string; count: number; avgLatencyMs: number }>;
  zeroResultQueries: Array<{ query: string; count: number }>;
  totalSearches: number;
  avgLatencyMs: number;
}

/**
 * Neo4j graph statistics.
 */
interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodesByLabel: Record<string, number>;
  edgesByType: Record<string, number>;
}

/**
 * Node.js runtime metrics.
 */
interface RuntimeMetrics {
  nodeVersion: string;
  uptime: number;
  pid: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  cpu: {
    userTime: number;
    systemTime: number;
  };
}

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

async function adminDelete(path: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new APIError(`Admin API request failed: ${response.statusText}`, response.status, path);
  }
}

// =============================================================================
// DLQ HOOKS
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
    mutationFn: (id: string) => adminDelete(`/api/v1/admin/dlq/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.dlq() });
    },
  });
}

/**
 * Retries all DLQ entries matching the current filters.
 */
function useRetryAllDLQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminPost('/api/v1/admin/dlq/replay-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.dlq() });
    },
  });
}

/**
 * Purges all DLQ entries.
 */
function usePurgeDLQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminPost('/api/v1/admin/dlq/purge'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.dlq() });
    },
  });
}

// =============================================================================
// RECONCILIATION HOOKS
// =============================================================================

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

// =============================================================================
// HEALTH HOOKS
// =============================================================================

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
 * Fetches detailed health for all four databases and process info.
 * Auto-refreshes every 10 seconds.
 */
function useDetailedHealth() {
  return useQuery({
    queryKey: [...adminKeys.health(), 'detailed'] as const,
    queryFn: () => adminFetch<DetailedHealth>('/api/v1/admin/health/detailed'),
    refetchInterval: 10_000,
  });
}

// =============================================================================
// QUEUE HOOKS
// =============================================================================

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

// =============================================================================
// OVERVIEW HOOKS
// =============================================================================

/**
 * Fetches aggregate stats for the admin overview dashboard.
 */
function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview(),
    queryFn: () => adminFetch<AdminOverview>('/api/v1/admin/overview'),
    staleTime: 30_000,
  });
}

// =============================================================================
// CONTENT HOOKS
// =============================================================================

/**
 * Fetches paginated content for admin content management.
 *
 * @param type - content type (expressions, corpora, ontologies, annotation-layers)
 * @param filters - query parameters (cursor, limit, search)
 */
function useAdminContent(type: string, filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const queryString = params.toString();
  const path = `/api/v1/admin/content/${type}${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: adminKeys.content(type, filters),
    queryFn: () => adminFetch<AdminContentResponse>(path),
    staleTime: 30_000,
  });
}

// =============================================================================
// USER HOOKS
// =============================================================================

/**
 * Searches admin users by handle or DID.
 *
 * @param query - search query (handle or DID prefix)
 */
function useAdminUsers(query: string) {
  return useQuery({
    queryKey: adminKeys.users(query),
    queryFn: () => adminFetch<AdminUser[]>(`/api/v1/admin/users?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

/**
 * Fetches detailed information for a specific user.
 *
 * @param did - user DID
 */
function useAdminUserDetail(did: string) {
  return useQuery({
    queryKey: adminKeys.userDetail(did),
    queryFn: () => adminFetch<AdminUserDetail>(`/api/v1/admin/users/${encodeURIComponent(did)}`),
    enabled: did.length > 0,
    staleTime: 60_000,
  });
}

/**
 * Assigns a role to a user.
 */
function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ did, role }: { did: string; role: string }) =>
      adminPost(`/api/v1/admin/users/${encodeURIComponent(did)}/roles`, { role }),
    onSuccess: (_data, { did }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(did) });
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

/**
 * Revokes a role from a user.
 */
function useRevokeRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ did, role }: { did: string; role: string }) =>
      adminDelete(
        `/api/v1/admin/users/${encodeURIComponent(did)}/roles/${encodeURIComponent(role)}`,
      ),
    onSuccess: (_data, { did }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(did) });
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

// =============================================================================
// IMPORT HOOKS
// =============================================================================

/**
 * Fetches import job history.
 *
 * @param cursor - pagination cursor
 */
function useAdminImports(cursor?: string) {
  const path = cursor
    ? `/api/v1/admin/imports?cursor=${encodeURIComponent(cursor)}`
    : '/api/v1/admin/imports';

  return useQuery({
    queryKey: adminKeys.imports(cursor),
    queryFn: () => adminFetch<AdminImportResponse>(path),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

// =============================================================================
// FIREHOSE HOOKS
// =============================================================================

/**
 * Fetches firehose status and statistics.
 */
function useAdminFirehose() {
  return useQuery({
    queryKey: adminKeys.firehose(),
    queryFn: () => adminFetch<FirehoseStatus>('/api/v1/admin/firehose'),
    refetchInterval: 10_000,
  });
}

// =============================================================================
// PLUGIN HOOKS
// =============================================================================

/**
 * Fetches the plugin registry list.
 */
function useAdminPlugins() {
  return useQuery({
    queryKey: adminKeys.plugins(),
    queryFn: () => adminFetch<AdminPlugin[]>('/api/v1/admin/plugins'),
    staleTime: 60_000,
  });
}

/**
 * Toggles a plugin's enabled/disabled state.
 */
function useTogglePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      adminPost(`/api/v1/admin/plugins/${encodeURIComponent(name)}/toggle`, { enabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.plugins() });
    },
  });
}

// =============================================================================
// ANALYTICS HOOKS
// =============================================================================

/**
 * Fetches search query analytics.
 */
function useAdminSearchAnalytics() {
  return useQuery({
    queryKey: adminKeys.searchAnalytics(),
    queryFn: () => adminFetch<SearchAnalytics>('/api/v1/admin/search-analytics'),
    staleTime: 60_000,
  });
}

/**
 * Fetches Neo4j graph statistics.
 */
function useAdminGraphStats() {
  return useQuery({
    queryKey: adminKeys.graphStats(),
    queryFn: () => adminFetch<GraphStats>('/api/v1/admin/graph-stats'),
    staleTime: 120_000,
  });
}

/**
 * Fetches Node.js runtime metrics.
 */
function useAdminRuntime() {
  return useQuery({
    queryKey: adminKeys.runtime(),
    queryFn: () => adminFetch<RuntimeMetrics>('/api/v1/admin/runtime'),
    refetchInterval: 10_000,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  DLQEntry,
  DLQListResponse,
  ReconciliationStatus,
  SystemHealth,
  QueueDepth,
  AdminOverview,
  DatabaseStatus,
  DetailedHealth,
  AdminContentResponse,
  AdminContentItem,
  AdminUser,
  AdminUserDetail,
  AdminImport,
  AdminImportResponse,
  FirehoseStatus,
  AdminPlugin,
  SearchAnalytics,
  GraphStats,
  RuntimeMetrics,
};
export {
  adminKeys,
  // DLQ
  useDLQEntries,
  useRetryDLQEntry,
  useDismissDLQEntry,
  useRetryAllDLQ,
  usePurgeDLQ,
  // Reconciliation
  useReconciliationStatus,
  useRunReconciliation,
  // Health
  useSystemHealth,
  useDetailedHealth,
  // Queues
  useQueueDepths,
  // Overview
  useAdminOverview,
  // Content
  useAdminContent,
  // Users
  useAdminUsers,
  useAdminUserDetail,
  useAssignRole,
  useRevokeRole,
  // Imports
  useAdminImports,
  // Firehose
  useAdminFirehose,
  // Plugins
  useAdminPlugins,
  useTogglePlugin,
  // Analytics
  useAdminSearchAnalytics,
  useAdminGraphStats,
  useAdminRuntime,
};
