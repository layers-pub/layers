'use client';

/**
 * Error boundary for the expressions list page.
 *
 * @packageDocumentation
 */

import { Button } from '@/components/ui/button';

export default function ExpressionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center">
      <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
      <p className="mt-2 text-muted-foreground">{error.message || 'Failed to load expressions.'}</p>
      <Button variant="outline" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
