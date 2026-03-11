'use client';

/**
 * Project workspace layout with tab bar.
 *
 * Extracts the projectUri from route params and renders the
 * ProjectWorkspaceLayout wrapper around children.
 *
 * @module
 */

import { use } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { ProjectWorkspaceLayout } from '@/components/design/project-workspace-layout';

interface ProjectLayoutProps {
  readonly params: Promise<{ projectUri: string }>;
  readonly children: React.ReactNode;
}

function ProjectLayout({ params, children }: ProjectLayoutProps): React.JSX.Element {
  const { projectUri } = use(params);
  const decodedUri = decodeURIComponent(projectUri);

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <ProjectWorkspaceLayout projectUri={decodedUri}>{children}</ProjectWorkspaceLayout>
      </div>
    </AuthGuard>
  );
}

export default ProjectLayout;
