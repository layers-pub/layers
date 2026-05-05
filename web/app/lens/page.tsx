'use client';

/**
 * "Lens any AT-URI to Layers" surface.
 *
 * Calls the generated `useApplyLens` hook from
 * `lib/api/generated/queries/integration.ts` with the URI from the
 * input or the search-param. Source + target panels stack on mobile,
 * sit side-by-side on desktop.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useApplyLens } from '@/lib/api/generated/queries/integration';
import { findLensBySource } from '@/lib/lenses/generated/registry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function LensPage(): React.JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const [uri, setUri] = useState(params.get('uri') ?? '');
  const [submitted, setSubmitted] = useState<string | null>(uri || null);

  useEffect(() => {
    const next = params.get('uri') ?? '';
    if (next && next !== uri) {
      setUri(next);
      setSubmitted(next);
    }
  }, [params, uri]);

  return (
    <main className="container mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Lens to Layers</h1>
        <p className="text-sm text-muted-foreground">
          Project any foreign ATProto record into the matching Layers shape via a
          panproto lens.
        </p>
      </header>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!uri.trim()) return;
          setSubmitted(uri.trim());
          router.replace(`/lens?uri=${encodeURIComponent(uri.trim())}`);
        }}
      >
        <Input
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          placeholder="at://did:plc:.../<collection>/<rkey>"
          className="flex-1 font-mono text-sm tap-target"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
        />
        <Button type="submit" className="tap-target">
          Apply lens
        </Button>
      </form>
      {submitted ? <LensResult uri={submitted} /> : <LensIntro />}
    </main>
  );
}

function LensIntro(): React.JSX.Element {
  return (
    <p className="mt-6 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
      Enter an AT-URI from any of the indexed upstream apps and we will project
      it into the matching `pub.layers.*` shape using the registered lens.
    </p>
  );
}

function LensResult({ uri }: { uri: string }): React.JSX.Element {
  const sourceNsid = nsidFromUri(uri);
  const lens = sourceNsid ? findLensBySource(sourceNsid) : undefined;
  const { data, isPending, isError, error, refetch } = useApplyLens({
    uri,
    fresh: false,
  });
  return (
    <section className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {lens ? (
          <>
            <Badge variant="outline">{lens.sourceNsid}</Badge>
            <span aria-hidden>→</span>
            <Badge>{lens.targetNsid}</Badge>
            <span className="text-muted-foreground">{lens.id}</span>
          </>
        ) : (
          <span className="text-muted-foreground">
            No lens registered for {sourceNsid ?? 'this URI'}; the orchestrator may still resolve via a panproto fallback.
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto tap-target"
          onClick={() => refetch()}
        >
          Refetch fresh
        </Button>
      </div>
      {isPending ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Failed to lens: {(error as Error)?.message ?? 'unknown error'}
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Source</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs text-muted-foreground break-all">
                {uri}
              </p>
              <pre className="mt-3 max-h-96 overflow-auto rounded bg-muted/40 p-3 text-[11px] leading-snug">
                {JSON.stringify(data, null, 2)}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Layers shape</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs text-muted-foreground break-all">
                {(data as { targetNsid?: string } | undefined)?.targetNsid ?? lens?.targetNsid ?? '—'}
              </p>
              <pre className="mt-3 max-h-96 overflow-auto rounded bg-muted/40 p-3 text-[11px] leading-snug">
                {JSON.stringify((data as { value?: unknown } | undefined)?.value ?? data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

function nsidFromUri(uri: string): string | null {
  const match = uri.match(/^at:\/\/[^/]+\/([^/]+)/);
  return match?.[1] ?? null;
}
