'use client';

/**
 * Admin layout with collapsible sidebar navigation.
 *
 * @module
 */

import { useState } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

interface AdminLayoutProps {
  readonly children: React.ReactNode;
}

function AdminLayout({ children }: AdminLayoutProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}

export default AdminLayout;
