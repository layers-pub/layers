'use client';

/**
 * Observations dashboard.
 *
 * The `layers-observer` worker publishes `dev.idiolect.observation`
 * records summarising annotation coverage, agreement, corpus growth,
 * and lens adoption. They land in the `external_records` table and
 * surface through the `pub.layers.integration.listExternal` query
 * (filtered by `nsid`); this page reads them via the generated hook
 * and groups by `method`.
 */

import { useMemo, useState } from 'react';

import { useListExternalRecords } from '@/lib/api/generated/queries/integration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  MobileDrawer,
  MobileDrawerContent,
  MobileDrawerHeader,
  MobileDrawerTitle,
  MobileDrawerTrigger,
} from '@/components/ui/mobile-drawer';

interface ObservationValue {
  readonly method?: string;
  readonly subject?: string;
  readonly observedAt?: string;
  readonly counts?: Record<string, number>;
  readonly metric?: number;
  readonly [key: string]: unknown;
}

interface ObservationRecord {
  readonly uri: string;
  readonly cid?: string;
  readonly value?: ObservationValue;
}

const KNOWN_METHODS = [
  'annotation_coverage',
  'agreement_by_layer',
  'corpus_growth',
  'lens_adoption',
] as const;

export default function ObservationsPage(): React.JSX.Element {
  const { data, isPending, isError, error } = useListExternalRecords({
    nsid: 'dev.idiolect.observation',
    limit: 100,
  });
  const grouped = useMemo(() => {
    const out: Record<string, ObservationRecord[]> = {};
    const records = (data?.records ?? []) as readonly ObservationRecord[];
    for (const record of records) {
      const method = record.value?.method ?? 'other';
      (out[method] ??= []).push(record);
    }
    return out;
  }, [data]);
  return (
    <main className="container mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Observations</h1>
        <p className="text-sm text-muted-foreground">
          Aggregates published by the observer worker. Each card groups one
          method's recent reports.
        </p>
      </header>
      {isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Failed to load: {(error as Error)?.message ?? 'unknown error'}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {KNOWN_METHODS.map((method) => (
            <li key={method}>
              <ObservationCard method={method} records={grouped[method] ?? []} />
            </li>
          ))}
          {Object.entries(grouped)
            .filter(([m]) => !KNOWN_METHODS.includes(m as (typeof KNOWN_METHODS)[number]))
            .map(([method, records]) => (
              <li key={method}>
                <ObservationCard method={method} records={records} />
              </li>
            ))}
        </ul>
      )}
    </main>
  );
}

function ObservationCard({
  method,
  records,
}: {
  method: string;
  records: readonly ObservationRecord[];
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const latest = records[0];
  const summary = latest?.value;
  return (
    <MobileDrawer open={open} onOpenChange={setOpen}>
      <MobileDrawerTrigger className="block w-full text-left">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {method.replace(/_/g, ' ')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{records.length} reports</Badge>
              {summary?.observedAt ? (
                <span className="text-muted-foreground">
                  latest {new Date(summary.observedAt).toLocaleString()}
                </span>
              ) : null}
            </div>
            {summary?.counts ? (
              <SparkRow counts={summary.counts} />
            ) : (
              <p className="text-muted-foreground">No reports yet.</p>
            )}
          </CardContent>
        </Card>
      </MobileDrawerTrigger>
      <MobileDrawerContent className="md:max-w-2xl">
        <MobileDrawerHeader>
          <MobileDrawerTitle>{method}</MobileDrawerTitle>
        </MobileDrawerHeader>
        <div className="px-4 pb-6">
          <pre className="max-h-[60dvh] overflow-auto rounded bg-muted/40 p-3 text-[11px] leading-snug">
            {JSON.stringify(records, null, 2)}
          </pre>
        </div>
      </MobileDrawerContent>
    </MobileDrawer>
  );
}

function SparkRow({ counts }: { counts: Record<string, number> }): React.JSX.Element {
  const entries = Object.entries(counts).slice(0, 6);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <ul className="grid gap-1">
      {entries.map(([label, value]) => (
        <li key={label} className="flex items-center gap-2">
          <span className="w-24 truncate text-muted-foreground">{label}</span>
          <span
            className="h-1 rounded-full bg-primary"
            style={{ width: `${(value / max) * 100}%` }}
            aria-hidden
          />
          <span className="ml-auto font-mono">{value}</span>
        </li>
      ))}
    </ul>
  );
}
