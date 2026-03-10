'use client';

/**
 * Client component for the expression browse page.
 *
 * @packageDocumentation
 */

import { useCallback, useState } from 'react';

import { ExpressionCard } from '@/components/expressions/expression-card';
import { ExpressionCardSkeleton } from '@/components/expressions/expression-card-skeleton';
import { Button } from '@/components/ui/button';
import { useExpressions } from '@/lib/hooks';

/**
 * Renders a filterable, paginated list of expression cards.
 *
 * Uses the `useExpressions` hook to fetch data with cursor-based pagination.
 * Displays skeleton cards during loading, an empty state message when no
 * results match, and a "Load more" button for pagination.
 */
function ExpressionsContent() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const filters = cursor ? { cursor, limit: 24 } : { limit: 24 };
  const { data, isLoading, isError, error } = useExpressions(filters);

  const handleLoadMore = useCallback(() => {
    if (data?.cursor) {
      setCursor(data.cursor);
    }
  }, [data?.cursor]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-destructive">Failed to load expressions</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ExpressionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data?.records.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">No expressions found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Expressions will appear here once they are indexed from the network.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.records.map((expr) => (
          <ExpressionCard
            key={expr.uri}
            uri={expr.uri}
            text={expr.value.text ?? ''}
            language={expr.value.language}
            createdAt={expr.value.createdAt}
          />
        ))}
      </div>
      {data.cursor ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export { ExpressionsContent };
