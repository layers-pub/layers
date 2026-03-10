/**
 * TanStack Query client factory for Layers.
 *
 * @packageDocumentation
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient instance.
 *
 * Used for both client-side and server-side rendering. Each SSR request
 * should get a fresh client; the browser reuses a singleton (managed by
 * the provider component that calls this factory).
 *
 * @returns a new QueryClient with Layers defaults
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
        refetchOnMount: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export { makeQueryClient };
