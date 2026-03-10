import type { Metadata } from 'next';

import { AuthGuard } from '@/components/auth/auth-guard';

import { CreateOntologyContent } from './create-ontology-content';

export const metadata: Metadata = {
  title: 'Create Ontology | Layers',
  description: 'Create a new annotation ontology on Layers.',
};

export default function CreateOntologyPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <AuthGuard>
        <CreateOntologyContent />
      </AuthGuard>
    </div>
  );
}
