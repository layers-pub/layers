import { Skeleton } from '@/components/ui/skeleton';

export default function ImportLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-2 h-5 w-96" />
      <div className="mx-auto mt-8 max-w-3xl space-y-8">
        <div className="flex items-center justify-center gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}
