'use client';

/**
 * Faceted discovery surface.
 *
 * Cross-namespace browser over the 14 read namespaces. Each tab calls
 * the matching generated `useList*` hook from
 * `lib/api/generated/queries/`. No fetcher logic lives here — the
 * hooks are the single source of truth.
 */

import Link from 'next/link';
import { useState } from 'react';

import { useListExpressions } from '@/lib/api/generated/queries/expression';
import { useListCorpora } from '@/lib/api/generated/queries/corpus';
import { useListAnnotationLayers } from '@/lib/api/generated/queries/annotation';
import { useListOntologies } from '@/lib/api/generated/queries/ontology';
import { useListSegmentations } from '@/lib/api/generated/queries/segmentation';
import { useListAlignments } from '@/lib/api/generated/queries/alignment';
import { useListGraphNodes } from '@/lib/api/generated/queries/graph';
import { useListExperimentDefs } from '@/lib/api/generated/queries/judgment';
import { useListPersonas } from '@/lib/api/generated/queries/persona';
import { useListMedia } from '@/lib/api/generated/queries/media';
import { useListEprints } from '@/lib/api/generated/queries/eprint';
import { useListChangelogEntries } from '@/lib/api/generated/queries/changelog';
import { useListExternalRecords } from '@/lib/api/generated/queries/integration';
import { useListCollections } from '@/lib/api/generated/queries/resource';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface RecordView {
  uri: string;
  cid?: string;
  value?: Record<string, unknown>;
}

interface ListResponse {
  records?: readonly RecordView[];
  cursor?: string;
}

const TABS = [
  { id: 'expression', label: 'Expressions', useHook: useListExpressions },
  { id: 'corpus', label: 'Corpora', useHook: useListCorpora },
  { id: 'annotation', label: 'Annotations', useHook: useListAnnotationLayers },
  { id: 'segmentation', label: 'Segmentations', useHook: useListSegmentations },
  { id: 'alignment', label: 'Alignments', useHook: useListAlignments },
  { id: 'ontology', label: 'Ontologies', useHook: useListOntologies },
  { id: 'graph', label: 'Graph nodes', useHook: useListGraphNodes },
  { id: 'judgment', label: 'Experiments', useHook: useListExperimentDefs },
  { id: 'persona', label: 'Personas', useHook: useListPersonas },
  { id: 'media', label: 'Media', useHook: useListMedia },
  { id: 'eprint', label: 'Eprints', useHook: useListEprints },
  { id: 'resource', label: 'Collections', useHook: useListCollections },
  { id: 'changelog', label: 'Changelog', useHook: useListChangelogEntries },
  { id: 'foreign', label: 'Foreign', useHook: useListExternalRecords },
] as const;

export default function DiscoverPage(): React.JSX.Element {
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('expression');
  return (
    <main className="container mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
        <p className="text-sm text-muted-foreground">
          Browse every read namespace exposed by the appview. Hooks come from
          generated <code className="font-mono">lib/api/generated/queries/</code>.
        </p>
      </header>
      <Tabs
        value={active}
        onValueChange={(v) => setActive(v as (typeof TABS)[number]['id'])}
      >
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
            <DiscoverTab id={t.id} useHook={t.useHook} />
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}

function DiscoverTab({
  id,
  useHook,
}: {
  id: string;
  useHook: (params: Record<string, unknown>) => {
    data?: ListResponse;
    isPending: boolean;
    isError: boolean;
    error: unknown;
  };
}): React.JSX.Element {
  const { data, isPending, isError, error } = useHook({ limit: 50 });
  if (isPending) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
        Nothing here yet.
      </p>
    );
  }
  return (
    <ul className="grid gap-3">
      {records.map((record) => (
        <li key={record.uri}>
          <RecordCard record={record} namespace={id} />
        </li>
      ))}
    </ul>
  );
}

function RecordCard({
  record,
  namespace,
}: {
  record: RecordView;
  namespace: string;
}): React.JSX.Element {
  const value = record.value ?? {};
  const title =
    (value.id as string | undefined) ??
    (value.name as string | undefined) ??
    (value.title as string | undefined) ??
    record.uri.split('/').pop() ??
    record.uri;
  const detailHref = `/[kind]/${encodeURIComponent(record.uri)}`;
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="line-clamp-1 text-sm font-medium">
          <Link href={detailHref}>{title}</Link>
        </CardTitle>
        <Badge variant="outline" className="text-[10px]">
          {namespace}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">
        <p className="font-mono break-all line-clamp-2">{record.uri}</p>
      </CardContent>
    </Card>
  );
}
