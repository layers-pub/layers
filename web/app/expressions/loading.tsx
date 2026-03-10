/**
 * Loading state for the expressions list page.
 *
 * @packageDocumentation
 */

import { ExpressionCardSkeleton } from '@/components/expressions/expression-card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExpressionsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ExpressionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
