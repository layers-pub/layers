/**
 * Admin panel loading skeleton.
 *
 * @packageDocumentation
 */

import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-56" />

      <div className="space-y-4">
        <Skeleton className="h-9 w-96" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
