/**
 * User dashboard page (server component).
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';

import { AuthGuard } from '@/components/auth/auth-guard';

import { DashboardContent } from './dashboard-content';

export const metadata: Metadata = {
  title: 'Dashboard | Layers',
  description: 'View your activity, records, and quick actions.',
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AuthGuard>
        <DashboardContent />
      </AuthGuard>
    </div>
  );
}
