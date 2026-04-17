import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RecordBrowser } from '@/components/records/record-browser';
import { getRecordKindBySlug, recordKindList } from '@/lib/generated/record-registry';

interface Params {
  readonly params: Promise<{ readonly kind: string }>;
}

export async function generateStaticParams() {
  return recordKindList.map((k) => ({ kind: k.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { kind: slug } = await params;
  const kind = getRecordKindBySlug(slug);
  if (!kind) return { title: 'Not found' };
  return {
    title: `${kind.title} · Layers`,
    description: kind.description || `Browse ${kind.title} records.`,
  };
}

export default async function KindBrowsePage({ params }: Params) {
  const { kind: slug } = await params;
  if (!getRecordKindBySlug(slug)) notFound();
  return (
    <div className="container mx-auto px-4 py-8">
      <RecordBrowser slug={slug} />
    </div>
  );
}
