'use client';

/**
 * Client component for the ontology detail page.
 *
 * @packageDocumentation
 */

import { useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { TypeDefTree } from '@/components/ontologies/typedef-tree';
import { useOntology } from '@/lib/hooks/use-ontologies';
import { events } from '@/lib/observability/custom-events';

interface OntologyDetailContentProps {
  uri: string;
}

/**
 * Renders the full detail view for a single ontology record.
 */
function OntologyDetailContent({ uri }: OntologyDetailContentProps) {
  const { data: ontology, isLoading, error } = useOntology(uri);

  useEffect(() => {
    if (ontology) {
      events.ontologyBrowse({
        ontologyUri: uri,
        domain: ontology.value.domain ?? '',
      });
    }
  }, [uri, ontology]);

  if (isLoading) {
    return <OntologyDetailContentSkeleton />;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium text-destructive">Failed to load ontology</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
      </div>
    );
  }

  if (!ontology) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Ontology not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The ontology at <code className="text-xs">{uri}</code> could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{ontology.value.name}</h1>
          {ontology.value.version && <Badge variant="outline">v{ontology.value.version}</Badge>}
        </div>
        {ontology.value.description && (
          <p className="mt-2 text-muted-foreground">{ontology.value.description}</p>
        )}
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Creator</dt>
                <dd className="mt-0.5 font-mono text-xs">{ontology.uri.split('/')[2]}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">AT-URI</dt>
                <dd className="mt-0.5 break-all font-mono text-xs">{ontology.uri}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">CID</dt>
                <dd className="mt-0.5 truncate font-mono text-xs">{ontology.cid}</dd>
              </div>
              {ontology.value.version && (
                <div>
                  <dt className="font-medium text-muted-foreground">Version</dt>
                  <dd className="mt-0.5">{ontology.value.version}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-muted-foreground">Created</dt>
                <dd className="mt-0.5">
                  {new Date(ontology.value.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Type Definitions</CardTitle>
          </CardHeader>
          <CardContent>
            <TypeDefTree ontologyUri={uri} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton for ontology detail content while loading.
 */
function OntologyDetailContentSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-4">
          <Skeleton className="h-5 w-20" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-1 h-4 w-48" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export { OntologyDetailContent, OntologyDetailContentSkeleton };
