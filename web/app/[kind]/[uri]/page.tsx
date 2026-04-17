import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RecordDetail } from '@/components/records/record-detail';
import { getRecordKindBySlug } from '@/lib/generated/record-registry';

interface Params {
  readonly params: Promise<{ readonly kind: string; readonly uri: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { kind: slug, uri } = await params;
  const kind = getRecordKindBySlug(slug);
  if (!kind) return { title: 'Not found' };
  return {
    title: `${kind.title} · ${decodeURIComponent(uri)}`,
  };
}

export default async function KindDetailPage({ params }: Params) {
  const { kind: slug, uri } = await params;
  if (!getRecordKindBySlug(slug)) notFound();
  return (
    <div className="container mx-auto px-4 py-8">
      <RecordDetail slug={slug} uri={decodeURIComponent(uri)} />
    </div>
  );
}
