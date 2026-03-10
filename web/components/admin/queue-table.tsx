'use client';

/**
 * BullMQ queue depth table with progress bars for admin panel.
 *
 * @module
 */

import type { QueueDepth } from '@/lib/hooks/use-admin';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface QueueTableProps {
  readonly queues: QueueDepth[];
}

/**
 * Renders a table of BullMQ queue depths with a progress bar showing the
 * ratio of active jobs to total pending work (active + waiting).
 */
function QueueTable({ queues }: QueueTableProps): React.JSX.Element {
  if (queues.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No queue data available.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Queue</TableHead>
          <TableHead className="text-right">Waiting</TableHead>
          <TableHead className="text-right">Active</TableHead>
          <TableHead className="text-right">Completed</TableHead>
          <TableHead className="text-right">Failed</TableHead>
          <TableHead className="w-32">Progress</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queues.map((queue) => {
          const total = queue.active + queue.waiting;
          const progressValue = total > 0 ? (queue.active / total) * 100 : 0;

          return (
            <TableRow key={queue.name}>
              <TableCell className="font-medium">{queue.name}</TableCell>
              <TableCell className="text-right font-mono text-xs">
                {queue.waiting.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {queue.active.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {queue.completed.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {queue.failed.toLocaleString()}
              </TableCell>
              <TableCell>
                <Progress value={progressValue} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export type { QueueTableProps };
export { QueueTable };
