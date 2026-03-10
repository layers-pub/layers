import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for the ontology detail page.
 */
function OntologyDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-4">
          <Skeleton className="h-5 w-20" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-1 h-4 w-48" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export default function OntologyDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <OntologyDetailSkeleton />
    </div>
  );
}

export { OntologyDetailSkeleton };
