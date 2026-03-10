'use client';

/**
 * Client component for the corpora list page.
 *
 * @packageDocumentation
 */

import { useState } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCorpora } from '@/lib/hooks/use-corpora';

/** Number of corpora to fetch per page. */
const PAGE_SIZE = 20;

/**
 * Encodes an AT-URI for use in a URL path by stripping the `at://` prefix
 * and splitting on slashes for the catch-all route segment.
 */
function encodeCorpusPath(uri: string): string {
  const withoutPrefix = uri.replace(/^at:\/\//, '');
  return withoutPrefix.split('/').map(encodeURIComponent).join('/');
}

/**
 * Renders a paginated list of corpora as cards with load-more pagination.
 */
function CorporaContent() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { data, isLoading, error } = useCorpora({ limit: PAGE_SIZE, cursor });

  if (isLoading) {
    return <CorporaContentSkeleton />;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium text-destructive">Failed to load corpora</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
      </div>
    );
  }

  if (!data || data.records.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">No corpora found</p>
        <p className="mt-1 text-sm text-muted-foreground">No corpora have been indexed yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.records.map((corpus) => (
          <Link
            key={corpus.uri}
            href={`/corpora/${encodeCorpusPath(corpus.uri)}`}
            className="block"
          >
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{corpus.value.name}</CardTitle>
                  {corpus.value.language && <Badge variant="secondary">{corpus.value.language}</Badge>}
                </div>
                {corpus.value.description && (
                  <CardDescription className="line-clamp-2">{corpus.value.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="truncate text-xs text-muted-foreground/70">{corpus.uri}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {data.cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setCursor(data.cursor)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for the corpora content while loading.
 */
function CorporaContentSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-10" />
          </div>
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-2/3" />
          <Skeleton className="mt-4 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export { CorporaContent, CorporaContentSkeleton };
