/**
 * Changelog loading skeleton.
 *
 * @packageDocumentation
 */

import { Skeleton } from '@/components/ui/skeleton';

export default function ChangelogLoading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-72" />

      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-64" />
      </div>

      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}
