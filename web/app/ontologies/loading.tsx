import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for the ontologies list page.
 */
function OntologiesListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-2/3" />
          <Skeleton className="mt-4 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function OntologiesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-9 w-36" />
      <Skeleton className="mt-2 h-5 w-80" />
      <div className="mt-8">
        <OntologiesListSkeleton />
      </div>
    </div>
  );
}

export { OntologiesListSkeleton };
