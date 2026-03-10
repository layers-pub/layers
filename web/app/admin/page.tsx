/**
 * Admin panel page (server component).
 *
 * @packageDocumentation
 */

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Skeleton } from '@/components/ui/skeleton';

const AdminContent = dynamic(() => import('./admin-content').then((m) => m.AdminContent), {
  loading: () => (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Admin | Layers',
  description: 'System administration, DLQ management, and health monitoring.',
};

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AuthGuard>
        <AdminContent />
      </AuthGuard>
    </div>
  );
}
