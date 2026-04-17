import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RecordEditForm } from '@/components/records/record-edit-form';
import { getRecordKindBySlug } from '@/lib/generated/record-registry';

interface Params {
  readonly params: Promise<{ readonly kind: string; readonly uri: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { kind: slug } = await params;
  const kind = getRecordKindBySlug(slug);
  return { title: kind ? `Edit ${kind.title}` : 'Not found' };
}

export default async function KindEditPage({ params }: Params) {
  const { kind: slug, uri } = await params;
  if (!getRecordKindBySlug(slug)) notFound();
  return (
    <div className="container mx-auto px-4 py-8">
      <RecordEditForm slug={slug} uri={decodeURIComponent(uri)} />
    </div>
  );
}
