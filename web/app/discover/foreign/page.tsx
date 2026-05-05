'use client';

/**
 * Foreign-record browser.
 *
 * Tabs across the upstream NSID prefixes derived from the generated
 * lens registry, calling `pub.layers.integration.listExternal` per
 * prefix. Each card shows the upstream record and offers a "Lens to
 * Layers" affordance that opens the `/lens` page pre-filled.
 */

import Link from 'next/link';
import { useState } from 'react';

import { useListExternalRecords } from '@/lib/api/generated/queries/integration';
import {
  lensRegistry,
  lensSourcePrefixes,
} from '@/lib/lenses/generated/registry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ForeignBrowserPage(): React.JSX.Element {
  const prefixes = lensSourcePrefixes();
  const [active, setActive] = useState<string>(prefixes[0] ?? 'all');
  return (
    <main className="container mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Foreign records
        </h1>
        <p className="text-sm text-muted-foreground">
          Cross-app records the indexer ingests via {lensRegistry.length} panproto lenses.
          Pick an upstream to browse what is currently indexed.
        </p>
      </header>
      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="overflow-x-auto h-auto flex flex-wrap justify-start gap-1 md:gap-2 bg-transparent p-0">
          {prefixes.map((p) => (
            <TabsTrigger
              key={p}
              value={p}
              className="tap-target rounded-full border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {p}
            </TabsTrigger>
          ))}
        </TabsList>
        {prefixes.map((p) => (
          <TabsContent key={p} value={p} className="mt-4">
            <ForeignTab prefix={p} />
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}

function ForeignTab({ prefix }: { prefix: string }): React.JSX.Element {
  const { data, isPending, isError, error } = useListExternalRecords({
    nsidPrefix: prefix,
    limit: 50,
  });
  if (isPending) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        Failed to load: {(error as Error)?.message ?? 'unknown error'}
      </p>
    );
  }
  const records = data?.records ?? [];
  if (records.length === 0) {
    return (
      <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        No `{prefix}.*` records indexed yet.
      </p>
    );
  }
  return (
    <ul className="grid gap-3">
      {records.map((record) => (
        <li key={record.uri}>
          <ForeignCard record={record} />
        </li>
      ))}
    </ul>
  );
}

function ForeignCard({
  record,
}: {
  record: { uri: string; cid?: string; value?: Record<string, unknown> };
}): React.JSX.Element {
  const value = record.value ?? {};
  const nsid = record.uri.split('/').slice(2, 3).join('') || 'unknown';
  const title =
    (value.title as string | undefined) ??
    (value.name as string | undefined) ??
    (value.shout as string | undefined) ??
    (value.text as string | undefined)?.slice(0, 80) ??
    record.uri.split('/').pop() ??
    record.uri;
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="line-clamp-1 text-sm font-medium">{title}</CardTitle>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {nsid}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="font-mono text-xs text-muted-foreground break-all line-clamp-2">
          {record.uri}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/lens?uri=${encodeURIComponent(record.uri)}`}
            className="tap-target inline-flex items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            View as Layers
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
