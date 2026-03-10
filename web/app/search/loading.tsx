import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loading state for the search page.
 */
function SearchSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="mt-2 h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mt-2 h-5 w-80" />
      <div className="mt-8">
        <SearchSkeleton />
      </div>
    </div>
  );
}

export { SearchSkeleton };
