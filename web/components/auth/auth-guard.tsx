'use client';

/**
 * Guard component that restricts rendering to authenticated users.
 *
 * Renders children when the user is authenticated. Otherwise, shows
 * a fallback login prompt or a custom fallback element.
 *
 * @module
 */

import type { ReactNode } from 'react';

import { useAuth } from '@/lib/auth';

interface AuthGuardProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

const DEFAULT_FALLBACK = (
  <div className="flex flex-col items-center justify-center gap-4 py-16">
    <h2 className="text-lg font-semibold">Sign in required</h2>
    <p className="text-muted-foreground text-sm">
      You need to sign in with your ATProto account to view this content.
    </p>
  </div>
);

/**
 * Renders children only when the user is authenticated.
 *
 * While authentication state is loading, renders nothing to avoid
 * a flash of the fallback content.
 *
 * @param props.children - content to render when authenticated
 * @param props.fallback - optional element to show when not authenticated
 */
function AuthGuard({ children, fallback }: AuthGuardProps): React.JSX.Element | null {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <>{fallback ?? DEFAULT_FALLBACK}</>;
  }

  return <>{children}</>;
}

export { AuthGuard };
export type { AuthGuardProps };
