'use client';

/**
 * Guard component that restricts rendering to users with the admin role.
 *
 * Renders children when the authenticated user has admin privileges.
 * Shows an access denied message otherwise.
 *
 * @module
 */

import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';

interface AdminGuardProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

const DEFAULT_FALLBACK = (
  <Card className="mx-auto mt-16 max-w-md">
    <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
      <ShieldAlert className="h-12 w-12 text-destructive" />
      <h2 className="text-lg font-semibold">Access Denied</h2>
      <p className="text-sm text-muted-foreground">
        You do not have the admin role required to view this page. Contact a system administrator if
        you believe this is an error.
      </p>
    </CardContent>
  </Card>
);

/**
 * Renders children only when the authenticated user has the admin role.
 *
 * @param props.children - content to render when authorized
 * @param props.fallback - optional element to show when access is denied
 */
function AdminGuard({ children, fallback }: AdminGuardProps): React.JSX.Element | null {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return <>{fallback ?? DEFAULT_FALLBACK}</>;
  }

  return <>{children}</>;
}

export { AdminGuard };
export type { AdminGuardProps };
