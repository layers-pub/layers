'use client';

/**
 * Error boundary for the expressions list page.
 *
 * Reports errors to Faro on mount and displays a trace ID
 * for user support reference.
 *
 * @module
 */

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { FaroErrorBoundary } from '@/components/observability/faro-error-boundary';
import { usePushError, useTraceId } from '@/lib/observability/context';

export default function ExpressionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pushError = usePushError();
  const traceId = useTraceId();

  useEffect(() => {
    pushError(error, { page: 'expressions', digest: error.digest ?? '' });
  }, [error, pushError]);

  return (
    <FaroErrorBoundary componentName="ExpressionsErrorPage">
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
        <p className="mt-2 text-muted-foreground">
          {error.message || 'Failed to load expressions.'}
        </p>
        {traceId && (
          <p className="mt-1 text-xs text-muted-foreground">Reference: {traceId.slice(0, 8)}</p>
        )}
        <Button variant="outline" className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </FaroErrorBoundary>
  );
}
