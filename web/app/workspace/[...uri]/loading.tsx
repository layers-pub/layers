/**
 * Loading skeleton for the workspace route.
 *
 * Displays a three-panel skeleton layout while the page loads.
 *
 * @module
 */

import { Skeleton } from '@/components/ui/skeleton';

export default function WorkspaceLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-1">
      {/* Left panel skeleton */}
      <div className="w-1/4 border-r p-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Center panel skeleton */}
      <div className="w-1/2 p-4 space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>

      {/* Right panel skeleton */}
      <div className="w-1/4 border-l p-4 space-y-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-5 w-24 mt-4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </div>
  );
}
