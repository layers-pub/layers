'use client';

/**
 * Per-DID profile.
 *
 * Reads contributions from every namespace by calling the generated
 * `useList*` hooks with `did` filters. No hand-written fetchers — the
 * generated hooks are the data layer.
 */

import { use, useState } from 'react';
import Link from 'next/link';

import { useListExpressions } from '@/lib/api/generated/queries/expression';
import { useListCorpora } from '@/lib/api/generated/queries/corpus';
import { useListAnnotationLayers } from '@/lib/api/generated/queries/annotation';
import { useListExperimentDefs } from '@/lib/api/generated/queries/judgment';
import { useListExternalRecords } from '@/lib/api/generated/queries/integration';
import { useListChangelogEntries } from '@/lib/api/generated/queries/changelog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ListResponse {
  records?: readonly { uri: string; cid?: string; value?: Record<string, unknown> }[];
  cursor?: string;
}

const TABS = [
  { id: 'expressions', label: 'Expressions', useHook: useListExpressions },
  { id: 'corpora', label: 'Corpora', useHook: useListCorpora },
  { id: 'annotations', label: 'Annotations', useHook: useListAnnotationLayers },
  { id: 'experiments', label: 'Experiments', useHook: useListExperimentDefs },
  { id: 'foreign', label: 'Imports', useHook: useListExternalRecords },
  { id: 'activity', label: 'Activity', useHook: useListChangelogEntries },
] as const;

export default function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}): React.JSX.Element {
  const { handle } = use(params);
  const did = decodeURIComponent(handle);
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('expressions');
  return (
    <main className="container mx-auto max-w-4xl px-4 pb-24 pt-6 md:pb-6">
      <header className="mb-6 flex items-center gap-3">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="font-mono text-xs">
            {did.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate font-mono text-base font-medium">{did}</h1>
          <p className="text-xs text-muted-foreground">
            Contributions across the appview
          </p>
        </div>
      </header>
      <Tabs value={active} onValueChange={(v) => setActive(v as (typeof TABS)[number]['id'])}>
        <TabsList className="overflow-x-auto h-auto flex flex-wrap justify-start gap-1 md:gap-2 bg-transparent p-0">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="tap-target rounded-full border bg-background data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-4">
            <ProfileTab did={did} useHook={t.useHook} />
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}

function ProfileTab({
  did,
  useHook,
}: {
  did: string;
  useHook: (params: Record<string, unknown>) => {
    data?: ListResponse;
    isPending: boolean;
    isError: boolean;
    error: unknown;
  };
}): React.JSX.Element {
  const { data, isPending, isError, error } = useHook({ did, limit: 25 });
  if (isPending) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
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
        Nothing here.
      </p>
    );
  }
  return (
    <ul className="grid gap-3">
      {records.map((record) => {
        const value = record.value ?? {};
        const title =
          (value.id as string | undefined) ??
          (value.name as string | undefined) ??
          record.uri.split('/').pop() ??
          record.uri;
        return (
          <li key={record.uri}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="line-clamp-1 text-sm font-medium">
                  <Link href={`/[kind]/${encodeURIComponent(record.uri)}`}>
                    {title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                <p className="font-mono break-all line-clamp-1">{record.uri}</p>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
