'use client';

/**
 * Error boundary wrapper for design section panels.
 *
 * Delegates to FaroErrorBoundary with a design-specific fallback
 * that shows an error card with a retry button.
 *
 * @module
 */

import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FaroErrorBoundary } from '@/components/observability/faro-error-boundary';

interface DesignErrorBoundaryProps {
  /** Name of the panel for error attribution. */
  readonly name: string;
  /** Children to render inside the boundary. */
  readonly children: React.ReactNode;
}

function designFallback(error: Error, reset: () => void): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="mb-3 size-8 text-destructive/60" />
        <h3 className="text-sm font-semibold text-destructive">Something went wrong</h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          {process.env.NODE_ENV === 'development'
            ? error.message
            : 'An unexpected error occurred in this panel.'}
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function DesignErrorBoundary({ name, children }: DesignErrorBoundaryProps): React.JSX.Element {
  return (
    <FaroErrorBoundary
      componentName={`Design/${name}`}
      context={{ section: 'design', panel: name }}
      fallback={designFallback}
    >
      {children}
    </FaroErrorBoundary>
  );
}

export { DesignErrorBoundary };
