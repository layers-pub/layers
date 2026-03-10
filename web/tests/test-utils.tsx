/**
 * Test utilities for Layers frontend component and hook tests.
 *
 * @remarks
 * Provides a pre-configured QueryClient and render wrapper for testing
 * components that depend on TanStack Query. Uses aggressive cache settings
 * (no retry, no GC, no stale time) to keep tests deterministic.
 *
 * @packageDocumentation
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';

/**
 * Creates a QueryClient configured for testing.
 *
 * @remarks
 * Disables retries, garbage collection, and stale time so that queries
 * behave predictably in tests. Also silences the default error logger
 * to avoid noisy console output during expected error scenarios.
 *
 * @returns a QueryClient suitable for unit tests
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Creates a wrapper component and its associated QueryClient.
 *
 * @remarks
 * Use this when you need direct access to the QueryClient (e.g., to
 * prefill the cache or inspect cache state after a test).
 *
 * @returns object containing the Wrapper component and the queryClient instance
 *
 * @example
 * ```tsx
 * const { Wrapper, queryClient } = createWrapper();
 * const { result } = renderHook(() => useExpression(uri), { wrapper: Wrapper });
 * ```
 */
function createWrapper(): {
  Wrapper: ({ children }: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { Wrapper, queryClient };
}

/**
 * Custom render function that wraps the component in all required providers.
 *
 * @param ui - React element to render
 * @param options - render options (passed through to @testing-library/react)
 * @returns render result plus the queryClient for cache inspection
 *
 * @example
 * ```tsx
 * const { getByText, queryClient } = renderWithProviders(<ExpressionCard uri={uri} />);
 * expect(getByText('Loading')).toBeInTheDocument();
 * ```
 */
function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): ReturnType<typeof render> & { queryClient: QueryClient } {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}

// Re-export everything from @testing-library/react for convenience.
export * from '@testing-library/react';
export { createTestQueryClient, createWrapper, renderWithProviders };
