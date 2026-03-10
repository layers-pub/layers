'use client';

/**
 * Faro-integrated React error boundary.
 *
 * Catches render errors in descendant components, reports them
 * to Grafana Faro with privacy-scrubbed context, and renders
 * a fallback UI with a trace ID for user support reference.
 *
 * @module
 */

import * as React from 'react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { getFaro } from '@/lib/observability/faro';
import { scrubError, scrubString } from '@/lib/observability/privacy';
import { getCurrentTraceContext } from '@/lib/observability/trace';

/**
 * Props for FaroErrorBoundary.
 */
interface FaroErrorBoundaryProps {
  /** Child components to wrap. */
  children: ReactNode;
  /** Fallback UI or render function displayed when an error occurs. */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Name of the boundary for error attribution. */
  componentName?: string;
  /** Additional context attributes included in error reports. */
  context?: Record<string, string>;
  /** Callback invoked when an error is caught. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface FaroErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that reports caught errors to Grafana Faro.
 *
 * Scrubs PII from error messages, component stacks, and context
 * before transmission. Includes the current trace ID in the default
 * fallback UI so users can reference it when requesting support.
 *
 * @example
 * ```tsx
 * <FaroErrorBoundary componentName="AnnotationWorkspace">
 *   <AnnotationWorkspace />
 * </FaroErrorBoundary>
 *
 * <FaroErrorBoundary
 *   componentName="Dashboard"
 *   fallback={(error, reset) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={reset}>Retry</button>
 *     </div>
 *   )}
 * >
 *   <Dashboard />
 * </FaroErrorBoundary>
 * ```
 */
class FaroErrorBoundary extends Component<FaroErrorBoundaryProps, FaroErrorBoundaryState> {
  constructor(props: FaroErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): FaroErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError } = this.props;

    this.reportError(error, errorInfo);

    if (onError) {
      onError(error, errorInfo);
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo): void {
    const faro = getFaro();
    if (!faro) return;

    const { componentName, context } = this.props;

    try {
      const scrubbedError = scrubError(error);

      const componentStack = errorInfo.componentStack
        ? scrubString(errorInfo.componentStack)
        : undefined;

      const errorContext: Record<string, string> = {
        ...context,
        boundary: componentName ?? 'FaroErrorBoundary',
      };

      if (typeof window !== 'undefined') {
        errorContext['path'] = window.location.pathname;
        errorContext['url'] = window.location.href.split('?')[0] ?? '';
      }

      faro.api.pushError(new Error(scrubbedError.message), {
        context: errorContext,
        stackFrames: componentStack
          ? [{ filename: 'react-component-stack', function: componentStack }]
          : undefined,
        type: 'react-error-boundary',
      });

      faro.api.pushEvent('react_error_boundary', {
        boundary: componentName ?? 'FaroErrorBoundary',
        errorType: error.name,
        errorMessage: scrubbedError.message.substring(0, 100),
      });
    } catch {
      // Silently fail; error reporting must never throw.
    }
  }

  private reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

      // Default fallback with trace ID for support reference.
      const traceId = getCurrentTraceContext().traceId;
      const shortTraceId = traceId.slice(0, 8);

      return (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <h3 className="text-lg font-semibold text-destructive">Something went wrong</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {process.env.NODE_ENV === 'development'
              ? error.message
              : 'An unexpected error occurred.'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Reference: {shortTraceId}</p>
          <button
            onClick={this.reset}
            className="mt-4 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

/**
 * HOC that wraps a component with a FaroErrorBoundary.
 *
 * @param WrappedComponent - component to wrap
 * @param options - error boundary configuration
 * @returns wrapped component with error boundary
 *
 * @example
 * ```tsx
 * const SafeDashboard = withFaroErrorBoundary(Dashboard, {
 *   componentName: 'Dashboard',
 * });
 * ```
 */
function withFaroErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<FaroErrorBoundaryProps, 'children'>,
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithErrorBoundary: React.FC<P> = (props) => (
    <FaroErrorBoundary componentName={displayName} {...options}>
      <WrappedComponent {...props} />
    </FaroErrorBoundary>
  );

  WithErrorBoundary.displayName = `withFaroErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}

export { FaroErrorBoundary, withFaroErrorBoundary };
export type { FaroErrorBoundaryProps };
