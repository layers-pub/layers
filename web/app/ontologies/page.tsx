import type { Metadata } from 'next';
import { Suspense } from 'react';

import { OntologiesContent } from './ontologies-content';
import { OntologiesListSkeleton } from './loading';

export const metadata: Metadata = {
  title: 'Ontologies',
  description: 'Browse annotation ontologies and type systems indexed on Layers.',
};

export default function OntologiesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Ontologies</h1>
        <p className="mt-2 text-muted-foreground">
          Browse annotation type systems and their type definitions.
        </p>
      </div>
      <Suspense fallback={<OntologiesListSkeleton />}>
        <OntologiesContent />
      </Suspense>
    </div>
  );
}
