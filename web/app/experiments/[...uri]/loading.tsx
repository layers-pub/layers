import { Skeleton } from '@/components/ui/skeleton';

export default function ExperimentDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <Skeleton className="h-7 w-1/3" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    </div>
  );
}
