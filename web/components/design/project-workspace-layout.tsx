'use client';

/**
 * Project workspace layout with tab navigation and write target selector.
 *
 * Provides a tab bar (Lexicons, Templates, Experiments, Simulate, I/O),
 * wraps children in a ProjectContextProvider, and renders the
 * WriteTargetSelector in the header area.
 *
 * @module
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FileText, FlaskConical, Play, ArrowLeftRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import { ProjectContextProvider } from './project-context';
import { WriteTargetSelector } from './write-target-selector';

const WORKSPACE_TABS = [
  { segment: 'lexicons', label: 'Lexicons', icon: BookOpen },
  { segment: 'templates', label: 'Templates', icon: FileText },
  { segment: 'experiments', label: 'Experiments', icon: FlaskConical },
  { segment: 'simulate', label: 'Simulate', icon: Play },
  { segment: 'io', label: 'I/O', icon: ArrowLeftRight },
] as const;

interface ProjectWorkspaceLayoutProps {
  readonly projectUri: string;
  readonly children: React.ReactNode;
}

function ProjectWorkspaceLayout({
  projectUri,
  children,
}: ProjectWorkspaceLayoutProps): React.JSX.Element {
  const pathname = usePathname();
  const basePath = `/design/${encodeURIComponent(projectUri)}`;

  return (
    <ProjectContextProvider projectUri={projectUri}>
      <div className="space-y-6">
        {/* Project header: URI breadcrumb and write target selector */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-muted-foreground">{projectUri}</p>
          </div>
          <WriteTargetSelector />
        </div>

        {/* Tab navigation */}
        <nav className="flex border-b" aria-label="Project workspace tabs">
          {WORKSPACE_TABS.map((tab) => {
            const href = `${basePath}/${tab.segment}`;
            const isActive = pathname.startsWith(href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.segment}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Tab content */}
        <div>{children}</div>
      </div>
    </ProjectContextProvider>
  );
}

export { ProjectWorkspaceLayout };
