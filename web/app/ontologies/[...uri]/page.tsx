import type { Metadata } from 'next';
import { Suspense } from 'react';

import { createServerClient } from '@/lib/api/client';

import { OntologyDetailContent } from './ontology-detail-content';
import { OntologyDetailSkeleton } from './loading';

interface OntologyDetailPageProps {
  params: Promise<{ uri: string[] }>;
}

/**
 * Reconstructs an AT-URI from the catch-all route segments.
 */
function reconstructAtUri(segments: string[]): string {
  return `at://${segments.map(decodeURIComponent).join('/')}`;
}

export async function generateMetadata({ params }: OntologyDetailPageProps): Promise<Metadata> {
  const { uri: segments } = await params;
  const atUri = reconstructAtUri(segments);

  try {
    const serverApi = createServerClient({ revalidate: 300 });
    const { data } = await serverApi.GET('/xrpc/pub.layers.ontology.getOntology', {
      params: { query: { uri: atUri } },
    });

    if (data?.value.name) {
      return {
        title: data.value.name,
        description: `Ontology: ${data.value.name}`,
      };
    }
  } catch {
    // Fall through to default metadata
  }

  return {
    title: 'Ontology',
    description: 'Ontology detail page.',
  };
}

export default async function OntologyDetailPage({ params }: OntologyDetailPageProps) {
  const { uri: segments } = await params;
  const atUri = reconstructAtUri(segments);

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<OntologyDetailSkeleton />}>
        <OntologyDetailContent uri={atUri} />
      </Suspense>
    </div>
  );
}
