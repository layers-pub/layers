/**
 * Design section dashboard page (server component).
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';

import { AuthGuard } from '@/components/auth/auth-guard';
import { DesignDashboard } from '@/components/design/design-dashboard';
import { DesignErrorBoundary } from '@/components/design/design-error-boundary';

export const metadata: Metadata = {
  title: 'Design Studio',
  description: 'Manage annotation and experimental design projects.',
};

export default function DesignPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AuthGuard>
        <DesignErrorBoundary name="Dashboard">
          <DesignDashboard />
        </DesignErrorBoundary>
      </AuthGuard>
    </div>
  );
}
