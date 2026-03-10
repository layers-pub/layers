'use client';

/**
 * Dead letter queue table for admin panel.
 *
 * @module
 */

import { RefreshCw, Trash2 } from 'lucide-react';

import type { DLQEntry } from '@/lib/hooks/use-admin';
import { formatRelativeTime, truncateText } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DLQTableProps {
  readonly entries: DLQEntry[];
  readonly onRetry: (id: string) => void;
  readonly onDismiss: (id: string) => void;
}

/**
 * Renders a table of DLQ entries with retry and dismiss actions.
 * Error messages are truncated with full text available via tooltip.
 */
function DLQTable({ entries, onRetry, onDismiss }: DLQTableProps): React.JSX.Element {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No dead letter queue entries. All records indexed successfully.
      </p>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>URI</TableHead>
            <TableHead>Error</TableHead>
            <TableHead className="text-right">Failures</TableHead>
            <TableHead>Last Failed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <code className="text-xs">{truncateText(entry.uri, 50)}</code>
              </TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger className="cursor-help text-left text-xs text-muted-foreground">
                    {truncateText(entry.error, 40)}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm">
                    <p className="break-all text-xs">{entry.error}</p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="text-right font-mono text-xs">{entry.failureCount}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatRelativeTime(entry.lastFailedAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => onRetry(entry.id)}>
                    <RefreshCw className="h-3 w-3" />
                    <span className="sr-only">Retry</span>
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => onDismiss(entry.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

export type { DLQTableProps };
export { DLQTable };
