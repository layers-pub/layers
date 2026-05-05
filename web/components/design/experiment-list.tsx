'use client';

/**
 * Experiment list for a design project.
 *
 * Displays experiment definitions as a card grid with name, task type badge,
 * measure type, description preview, and template/collection counts.
 * Includes a "New Experiment" button that navigates to the creation page.
 *
 * @module
 */

import { useRouter } from 'next/navigation';
import { Plus, FlaskConical, Beaker, Tag, FileText, FolderOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { api } from '@/lib/api/client';
import { APIError } from '@/lib/errors';
import { experimentDefKeys } from '@/lib/hooks/keys';
import { useQuery } from '@tanstack/react-query';

// =============================================================================
// TYPES
// =============================================================================

interface ExperimentListProps {
  readonly projectUri: string;
}

interface ExperimentRecord {
  uri: string;
  value: {
    name: string;
    description?: string;
    measureType?: string;
    taskType?: string;
    templateRefs?: string[];
    collectionRefs?: string[];
  };
}

// =============================================================================
// FETCH
// =============================================================================

/** Extracts a DID from a project AT-URI. */
function didFromUri(uri: string): string {
  const withoutScheme = uri.replace('at://', '');
  const slash = withoutScheme.indexOf('/');
  return slash >= 0 ? withoutScheme.slice(0, slash) : withoutScheme;
}

async function fetchExperimentDefs(repo: string): Promise<{ records: ExperimentRecord[] }> {
  const { data, error } = await api.GET('/xrpc/pub.layers.judgment.listExperimentDefs', {
    params: { query: { did: repo } },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch experiment definitions',
      undefined,
      '/xrpc/pub.layers.judgment.listExperimentDefs',
    );
  }

  return data as unknown as { records: ExperimentRecord[] };
}

function useProjectExperiments(repo: string) {
  return useQuery({
    queryKey: experimentDefKeys.list({ repo }),
    queryFn: () => fetchExperimentDefs(repo),
    enabled: Boolean(repo),
    staleTime: 120_000,
  });
}

// =============================================================================
// SKELETON
// =============================================================================

function ExperimentCardSkeleton(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EXPERIMENT CARD
// =============================================================================

function ExperimentCard({
  record,
  onClick,
}: {
  readonly record: ExperimentRecord;
  readonly onClick: () => void;
}): React.JSX.Element {
  const { value } = record;
  const templateCount = value.templateRefs?.length ?? 0;
  const collectionCount = value.collectionRefs?.length ?? 0;

  return (
    <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={onClick}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{value.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {value.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{value.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {value.taskType && (
            <Badge variant="secondary" className="text-[10px]">
              <Beaker className="mr-0.5 h-2.5 w-2.5" />
              {value.taskType}
            </Badge>
          )}
          {value.measureType && (
            <Badge variant="outline" className="text-[10px]">
              <Tag className="mr-0.5 h-2.5 w-2.5" />
              {value.measureType}
            </Badge>
          )}
          {templateCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              <FileText className="mr-0.5 h-2.5 w-2.5" />
              {templateCount} {templateCount === 1 ? 'template' : 'templates'}
            </Badge>
          )}
          {collectionCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              <FolderOpen className="mr-0.5 h-2.5 w-2.5" />
              {collectionCount} {collectionCount === 1 ? 'collection' : 'collections'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function ExperimentList({ projectUri }: ExperimentListProps): React.JSX.Element {
  const router = useRouter();
  const repo = didFromUri(projectUri);
  const { data, isLoading, isError } = useProjectExperiments(repo);

  const experiments = data?.records ?? [];

  function navigateToExperiment(uri: string): void {
    router.push(`/design/${encodeURIComponent(projectUri)}/experiments/${encodeURIComponent(uri)}`);
  }

  function navigateToNew(): void {
    router.push(`/design/${encodeURIComponent(projectUri)}/experiments/new`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Experiments</h2>
          <p className="text-sm text-muted-foreground">
            Experiment definitions for judgment collection and psycholinguistic tasks.
          </p>
        </div>
        <Button size="sm" onClick={navigateToNew}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Experiment
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExperimentCardSkeleton />
          <ExperimentCardSkeleton />
          <ExperimentCardSkeleton />
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">Failed to load experiments.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && experiments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FlaskConical className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No experiments yet. Create your first experiment to define a judgment collection task.
            </p>
            <Button size="sm" className="mt-4" onClick={navigateToNew}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Experiment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Experiment grid */}
      {!isLoading && !isError && experiments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {experiments.map((record) => (
            <ExperimentCard
              key={record.uri}
              record={record}
              onClick={() => navigateToExperiment(record.uri)}
            />
          ))}
        </div>
      )}

      {/* Project URI footer */}
      <div className="min-w-0">
        <p className="truncate font-mono text-xs text-muted-foreground">{projectUri}</p>
      </div>
    </div>
  );
}

export { ExperimentList };
