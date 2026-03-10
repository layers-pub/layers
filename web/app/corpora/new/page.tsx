import type { Metadata } from 'next';

import { AuthGuard } from '@/components/auth/auth-guard';

import { CreateCorpusContent } from './create-corpus-content';

export const metadata: Metadata = {
  title: 'Create Corpus | Layers',
  description: 'Create a new linguistic corpus on Layers.',
};

export default function CreateCorpusPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <AuthGuard>
        <CreateCorpusContent />
      </AuthGuard>
    </div>
  );
}
