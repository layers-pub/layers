/**
 * Client component for the annotation workspace view.
 *
 * Reconstructs the AT-URI from route params, fetches the expression,
 * and renders the three-panel workspace layout. When the user is
 * authenticated, editing controls are enabled.
 *
 * @module
 */

'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  AnnotationWorkspace,
  AnnotationWorkspaceSkeleton,
} from '@/components/workspace/annotation-workspace';
import { useIsAuthenticated } from '@/lib/auth';
import { useExpression } from '@/lib/hooks';

interface WorkspaceContentProps {
  /** Reconstructed AT-URI of the expression. */
  uri: string;
}

/**
 * Fetches the expression and renders the workspace or error/loading states.
 *
 * The workspace is editable when the user is authenticated. Unauthenticated
 * users see a view-only workspace.
 */
function WorkspaceContent({ uri }: WorkspaceContentProps): React.JSX.Element {
  const { data: expression, isLoading, isError, error } = useExpression(uri);
  const isAuthenticated = useIsAuthenticated();

  if (isLoading) {
    return <AnnotationWorkspaceSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <p className="text-lg font-medium text-destructive">Failed to load expression</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
        <Button variant="outline" className="mt-6" render={<Link href="/expressions" />}>
          Back to expressions
        </Button>
      </div>
    );
  }

  if (!expression) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <p className="text-lg font-medium">Expression not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The requested expression does not exist or has not been indexed yet.
        </p>
        <Button variant="outline" className="mt-6" render={<Link href="/expressions" />}>
          Back to expressions
        </Button>
      </div>
    );
  }

  return (
    <AnnotationWorkspace
      expressionUri={uri}
      text={expression.value.text ?? ''}
      isEditable={isAuthenticated}
    />
  );
}

export { WorkspaceContent };
