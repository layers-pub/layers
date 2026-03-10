import { Skeleton } from '@/components/ui/skeleton';

export default function ExperimentsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-2 h-5 w-80" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
