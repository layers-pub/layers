import type { Metadata } from 'next';

import { AuthGuard } from '@/components/auth/auth-guard';

import { CreateExpressionContent } from './create-expression-content';

export const metadata: Metadata = {
  title: 'Create Expression | Layers',
  description: 'Create a new linguistic expression on Layers.',
};

export default function CreateExpressionPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <AuthGuard>
        <CreateExpressionContent />
      </AuthGuard>
    </div>
  );
}
