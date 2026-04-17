'use client';

import type { FieldMeta } from '@/lib/generated/record-registry';
import { Badge } from '@/components/ui/badge';

import { RecordLink } from './record-link';

interface FieldValueProps {
  readonly field: FieldMeta;
  readonly value: unknown;
}

/**
 * Generic field renderer that dispatches on `field.kind`. Used by both the
 * record browser (table cells) and the record detail page.
 */
export function FieldValue({ field, value }: FieldValueProps): React.JSX.Element {
  if (value === undefined || value === null || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }

  switch (field.kind) {
    case 'ref':
      return <RecordLink uri={String(value)} />;
    case 'datetime':
      return <time dateTime={String(value)}>{formatDate(String(value))}</time>;
    case 'enum':
      return <Badge variant="secondary">{String(value)}</Badge>;
    case 'boolean':
      return <Badge variant={value ? 'default' : 'outline'}>{value ? 'true' : 'false'}</Badge>;
    case 'number':
      return <span className="font-mono tabular-nums">{String(value)}</span>;
    case 'blob':
      return <span className="font-mono text-xs text-muted-foreground">[blob]</span>;
    case 'array': {
      const arr = Array.isArray(value) ? value : [];
      if (arr.length === 0) return <span className="text-muted-foreground">empty</span>;
      if (field.itemKind === 'ref') {
        return (
          <ul className="space-y-1">
            {arr.slice(0, 8).map((item, i) => (
              <li key={i}>
                <RecordLink uri={String(item)} />
              </li>
            ))}
            {arr.length > 8 ? (
              <li className="text-xs text-muted-foreground">…and {arr.length - 8} more</li>
            ) : null}
          </ul>
        );
      }
      return (
        <div className="flex flex-wrap gap-1">
          {arr.slice(0, 12).map((item, i) => (
            <Badge key={i} variant="outline">
              {truncate(String(item), 32)}
            </Badge>
          ))}
          {arr.length > 12 ? (
            <span className="text-xs text-muted-foreground">+{arr.length - 12}</span>
          ) : null}
        </div>
      );
    }
    case 'object':
      return (
        <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    case 'string':
    default: {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      if (str.length > 120) {
        return (
          <details className="group">
            <summary className="cursor-pointer text-sm">{truncate(str, 120)}</summary>
            <div className="mt-1 whitespace-pre-wrap break-words text-sm">{str}</div>
          </details>
        );
      }
      return <span className="break-words">{str}</span>;
    }
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
