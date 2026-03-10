import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CorporaContent } from './corpora-content';
import { CorporaListSkeleton } from './loading';

export const metadata: Metadata = {
  title: 'Corpora',
  description: 'Browse linguistic corpora indexed on Layers.',
};

export default function CorporaPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Corpora</h1>
        <p className="mt-2 text-muted-foreground">
          Browse linguistic corpora and their annotated expressions.
        </p>
      </div>
      <Suspense fallback={<CorporaListSkeleton />}>
        <CorporaContent />
      </Suspense>
    </div>
  );
}
