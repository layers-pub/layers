'use client';

/**
 * Generic fallback renderers driven by generated lexicon field
 * metadata.
 *
 * @remarks
 * Whenever no concrete renderer is registered for an annotation's
 * `(kind, anchor)` cell, the registry mounts these. Each one looks
 * the annotation's NSID up against
 * `web/lib/forms/generated/<nsid>.fields.ts` and renders a labelled
 * list of fields. New annotation types added to the lexicons get
 * sensible UI for free without touching component code.
 */

import { useEffect, useState } from 'react';

import type { AnnotationSlotProps } from '@/components/annotations/registry.js';
import { loadFields } from '@/lib/forms/generated/index.js';
import type { FormField } from '@/lib/forms/generated/index.js';

interface FieldMetadata {
  readonly fields: readonly FormField[];
}

/**
 * React-friendly cache for the lazy-loaded `fields` modules. The
 * underlying loader is async (dynamic import); we memoise per NSID.
 */
const FIELDS_CACHE = new Map<string, readonly FormField[]>();

function useFieldMetadata(nsid: string): readonly FormField[] | null {
  const [fields, setFields] = useState<readonly FormField[] | null>(
    FIELDS_CACHE.get(nsid) ?? null,
  );
  useEffect(() => {
    let cancelled = false;
    if (FIELDS_CACHE.has(nsid)) {
      setFields(FIELDS_CACHE.get(nsid)!);
      return;
    }
    void loadFields(nsid).then((result) => {
      if (cancelled || !result) return;
      const fs = result as readonly FormField[];
      FIELDS_CACHE.set(nsid, fs);
      setFields(fs);
    });
    return () => {
      cancelled = true;
    };
  }, [nsid]);
  return fields;
}

/**
 * Pick the most suitable string field to use as a primary label —
 * looks for `label`, `name`, `tag`, `value` (in that order) before
 * falling back to the URI's rkey.
 */
function pickPrimaryLabel(
  value: Record<string, unknown>,
  uri: string,
): string {
  for (const key of ['label', 'name', 'tag', 'value', 'predicate', 'id']) {
    const v = value[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return uri.split('/').pop() ?? uri;
}

/** Inline overlay fallback. Highlights the textual locus with the primary label. */
export function GenericInline({ annotation }: AnnotationSlotProps): React.JSX.Element {
  const label = pickPrimaryLabel(annotation.value, annotation.uri);
  return (
    <span className="rounded-sm bg-primary/15 px-0.5 py-px text-xs font-medium text-primary underline decoration-dotted underline-offset-2">
      {label}
    </span>
  );
}

/** Card-feed fallback — labelled key/value list driven by lexicon metadata. */
export function GenericCard({ annotation }: AnnotationSlotProps): React.JSX.Element {
  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">
          {pickPrimaryLabel(annotation.value, annotation.uri)}
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {annotation.kind}
        </span>
      </header>
      <FieldList annotation={annotation} maxFields={6} />
    </article>
  );
}

/** Detail-drawer fallback — full lexicon-derived field list, scrollable. */
export function GenericDetail({ annotation }: AnnotationSlotProps): React.JSX.Element {
  return (
    <div className="space-y-3 px-4 py-2">
      <p className="font-mono text-xs text-muted-foreground break-all">
        {annotation.uri}
      </p>
      <FieldList annotation={annotation} />
    </div>
  );
}

function FieldList({
  annotation,
  maxFields,
}: {
  annotation: AnnotationSlotProps['annotation'];
  maxFields?: number;
}): React.JSX.Element {
  const fields = useFieldMetadata(annotation.nsid);
  if (fields === null) {
    return <p className="text-xs text-muted-foreground">Loading metadata…</p>;
  }
  const view = maxFields ? fields.slice(0, maxFields) : fields;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
      {view.map((field) => {
        const v = annotation.value[field.name];
        if (v === undefined || v === null) return null;
        return (
          <div className="contents" key={field.name}>
            <dt className="text-muted-foreground">{field.label}</dt>
            <dd className="break-words font-mono">{renderValue(v)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return (
      <span>
        [
        {value
          .slice(0, 3)
          .map((v, i) => (
            <span key={i}>
              {i > 0 ? ', ' : ''}
              {typeof v === 'object' ? '…' : String(v)}
            </span>
          ))}
        {value.length > 3 ? `, +${value.length - 3} more` : ''}]
      </span>
    );
  }
  return <code className="text-[10px]">{'{…}'}</code>;
}
