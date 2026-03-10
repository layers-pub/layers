import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SearchContent } from './search-content';
import { SearchSkeleton } from './loading';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search across expressions, corpora, ontologies, annotations, and more.',
};

export default function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="mt-2 text-muted-foreground">
          Find expressions, corpora, ontologies, annotations, and other records.
        </p>
      </div>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchContent searchParamsPromise={searchParams} />
      </Suspense>
    </div>
  );
}
