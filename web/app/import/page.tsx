/**
 * Import data page (server component).
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Skeleton } from '@/components/ui/skeleton';

const ImportWizardContent = dynamic(() =>
  import('./import-wizard-content').then((m) => m.ImportWizardContent),
);

export const metadata: Metadata = {
  title: 'Import Data | Layers',
  description: 'Import linguistic annotation data from external formats into Layers.',
};

function ImportWizardSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-center gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export default function ImportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="mt-2 text-muted-foreground">
          Import linguistic annotation data from CoNLL-U, BRAT, ELAN, TEI XML, or Praat TextGrid
          formats.
        </p>
      </div>
      <AuthGuard>
        <Suspense fallback={<ImportWizardSkeleton />}>
          <ImportWizardContent />
        </Suspense>
      </AuthGuard>
    </div>
  );
}
