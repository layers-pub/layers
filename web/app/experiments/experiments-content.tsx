'use client';

/**
 * Client component for the experiments list page.
 *
 * @packageDocumentation
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { ErrorDisplay } from '@/components/layout/error-display';
import { ExperimentCard } from '@/components/experiments/experiment-card';
import { useExperimentDefs } from '@/lib/hooks/use-experiments';

/** Number of experiments to fetch per page. */
const PAGE_SIZE = 20;

/**
 * Renders a paginated card listing of experiment definitions.
 */
function ExperimentsContent(): React.JSX.Element {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { data, isLoading, error, refetch } = useExperimentDefs({ limit: PAGE_SIZE, cursor });

  if (isLoading) {
    return <ExperimentsContentSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} reset={() => void refetch()} />;
  }

  if (!data || data.records.length === 0) {
    return (
      <EmptyState
        title="No experiments found"
        description="No experiment definitions have been indexed yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.records.map((experiment) => (
          <ExperimentCard key={experiment.uri} experiment={experiment} />
        ))}
      </div>

      {data.cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setCursor(data.cursor)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for the experiments content while loading.
 */
function ExperimentsContentSkeleton(): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-xl border p-4">
          <Skeleton className="h-5 w-3/4" />
          <div className="mt-2 flex gap-1.5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="mt-4 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export { ExperimentsContent, ExperimentsContentSkeleton };
