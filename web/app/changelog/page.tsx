/**
 * Changelog page (server component).
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import { ChangelogContent } from './changelog-content';

export const metadata: Metadata = {
  title: 'Changelog | Layers',
  description: 'Browse record creation, update, and deletion history.',
};

/**
 * Skeleton fallback shown while changelog data loads.
 */
function ChangelogSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-48" />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<ChangelogSkeleton />}>
        <ChangelogContent />
      </Suspense>
    </div>
  );
}
