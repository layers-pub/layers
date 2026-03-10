'use client';

/**
 * Reusable error display with optional retry.
 *
 * @module
 */

import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ErrorDisplayProps {
  /** The error to display. */
  error: Error;
  /** Optional callback to retry the failed operation. */
  reset?: () => void;
}

function ErrorDisplay({ error, reset }: ErrorDisplayProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-3">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold">Something went wrong</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{error.message}</p>
      {reset ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export type { ErrorDisplayProps };
export { ErrorDisplay };
