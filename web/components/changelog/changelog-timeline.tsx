'use client';

/**
 * Reusable changelog timeline grouped by subject URI.
 *
 * @module
 */

import type { ChangelogEntry } from '@/lib/hooks/use-changelog';
import { truncateText } from '@/lib/utils/format';

import { ChangelogEntryRow } from './changelog-entry-row';

interface ChangelogTimelineProps {
  readonly entries: ChangelogEntry[];
}

/**
 * Groups changelog entries by their subject URI.
 */
function groupBySubject(entries: ChangelogEntry[]): Map<string, ChangelogEntry[]> {
  const groups = new Map<string, ChangelogEntry[]>();

  for (const entry of entries) {
    const subject = entry.value.subject;
    const existing = groups.get(subject);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(subject, [entry]);
    }
  }

  return groups;
}

/**
 * Renders changelog entries grouped by subject URI with a left border
 * timeline indicator. Each group shows a monospace URI header followed
 * by indented entry rows.
 */
function ChangelogTimeline({ entries }: ChangelogTimelineProps): React.JSX.Element {
  const groups = groupBySubject(entries);

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No changelog entries found.</p>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([subjectUri, groupEntries]) => (
        <div key={subjectUri} className="rounded-lg border">
          <div className="border-b bg-muted/30 px-3 py-2">
            <code className="text-xs text-muted-foreground">{truncateText(subjectUri, 80)}</code>
          </div>
          <div className="border-l-2 border-muted-foreground/20 ml-3 my-2">
            <div className="space-y-0.5 pl-3">
              {groupEntries.map((entry) => (
                <ChangelogEntryRow key={entry.uri} entry={entry} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export type { ChangelogTimelineProps };
export { ChangelogTimeline };
