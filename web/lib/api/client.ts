/**
 * Layers API client using openapi-fetch.
 *
 * @remarks
 * Provides typed API clients for public reads, authenticated requests,
 * and server-side rendering with Next.js caching. All requests go through
 * the Next.js rewrite proxy at `/xrpc/...`.
 *
 * @packageDocumentation
 */

import createClient, { type Middleware } from 'openapi-fetch';

import { events } from '@/lib/observability/custom-events';

import type { paths } from './schema.generated';

// =============================================================================
// REQUEST CORRELATION
// =============================================================================

/**
 * Generates a unique request ID for correlation across services.
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Check if we are running in tunnel mode (ngrok for local OAuth).
 */
const isTunnelMode =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEV_MODE === 'tunnel';

/**
 * Returns the base URL for API requests.
 *
 * On the server, reads NEXT_PUBLIC_API_URL (falls back to localhost:3001).
 * In the browser with tunnel mode, returns the current origin so requests
 * go through the Next.js rewrite proxy (avoids CORS with ngrok).
 * Otherwise, returns the configured API URL.
 */
function getBaseUrl(): string {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  }

  if (isTunnelMode) {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Middleware that adds a request ID header to every outgoing request.
 */
const requestIdMiddleware: Middleware = {
  async onRequest({ request }) {
    request.headers.set('X-Request-ID', generateRequestId());

    if (isTunnelMode) {
      request.headers.set('Bypass-Tunnel-Reminder', 'true');
    }

    return request;
  },
};

/**
 * Middleware that injects an Authorization header from the current session.
 *
 * @remarks
 * The auth token retrieval is deferred to avoid importing auth modules
 * in contexts where authentication is not needed. Callers must register
 * a token provider via `setAuthTokenProvider` before using `authApi`.
 */
let authTokenProvider: (() => Promise<string | null>) | null = null;

/**
 * Registers the function used to retrieve the current auth token.
 * Call this once during app initialization with your OAuth session logic.
 *
 * @param provider - async function returning the bearer token, or null if unauthenticated
 */
function setAuthTokenProvider(provider: () => Promise<string | null>): void {
  authTokenProvider = provider;
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (typeof window === 'undefined') return request;
    if (!authTokenProvider) return request;

    const token = await authTokenProvider();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }

    return request;
  },
};

/**
 * Middleware that tracks API call latency via observability events.
 */
const timingMiddleware: Middleware = {
  async onRequest({ request }) {
    // Store the start time as a custom header (stripped before fetch)
    request.headers.set('X-Timing-Start', String(performance.now()));
    return request;
  },
  async onResponse({ request, response }) {
    const startStr = request.headers.get('X-Timing-Start');
    if (startStr) {
      const durationMs = Math.round(performance.now() - Number(startStr));
      const url = new URL(request.url);
      events.timing('api_call', durationMs, { endpoint: url.pathname });
    }
    return response;
  },
};

// =============================================================================
// API CLIENTS
// =============================================================================

/**
 * Public API client for unauthenticated requests.
 *
 * @example
 * ```typescript
 * const { data, error } = await api.GET('/xrpc/pub.layers.expression.getExpression', {
 *   params: { query: { uri: 'at://did:plc:abc/pub.layers.expression.expression/123' } },
 * });
 * ```
 */
const api = createClient<paths>({ baseUrl: getBaseUrl() });
api.use(requestIdMiddleware);
api.use(timingMiddleware);

/**
 * Authenticated API client for requests requiring user authentication.
 *
 * @remarks
 * Before using this client, call `setAuthTokenProvider` with a function
 * that returns the current bearer token from the OAuth session.
 *
 * @example
 * ```typescript
 * const { data, error } = await authApi.POST('/xrpc/pub.layers.sync.indexRecord', {
 *   body: { uri: 'at://did:plc:abc/pub.layers.expression.expression/123' },
 * });
 * ```
 */
const authApi = createClient<paths>({ baseUrl: getBaseUrl() });
authApi.use(requestIdMiddleware);
authApi.use(authMiddleware);
authApi.use(timingMiddleware);

/**
 * Creates a server-side API client with Next.js caching.
 *
 * @param options.revalidate - seconds to cache responses (default: 60)
 * @returns a typed openapi-fetch client configured for RSC data fetching
 *
 * @example
 * ```typescript
 * // In a React Server Component
 * const serverApi = createServerClient({ revalidate: 30 });
 * const { data } = await serverApi.GET('/xrpc/pub.layers.expression.getExpression', {
 *   params: { query: { uri } },
 * });
 * ```
 */
function createServerClient(options?: { revalidate?: number }) {
  const revalidate = options?.revalidate ?? 60;

  const client = createClient<paths>({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001',
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, {
        ...init,
        next: { revalidate },
      } as RequestInit),
  });

  client.use(requestIdMiddleware);
  return client;
}

export { api, authApi, createServerClient, getBaseUrl, setAuthTokenProvider };
