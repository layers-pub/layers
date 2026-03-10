/**
 * Expression browse page (server component).
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { ExpressionsContent } from './expressions-content';

export const metadata: Metadata = {
  title: 'Expressions',
  description: 'Browse linguistic expressions indexed on the Layers network.',
};

/**
 * Skeleton fallback shown while expression list data loads.
 */
function ExpressionsListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-3 w-20" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExpressionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expressions</h1>
          <p className="mt-1 text-muted-foreground">Browse linguistic expressions</p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/search?type=expression" />}>
          Search
        </Button>
      </div>
      <Suspense fallback={<ExpressionsListSkeleton />}>
        <ExpressionsContent />
      </Suspense>
    </div>
  );
}
