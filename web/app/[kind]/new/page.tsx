import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RecordForm } from '@/components/records/record-form';
import { getRecordKindBySlug } from '@/lib/generated/record-registry';

interface Params {
  readonly params: Promise<{ readonly kind: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { kind: slug } = await params;
  const kind = getRecordKindBySlug(slug);
  return { title: kind ? `New ${kind.title}` : 'Not found' };
}

export default async function KindNewPage({ params }: Params) {
  const { kind: slug } = await params;
  if (!getRecordKindBySlug(slug)) notFound();
  return (
    <div className="container mx-auto px-4 py-8">
      <RecordForm slug={slug} />
    </div>
  );
}
