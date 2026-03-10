/**
 * Experiments list page (server component).
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ExperimentsContent, ExperimentsContentSkeleton } from './experiments-content';

export const metadata: Metadata = {
  title: 'Experiments | Layers',
  description: 'Browse annotation experiments and judgment tasks on Layers.',
};

export default function ExperimentsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Experiments</h1>
        <p className="mt-2 text-muted-foreground">
          Browse annotation experiments, judgment tasks, and agreement reports.
        </p>
      </div>
      <Suspense fallback={<ExperimentsContentSkeleton />}>
        <ExperimentsContent />
      </Suspense>
    </div>
  );
}
