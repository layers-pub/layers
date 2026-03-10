import type { Metadata } from 'next';
import { Suspense } from 'react';

import { createServerClient } from '@/lib/api/client';

import { CorpusDetailContent } from './corpus-detail-content';
import { CorpusDetailSkeleton } from './loading';

interface CorpusDetailPageProps {
  params: Promise<{ uri: string[] }>;
}

/**
 * Reconstructs an AT-URI from the catch-all route segments.
 *
 * @remarks
 * The catch-all `[...uri]` produces segments like `['did:plc:abc', 'pub.layers.corpus.corpus', '3abc']`.
 * This function reassembles them into `at://did:plc:abc/pub.layers.corpus.corpus/3abc`.
 */
function reconstructAtUri(segments: string[]): string {
  return `at://${segments.map(decodeURIComponent).join('/')}`;
}

export async function generateMetadata({ params }: CorpusDetailPageProps): Promise<Metadata> {
  const { uri: segments } = await params;
  const atUri = reconstructAtUri(segments);

  try {
    const serverApi = createServerClient({ revalidate: 120 });
    const { data } = await serverApi.GET('/xrpc/pub.layers.corpus.getCorpus', {
      params: { query: { uri: atUri } },
    });

    if (data?.value.name) {
      return {
        title: data.value.name,
        description: `Corpus: ${data.value.name}`,
      };
    }
  } catch {
    // Fall through to default metadata
  }

  return {
    title: 'Corpus',
    description: 'Corpus detail page.',
  };
}

export default async function CorpusDetailPage({ params }: CorpusDetailPageProps) {
  const { uri: segments } = await params;
  const atUri = reconstructAtUri(segments);

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<CorpusDetailSkeleton />}>
        <CorpusDetailContent uri={atUri} />
      </Suspense>
    </div>
  );
}
