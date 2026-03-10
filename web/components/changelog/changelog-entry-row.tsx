'use client';

/**
 * Single changelog entry row displaying subject collection and summary.
 *
 * @module
 */

import { FileText } from 'lucide-react';

import type { ChangelogEntry } from '@/lib/hooks/use-changelog';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

interface ChangelogEntryRowProps {
  readonly entry: ChangelogEntry;
}

/**
 * Extracts a short collection label from a full NSID.
 *
 * @example
 * ```typescript
 * shortCollection('pub.layers.expression.expression'); // 'expression'
 * shortCollection('pub.layers.annotation.annotationLayer'); // 'annotationLayer'
 * ```
 */
function shortCollection(collection: string): string {
  const parts = collection.split('.');
  return parts[parts.length - 1] ?? collection;
}

/**
 * Renders a single changelog entry with collection badge, summary, and
 * relative timestamp.
 */
function ChangelogEntryRow({ entry }: ChangelogEntryRowProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm',
        'transition-colors hover:bg-muted/50',
      )}
    >
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Badge variant="outline" className="shrink-0 font-mono text-xs">
        {shortCollection(entry.value.subjectCollection)}
      </Badge>
      <span className="truncate text-sm text-foreground">{entry.value.summary}</span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
        {formatRelativeTime(entry.value.createdAt)}
      </span>
    </div>
  );
}

export type { ChangelogEntryRowProps };
export { ChangelogEntryRow, shortCollection };
