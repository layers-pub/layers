/**
 * Experiment detail page (server component).
 *
 * @remarks
 * Uses a catch-all route `[...uri]` to capture AT-URIs that contain slashes.
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { decodeAtUri } from '@/lib/utils/format';

import { ExperimentDetailContent } from './experiment-detail-content';

interface ExperimentDetailPageProps {
  params: Promise<{ uri: string[] }>;
}

export async function generateMetadata({ params }: ExperimentDetailPageProps): Promise<Metadata> {
  const { uri: segments } = await params;
  const uri = decodeAtUri(segments);

  if (!uri.startsWith('at://')) {
    return { title: 'Invalid URI' };
  }

  return {
    title: 'Experiment | Layers',
    description: `Experiment definition: ${uri}`,
  };
}

function ExperimentDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-1/3" />
        <div className="mt-2 flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

export default async function ExperimentDetailPage({ params }: ExperimentDetailPageProps) {
  const { uri: segments } = await params;
  const uri = decodeAtUri(segments);

  if (!uri.startsWith('at://')) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<ExperimentDetailSkeleton />}>
        <ExperimentDetailContent uri={uri} />
      </Suspense>
    </div>
  );
}
