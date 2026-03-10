'use client';

/**
 * Client component for the corpus detail page.
 *
 * @packageDocumentation
 */

import { useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCorpus } from '@/lib/hooks/use-corpora';
import { events } from '@/lib/observability/custom-events';

interface CorpusDetailContentProps {
  uri: string;
}

/**
 * Renders the full detail view for a single corpus record.
 */
function CorpusDetailContent({ uri }: CorpusDetailContentProps) {
  const { data: corpus, isLoading, error } = useCorpus(uri);

  useEffect(() => {
    if (corpus) {
      events.corpusBrowse({
        corpusUri: uri,
        corpusName: corpus.value.name ?? '',
      });
    }
  }, [uri, corpus]);

  if (isLoading) {
    return <CorpusDetailContentSkeleton />;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium text-destructive">Failed to load corpus</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
      </div>
    );
  }

  if (!corpus) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Corpus not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The corpus at <code className="text-xs">{uri}</code> could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{corpus.value.name}</h1>
          {corpus.value.language && <Badge variant="secondary">{corpus.value.language}</Badge>}
        </div>
        {corpus.value.description && (
          <p className="mt-2 text-muted-foreground">{corpus.value.description}</p>
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
                <dd className="mt-0.5 font-mono text-xs">{corpus.uri.split('/')[2]}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">AT-URI</dt>
                <dd className="mt-0.5 break-all font-mono text-xs">{corpus.uri}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">CID</dt>
                <dd className="mt-0.5 truncate font-mono text-xs">{corpus.cid}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Created</dt>
                <dd className="mt-0.5">{new Date(corpus.value.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Membership</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No membership data available.</p>
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Annotation Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No statistics available.</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for corpus detail content while loading.
 */
function CorpusDetailContentSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-4">
          <Skeleton className="h-5 w-20" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-1 h-4 w-48" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export { CorpusDetailContent, CorpusDetailContentSkeleton };
