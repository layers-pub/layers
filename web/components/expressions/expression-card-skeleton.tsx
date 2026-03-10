/**
 * Skeleton loading placeholder for ExpressionCard.
 *
 * @packageDocumentation
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Renders a skeleton placeholder matching the ExpressionCard layout.
 * Used as a loading state in expression list views.
 */
function ExpressionCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-16" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
      <div className="px-4 pb-2">
        <Skeleton className="h-3 w-24" />
      </div>
    </Card>
  );
}

export { ExpressionCardSkeleton };
