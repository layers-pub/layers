'use client';

/**
 * Generic form driven by the panproto-generated registry.
 *
 * Renders per-field inputs dispatched on `FieldMeta.kind`. Submits via the
 * authenticated atproto Agent (`com.atproto.repo.createRecord` for new
 * records, `putRecord` when editing an existing URI). All 26 record kinds
 * share this surface; bespoke overrides live next to the generic route.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAgent, useCurrentUser } from '@/lib/auth';
import { getRecordKindBySlug, type FieldMeta } from '@/lib/generated/record-registry';

import { FieldValue } from './field-value';

interface RecordFormProps {
  readonly slug: string;
  readonly initialUri?: string;
  readonly initial?: Record<string, unknown>;
}

export function RecordForm({ slug, initialUri, initial = {} }: RecordFormProps): React.JSX.Element {
  const kind = getRecordKindBySlug(slug);
  const router = useRouter();
  const agent = useAgent();
  const user = useCurrentUser();
  const [state, setState] = useState<Record<string, unknown>>(() => ({ ...initial }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = useMemo(() => kind?.fields ?? [], [kind]);

  const setField = useCallback((name: string, value: unknown) => {
    setState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!kind) return;
      setError(null);
      if (!agent || !user?.did) {
        setError('You must be signed in to create or edit records.');
        return;
      }
      const record = coerceRecord(state, fields);
      if (!record.createdAt && fields.some((f) => f.name === 'createdAt')) {
        record.createdAt = new Date().toISOString();
      }
      setSubmitting(true);
      try {
        if (initialUri) {
          const rkey = initialUri.split('/').pop() ?? '';
          await agent.com.atproto.repo.putRecord({
            repo: user.did,
            collection: kind.nsid,
            rkey,
            record,
          });
          toast.success(`${kind.title} updated`);
          router.push(`/${kind.slug}/${encodeURIComponent(initialUri)}`);
        } else {
          const res = await agent.com.atproto.repo.createRecord({
            repo: user.did,
            collection: kind.nsid,
            record,
          });
          toast.success(`${kind.title} created`);
          router.push(`/${kind.slug}/${encodeURIComponent(res.data.uri)}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        toast.error(`Failed to save: ${msg}`);
      } finally {
        setSubmitting(false);
      }
    },
    [agent, fields, initialUri, kind, router, state, user?.did],
  );

  if (!kind) {
    return <div className="text-sm text-muted-foreground">Unknown record kind.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">
          {initialUri ? `Edit ${kind.title}` : `New ${kind.title}`}
        </h1>
        <p className="font-mono text-xs text-muted-foreground">{kind.nsid}</p>
      </header>

      {error ? (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-5">
        {fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={state[field.name]}
            onChange={(v) => setField(field.name, v)}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initialUri ? 'Save changes' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

function coerceRecord(
  state: Record<string, unknown>,
  fields: readonly FieldMeta[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = state[field.name];
    if (raw === undefined || raw === '') continue;
    out[field.name] = coerceField(field, raw);
  }
  return out;
}

function coerceField(field: FieldMeta, value: unknown): unknown {
  switch (field.kind) {
    case 'number':
      return typeof value === 'number' ? value : Number(value);
    case 'boolean':
      return Boolean(value);
    case 'array':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [value];
        } catch {
          return value
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }
      }
      return value;
    case 'object':
    case 'union':
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    default:
      return value;
  }
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldMeta;
  value: unknown;
  onChange: (v: unknown) => void;
}): React.JSX.Element {
  const id = `field-${field.name}`;

  const labelEl = (
    <Label htmlFor={id} className="flex items-baseline justify-between">
      <span>
        {field.label}
        {field.required ? <span className="ml-1 text-destructive">*</span> : null}
      </span>
      <span className="text-xs font-normal text-muted-foreground">{field.kind}</span>
    </Label>
  );

  if (field.kind === 'enum' && field.enumValues) {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Select value={(value as string) ?? ''} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.enumValues.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.kind === 'boolean') {
    return (
      <div className="flex items-center justify-between gap-4">
        {labelEl}
        <Switch
          id={id}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
        />
      </div>
    );
  }

  if (field.kind === 'object' || field.kind === 'array' || field.kind === 'union') {
    const str =
      typeof value === 'string'
        ? value
        : value === undefined
          ? ''
          : JSON.stringify(value, null, 2);
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Textarea
          id={id}
          value={str}
          rows={6}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          placeholder={field.kind === 'array' ? '["item1", "item2"]' : '{ "key": "value" }'}
        />
        {field.description ? (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        ) : null}
      </div>
    );
  }

  if (field.kind === 'blob') {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Input id={id} type="file" disabled />
        <p className="text-xs text-muted-foreground">
          Blob uploads are not supported from the generic form yet. Use the kind-specific
          workspace instead.
        </p>
        <FieldValue field={field} value={value} />
      </div>
    );
  }

  const longish =
    field.kind === 'string' && (field.name.endsWith('Description') || field.name.endsWith('Notes'));

  return (
    <div className="space-y-1.5">
      {labelEl}
      {longish ? (
        <Textarea
          id={id}
          rows={4}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={
            field.kind === 'number'
              ? 'number'
              : field.kind === 'datetime'
                ? 'datetime-local'
                : 'text'
          }
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.description ? (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      ) : null}
    </div>
  );
}
