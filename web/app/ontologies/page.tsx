'use client';

/**
 * Ontologies list page. Reads from the generated
 * `useListOntologies` hook.
 */

import Link from 'next/link';

import { useListOntologies } from '@/lib/api/generated/queries/ontology';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function OntologiesPage(): React.JSX.Element {
  const { data, isPending, isError, error } = useListOntologies({ limit: 50 });
  return (
    <main className="container mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Ontologies</h1>
        <p className="text-sm text-muted-foreground">
          Annotation type systems and their definitions.
        </p>
      </header>
      {isPending ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-28 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Failed to load: {(error as Error)?.message ?? 'unknown error'}
        </p>
      ) : (data?.records ?? []).length === 0 ? (
        <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          No ontologies indexed yet.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {(data?.records ?? []).map((record) => {
            const value = (record.value ?? {}) as {
              name?: string;
              id?: string;
              description?: string;
            };
            const title =
              value.name ?? value.id ?? record.uri.split('/').pop() ?? record.uri;
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
                    {value.description ? (
                      <p className="line-clamp-2">{value.description}</p>
                    ) : null}
                    <p className="mt-1 font-mono break-all line-clamp-1 text-[10px]">
                      {record.uri}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
