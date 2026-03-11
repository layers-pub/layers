/**
 * New project creation page (server component).
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';

import { AuthGuard } from '@/components/auth/auth-guard';
import { NewProjectForm } from '@/components/design/new-project-form';

export const metadata: Metadata = {
  title: 'New Project',
  description: 'Create a new annotation and experimental design project.',
};

export default function NewProjectPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <AuthGuard>
        <NewProjectForm />
      </AuthGuard>
    </div>
  );
}
