'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/layout/empty-state';
import { ErrorDisplay } from '@/components/layout/error-display';
import { useRecordList } from '@/lib/hooks/use-generic-record';
import {
  getRecordKindBySlug,
  type FieldMeta,
  type ParamMeta,
  type RecordKindMeta,
} from '@/lib/generated/record-registry';
import type { GenericRecord } from '@/lib/api/generic-record-client';

import { FieldValue } from './field-value';

const PREFERRED_COLUMNS: readonly string[] = [
  'name',
  'title',
  'label',
  'kind',
  'subkind',
  'language',
  'domain',
  'expression',
  'createdAt',
];

interface RecordBrowserProps {
  readonly slug: string;
}

export function RecordBrowser({ slug }: RecordBrowserProps): React.JSX.Element {
  const kind = getRecordKindBySlug(slug);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const requiredMissing = useMemo(
    () =>
      (kind?.listParams ?? []).filter(
        (p) => p.required && p.name !== 'cursor' && p.name !== 'limit' && !filters[p.name],
      ),
    [kind, filters],
  );

  const listQuery = useMemo(() => {
    const out: Record<string, unknown> = { limit: 25 };
    if (cursor) out.cursor = cursor;
    for (const [k, v] of Object.entries(filters)) {
      if (v !== '') out[k] = v;
    }
    return out;
  }, [filters, cursor]);

  const enabled = Boolean(kind) && requiredMissing.length === 0;
  const { data, isLoading, error } = useRecordList(slug, listQuery, enabled);

  const columns = useMemo(() => (kind ? pickColumns(kind) : []), [kind]);

  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    if (!search.trim()) return data.records;
    const needle = search.trim().toLowerCase();
    return data.records.filter((r) =>
      Object.values(r).some(
        (v) => typeof v === 'string' && v.toLowerCase().includes(needle),
      ),
    );
  }, [data?.records, search]);

  if (!kind) {
    return (
      <EmptyState
        title="Unknown record kind"
        description={`No lexicon registered for slug "${slug}".`}
      />
    );
  }

  const filterParams = kind.listParams.filter(
    (p) => p.name !== 'cursor' && p.name !== 'limit',
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{kind.title}</h1>
          <p className="text-sm text-muted-foreground">
            {kind.description || `Browse ${kind.title.toLowerCase()} records.`}
          </p>
          <p className="mt-1 text-xs font-mono text-muted-foreground">{kind.nsid}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Filter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full sm:w-64"
            aria-label={`Filter ${kind.title} by text`}
          />
          <Button variant="outline" render={<Link href={`/${slug}/new`} />}>
            New
          </Button>
        </div>
      </header>

      {filterParams.length > 0 ? (
        <FilterBar
          params={filterParams}
          values={filters}
          onChange={(name, value) => {
            setFilters((prev) => ({ ...prev, [name]: value }));
            setCursor(undefined);
          }}
        />
      ) : null}

      {error ? <ErrorDisplay error={error as Error} /> : null}

      {requiredMissing.length > 0 ? (
        <EmptyState
          title="Filter required"
          description={`Set the following to load records: ${requiredMissing.map((p) => p.name).join(', ')}.`}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title="No records yet"
          description={`No ${kind.title.toLowerCase()} records match the current filter.`}
        />
      ) : (
        <>
          <ResponsiveList kind={kind} columns={columns} records={filteredRecords} />
          {data?.cursor ? (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setCursor(data.cursor)}>
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function FilterBar({
  params,
  values,
  onChange,
}: {
  params: readonly ParamMeta[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}): React.JSX.Element {
  return (
    <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-3">
      {params.map((param) => (
        <div key={param.name} className="space-y-1">
          <Label htmlFor={`filter-${param.name}`} className="flex items-center gap-1 text-xs">
            <span>{param.name}</span>
            {param.required ? <span className="text-destructive">*</span> : null}
            {param.format ? (
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {param.format}
              </span>
            ) : null}
          </Label>
          <Input
            id={`filter-${param.name}`}
            type={param.type === 'number' ? 'number' : 'text'}
            placeholder={param.description ?? param.name}
            value={values[param.name] ?? ''}
            onChange={(e) => onChange(param.name, e.target.value)}
            className="h-9"
          />
        </div>
      ))}
    </div>
  );
}

function ResponsiveList({
  kind,
  columns,
  records,
}: {
  kind: RecordKindMeta;
  columns: readonly FieldMeta[];
  records: readonly GenericRecord[];
}): React.JSX.Element {
  return (
    <>
      <ul className="grid gap-3 md:hidden">
        {records.map((record) => (
          <li key={record.uri}>
            <Card>
              <CardHeader className="pb-2">
                <Link
                  href={`/${kind.slug}/${encodeURIComponent(record.uri)}`}
                  className="text-sm font-medium hover:underline"
                >
                  {displayTitle(record, columns) ?? record.uri}
                </Link>
                <div className="font-mono text-[11px] text-muted-foreground break-all">
                  {record.uri}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 text-sm">
                {columns.map((field) => (
                  <div key={field.name} className="flex flex-col gap-0.5">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </span>
                    <FieldValue field={field} value={record[field.name]} />
                  </div>
                ))}
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                <Badge variant="outline">{kind.title}</Badge>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URI</TableHead>
              {columns.map((field) => (
                <TableHead key={field.name}>{field.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.uri}>
                <TableCell className="max-w-[20rem]">
                  <Link
                    href={`/${kind.slug}/${encodeURIComponent(record.uri)}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {record.uri}
                  </Link>
                </TableCell>
                {columns.map((field) => (
                  <TableCell key={field.name}>
                    <FieldValue field={field} value={record[field.name]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function pickColumns(kind: RecordKindMeta): readonly FieldMeta[] {
  const byName = new Map(kind.fields.map((f) => [f.name, f]));
  const preferred: FieldMeta[] = [];
  for (const name of PREFERRED_COLUMNS) {
    const field = byName.get(name);
    if (field) preferred.push(field);
  }
  if (preferred.length >= 3) return preferred.slice(0, 5);
  for (const field of kind.fields) {
    if (preferred.includes(field)) continue;
    if (field.kind === 'object' || field.kind === 'array' || field.kind === 'blob') continue;
    preferred.push(field);
    if (preferred.length >= 5) break;
  }
  return preferred;
}

function displayTitle(record: GenericRecord, columns: readonly FieldMeta[]): string | undefined {
  for (const name of ['name', 'title', 'label']) {
    const v = record[name];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  for (const field of columns) {
    const v = record[field.name];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}
