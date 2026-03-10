'use client';

/**
 * React context for observability (trace context, Faro, Web Vitals).
 *
 * Provides trace IDs, span creation, and Faro event/error push
 * functions to components for distributed tracing and RUM.
 *
 * @module
 */

import * as React from 'react';
import { createContext, useContext, useMemo, useCallback, useEffect, useState } from 'react';
import type { Faro } from '@grafana/faro-web-sdk';

import {
  type TraceContext,
  initializeTraceContext,
  getCurrentTraceContext,
  createChildSpan,
  resetTraceContext,
} from './trace';
import { initFaro, getFaro, type UserContext } from './faro';
import { initWebVitals } from './web-vitals';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Value provided by the ObservabilityContext to descendant components.
 */
export interface ObservabilityContextValue {
  /** Current 32-character hex trace ID. */
  traceId: string;
  /** Current 16-character hex span ID. */
  spanId: string;
  /** Full W3C traceparent header value. */
  traceparent: string;
  /** Create a child span for a new operation. */
  createSpan: () => TraceContext;
  /** Reset trace context (e.g., on logout). */
  reset: () => void;
  /** Whether the provider has completed initialization. */
  isInitialized: boolean;
  /** Faro instance, or null if unavailable. */
  faro: Faro | null;
  /** Whether Faro is available for use. */
  isFaroAvailable: boolean;
  /** Push a custom event to the observability backend. */
  pushEvent: (name: string, attributes?: Record<string, string>) => void;
  /** Push an error to the observability backend. */
  pushError: (error: Error, context?: Record<string, string>) => void;
  /** Set user context after authentication. */
  setUser: (user: UserContext) => void;
  /** Clear user context on logout. */
  clearUser: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ObservabilityContext = createContext<ObservabilityContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Props for ObservabilityProvider.
 */
export interface ObservabilityProviderProps {
  /** Child components. */
  children: React.ReactNode;
  /** Disable Faro initialization (useful in tests). */
  disableFaro?: boolean;
  /** Disable Web Vitals collection. */
  disableWebVitals?: boolean;
}

/**
 * Simple non-cryptographic hash for privacy scrubbing of DIDs.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

/**
 * Provider that initializes trace context, Faro, and Web Vitals
 * on mount and exposes them to descendant components.
 *
 * Place this near the root of the application, wrapping the
 * Providers component, so that all components can access
 * observability context.
 *
 * @example
 * ```tsx
 * <ObservabilityProvider>
 *   <Providers>
 *     <App />
 *   </Providers>
 * </ObservabilityProvider>
 * ```
 */
function ObservabilityProvider({
  children,
  disableFaro = false,
  disableWebVitals = false,
}: ObservabilityProviderProps): React.JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const [traceContext, setTraceContext] = useState<TraceContext | null>(null);
  const [faroInstance, setFaroInstance] = useState<Faro | null>(null);

  // Ref for web vitals cleanup.
  const cleanupRef = React.useRef<(() => void) | null>(null);

  // Initialize trace context, Faro, and Web Vitals on mount.
  useEffect(() => {
    const ctx = initializeTraceContext();
    setTraceContext(ctx);

    if (!disableFaro) {
      void initFaro().then((faro) => {
        setFaroInstance(faro);

        if (!disableWebVitals && faro) {
          const cleanupVitals = initWebVitals();
          cleanupRef.current = cleanupVitals;
        }

        setIsInitialized(true);
      });
    } else {
      setIsInitialized(true);
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [disableFaro, disableWebVitals]);

  // -- Callbacks (stable across renders) --

  const createSpanCb = useCallback((): TraceContext => {
    return createChildSpan();
  }, []);

  const resetCb = useCallback(() => {
    resetTraceContext();
    const newCtx = initializeTraceContext();
    setTraceContext(newCtx);
  }, []);

  const pushEvent = useCallback(
    (name: string, attributes?: Record<string, string>) => {
      const faro = faroInstance ?? getFaro();
      if (!faro) return;

      try {
        faro.api.pushEvent(name, attributes);
      } catch {
        // Silently fail; observability must never break the app.
      }
    },
    [faroInstance],
  );

  const pushError = useCallback(
    (error: Error, context?: Record<string, string>) => {
      const faro = faroInstance ?? getFaro();
      if (!faro) return;

      try {
        faro.api.pushError(error, { context });
      } catch {
        // Silently fail.
      }
    },
    [faroInstance],
  );

  const setUser = useCallback(
    (user: UserContext) => {
      const faro = faroInstance ?? getFaro();
      if (!faro) return;

      try {
        faro.api.setUser({
          id: hashString(user.id),
          username: user.username ? 'authenticated' : undefined,
          email: user.email ? 'provided' : undefined,
          attributes: user.attributes ? { ...user.attributes } : undefined,
        });
      } catch {
        // Silently fail.
      }
    },
    [faroInstance],
  );

  const clearUser = useCallback(() => {
    const faro = faroInstance ?? getFaro();
    if (!faro) return;

    try {
      faro.api.resetUser();
    } catch {
      // Silently fail.
    }
  }, [faroInstance]);

  // -- Memoized context value --

  const value = useMemo<ObservabilityContextValue>(() => {
    const ctx = traceContext ?? getCurrentTraceContext();
    return {
      traceId: ctx.traceId,
      spanId: ctx.spanId,
      traceparent: ctx.traceparent,
      createSpan: createSpanCb,
      reset: resetCb,
      isInitialized,
      faro: faroInstance,
      isFaroAvailable: faroInstance !== null,
      pushEvent,
      pushError,
      setUser,
      clearUser,
    };
  }, [
    traceContext,
    createSpanCb,
    resetCb,
    isInitialized,
    faroInstance,
    pushEvent,
    pushError,
    setUser,
    clearUser,
  ]);

  return <ObservabilityContext.Provider value={value}>{children}</ObservabilityContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access the full observability context.
 *
 * @throws if called outside an ObservabilityProvider
 */
function useObservability(): ObservabilityContextValue {
  const context = useContext(ObservabilityContext);
  if (!context) {
    throw new Error('useObservability must be used within an ObservabilityProvider');
  }
  return context;
}

/**
 * Returns the current trace ID, or undefined when outside the provider.
 *
 * Useful for optional tracing in components that may render without
 * the provider (e.g., Storybook, tests).
 */
function useTraceId(): string | undefined {
  const context = useContext(ObservabilityContext);
  return context?.traceId;
}

/**
 * Returns a function that creates a child span for tracked operations.
 *
 * Falls back to the module-level createChildSpan when outside the provider.
 *
 * @example
 * ```tsx
 * function SubmitButton() {
 *   const createOp = useTracedOperation();
 *   const handleClick = async () => {
 *     const span = createOp();
 *     await api.submit({ traceparent: span.traceparent });
 *   };
 * }
 * ```
 */
function useTracedOperation(): () => TraceContext {
  const context = useContext(ObservabilityContext);
  return useCallback(() => {
    if (context) {
      return context.createSpan();
    }
    return createChildSpan();
  }, [context]);
}

/**
 * Returns a stable callback that pushes a custom event to Faro.
 *
 * No-ops silently when outside the provider.
 *
 * @example
 * ```tsx
 * const pushEvent = usePushEvent();
 * pushEvent('search_executed', { query: 'test', resultCount: '42' });
 * ```
 */
function usePushEvent(): (name: string, attributes?: Record<string, string>) => void {
  const context = useContext(ObservabilityContext);
  return useCallback(
    (name: string, attributes?: Record<string, string>) => {
      context?.pushEvent(name, attributes);
    },
    [context],
  );
}

/**
 * Returns a stable callback that pushes an error to Faro.
 *
 * No-ops silently when outside the provider.
 *
 * @example
 * ```tsx
 * const pushError = usePushError();
 * try { await riskyOp(); } catch (e) { pushError(e as Error, { op: 'riskyOp' }); }
 * ```
 */
function usePushError(): (error: Error, context?: Record<string, string>) => void {
  const context = useContext(ObservabilityContext);
  return useCallback(
    (error: Error, errorContext?: Record<string, string>) => {
      context?.pushError(error, errorContext);
    },
    [context],
  );
}

export {
  ObservabilityProvider,
  useObservability,
  useTraceId,
  useTracedOperation,
  usePushEvent,
  usePushError,
};
