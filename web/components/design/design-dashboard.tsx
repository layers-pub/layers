'use client';

/**
 * Project dashboard for the /design section.
 *
 * Displays a grid of project cards fetched via the useProjectCollections
 * hook, with actions to create new projects or browse network resources.
 *
 * @module
 */

import Link from 'next/link';
import { Plus, Globe, BookOpen, Languages, FolderOpen } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { useProjectCollections } from '@/lib/hooks/use-design';

// =============================================================================
// PROJECT CARD
// =============================================================================

interface ProjectCardProps {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly language?: string;
}

function ProjectCard({ uri, name, description, language }: ProjectCardProps): React.JSX.Element {
  const encodedUri = encodeURIComponent(uri);

  return (
    <Link href={`/design/${encodedUri}`} className="block">
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-tight">{name}</CardTitle>
            {language ? (
              <Badge variant="outline" className="shrink-0">
                <Languages className="mr-1 size-3" />
                {language}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description || 'No description'}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="size-3" />
              Lexicons
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

function ProjectCardSkeleton(): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-2/3" />
        <Skeleton className="mt-3 h-3 w-1/3" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyProjectState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FolderOpen className="mb-4 size-12 text-muted-foreground/50" />
      <h3 className="text-lg font-semibold">No projects yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create a new project to start building lexicons, templates, and experiments.
      </p>
      <Button className="mt-4" render={<Link href="/design/new" />}>
        <Plus className="mr-1.5 size-4" />
        New Project
      </Button>
    </div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

function ErrorState({ message }: { readonly message: string }): React.JSX.Element {
  return (
    <Card>
      <CardContent className="py-8">
        <p className="text-center text-sm text-destructive">{message}</p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// DASHBOARD
// =============================================================================

function DesignDashboard(): React.JSX.Element {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useProjectCollections({
    repo: user?.did ?? '',
  });

  const records = data?.records ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Design Studio"
        description="Create and manage annotation and experimental design projects"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" render={<Link href="/design/browse" />}>
              <Globe className="mr-1.5 h-4 w-4" />
              Browse Network
            </Button>
            <Button size="sm" render={<Link href="/design/new" />}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Project
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load projects.'} />
      ) : records.length === 0 ? (
        <EmptyProjectState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((record) => (
            <ProjectCard
              key={record.uri}
              uri={record.uri}
              name={record.value.name ?? 'Untitled'}
              description={record.value.description}
              language={record.value.language}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { DesignDashboard, ProjectCard, ProjectCardSkeleton, EmptyProjectState };
