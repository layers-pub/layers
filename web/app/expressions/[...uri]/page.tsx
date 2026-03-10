/**
 * Expression detail page (server component).
 *
 * @remarks
 * Uses a catch-all route `[...uri]` to capture AT-URIs that contain slashes.
 * The URI is reconstructed from the route segments via `decodeAtUri`.
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { createServerClient } from '@/lib/api/client';
import { decodeAtUri } from '@/lib/utils/format';

import { ExpressionDetailContent } from './expression-detail-content';

interface ExpressionDetailPageProps {
  params: Promise<{ uri: string[] }>;
}

/**
 * Generates page metadata by fetching the expression on the server.
 */
export async function generateMetadata({ params }: ExpressionDetailPageProps): Promise<Metadata> {
  const { uri: segments } = await params;
  const uri = decodeAtUri(segments);

  if (!uri.startsWith('at://')) {
    return { title: 'Invalid URI' };
  }

  try {
    const serverApi = createServerClient({ revalidate: 60 });
    const { data } = await serverApi.GET('/xrpc/pub.layers.expression.getExpression', {
      params: { query: { uri } },
    });

    if (!data) {
      return { title: 'Expression Not Found' };
    }

    const text = data.value.text ?? '';
    const preview = text.length > 100 ? text.slice(0, 100) + '...' : text;

    return {
      title: preview || 'Expression',
      description: preview ? `Linguistic expression: ${preview}` : 'Expression detail page.',
    };
  } catch {
    return { title: 'Expression' };
  }
}

/**
 * Skeleton fallback for the expression detail view.
 */
function ExpressionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="space-y-3 rounded-xl border p-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default async function ExpressionDetailPage({ params }: ExpressionDetailPageProps) {
  const { uri: segments } = await params;
  const uri = decodeAtUri(segments);

  if (!uri.startsWith('at://')) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<ExpressionDetailSkeleton />}>
        <ExpressionDetailContent uri={uri} />
      </Suspense>
    </div>
  );
}
