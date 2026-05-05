'use client';

/**
 * Template list for a design project.
 *
 * Fetches templates and displays them as a grid of cards showing name,
 * template text preview (truncated), slot count, constraint count, and
 * language. Includes a "New Template" button that opens the template
 * editor in creation mode.
 *
 * @module
 */

import { useRouter } from 'next/navigation';
import { Plus, FileText, Puzzle, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useProjectTemplates, type TemplateRecordView } from '@/lib/hooks/use-design';

interface TemplateListProps {
  readonly projectUri: string;
}

/** Extracts a DID from a project AT-URI for use as the repo parameter. */
function didFromUri(uri: string): string {
  const withoutScheme = uri.replace('at://', '');
  const slash = withoutScheme.indexOf('/');
  return slash >= 0 ? withoutScheme.slice(0, slash) : withoutScheme;
}

function TemplateCardSkeleton(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateCard({
  record,
  onClick,
}: {
  readonly record: TemplateRecordView;
  readonly onClick: () => void;
}): React.JSX.Element {
  const { value } = record;
  const slotCount = value.slots?.length ?? 0;
  const constraintCount = value.constraints?.length ?? 0;
  const truncatedText = value.text.length > 120 ? `${value.text.slice(0, 120)}...` : value.text;

  return (
    <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={onClick}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{value.name || '(unnamed template)'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="line-clamp-2 font-mono text-xs text-muted-foreground">{truncatedText}</p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            <Puzzle className="mr-0.5 h-2.5 w-2.5" />
            {slotCount} {slotCount === 1 ? 'slot' : 'slots'}
          </Badge>
          {constraintCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
              {constraintCount} {constraintCount === 1 ? 'constraint' : 'constraints'}
            </Badge>
          )}
          {value.languages && (
            <Badge variant="outline" className="text-[10px]">
              {value.languages}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateList({ projectUri }: TemplateListProps): React.JSX.Element {
  const router = useRouter();
  const repo = didFromUri(projectUri);

  const { data, isLoading, isError } = useProjectTemplates(repo);

  const templates = data?.records ?? [];

  function navigateToTemplate(templateUri: string): void {
    router.push(
      `/design/${encodeURIComponent(projectUri)}/templates/${encodeURIComponent(templateUri)}`,
    );
  }

  function navigateToNew(): void {
    router.push(`/design/${encodeURIComponent(projectUri)}/templates/new`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground">
            Parameterized linguistic stimuli with slot placeholders and constraints.
          </p>
        </div>
        <Button size="sm" onClick={navigateToNew}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Template
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TemplateCardSkeleton />
          <TemplateCardSkeleton />
          <TemplateCardSkeleton />
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">Failed to load templates.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No templates yet. Create your first template to define parameterized stimuli.
            </p>
            <Button size="sm" className="mt-4" onClick={navigateToNew}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template grid */}
      {!isLoading && !isError && templates.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((record) => (
            <TemplateCard
              key={record.uri}
              record={record}
              onClick={() => navigateToTemplate(record.uri)}
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

export { TemplateList };
