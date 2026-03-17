'use client';

/**
 * Error boundary for the expression detail page.
 *
 * Reports errors to Faro on mount and displays a trace ID
 * for user support reference.
 *
 * @module
 */

import { useEffect } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { FaroErrorBoundary } from '@/components/observability/faro-error-boundary';
import { usePushError, useTraceId } from '@/lib/observability/context';

export default function ExpressionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pushError = usePushError();
  const traceId = useTraceId();

  useEffect(() => {
    pushError(error, { page: 'expression-detail', digest: error.digest ?? '' });
  }, [error, pushError]);

  return (
    <FaroErrorBoundary componentName="ExpressionDetailErrorPage">
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
        <p className="mt-2 text-muted-foreground">
          {error.message || 'Failed to load this expression.'}
        </p>
        {traceId && (
          <p className="mt-1 text-xs text-muted-foreground">Reference: {traceId.slice(0, 8)}</p>
        )}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" render={<Link href="/search" />}>
            Search expressions
          </Button>
          <Button onClick={reset}>Retry</Button>
        </div>
      </div>
    </FaroErrorBoundary>
  );
}
