'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { ErrorDisplay } from '@/components/layout/error-display';
import { useRecord } from '@/lib/hooks/use-generic-record';
import { getRecordKindBySlug } from '@/lib/generated/record-registry';

import { FieldValue } from './field-value';

interface RecordDetailProps {
  readonly slug: string;
  readonly uri: string;
}

export function RecordDetail({ slug, uri }: RecordDetailProps): React.JSX.Element {
  const kind = getRecordKindBySlug(slug);
  const { data: record, isLoading, error } = useRecord(slug, uri);

  if (!kind) {
    return (
      <EmptyState title="Unknown record kind" description={`No lexicon registered for "${slug}".`} />
    );
  }

  return (
    <article className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{kind.title}</h1>
            <Badge variant="outline">{kind.nsid}</Badge>
          </div>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{uri}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" render={<Link href={`/${kind.slug}`} />}>
            All {kind.title.toLowerCase()}
          </Button>
          <Button render={<Link href={`/${kind.slug}/${encodeURIComponent(uri)}/edit`} />}>
            Edit
          </Button>
        </div>
      </header>

      {error ? <ErrorDisplay error={error as Error} /> : null}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !record ? (
        <EmptyState title="Record not found" description="The record does not exist or is unavailable." />
      ) : (
        <Card>
          <CardHeader className="border-b pb-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Fields
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y">
              {kind.fields.map((field) => (
                <div
                  key={field.name}
                  className="grid grid-cols-1 gap-1 p-4 md:grid-cols-[14rem,1fr] md:gap-6"
                >
                  <dt className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{field.label}</span>
                    {field.description ? (
                      <span className="text-xs text-muted-foreground">{field.description}</span>
                    ) : null}
                    {field.required ? (
                      <Badge variant="outline" className="mt-1 w-fit text-[10px]">
                        required
                      </Badge>
                    ) : null}
                  </dt>
                  <dd className="min-w-0 text-sm">
                    <FieldValue field={field} value={record[field.name]} />
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </article>
  );
}
