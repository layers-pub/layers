/**
 * Dashboard loading skeleton.
 *
 * @packageDocumentation
 */

import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
