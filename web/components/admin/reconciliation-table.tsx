'use client';

/**
 * Reconciliation status table for admin panel.
 *
 * @module
 */

import { CheckCircle2, XCircle } from 'lucide-react';

import type { ReconciliationStatus } from '@/lib/hooks/use-admin';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ReconciliationTableProps {
  readonly statuses: ReconciliationStatus[];
}

/**
 * Renders reconciliation status comparing record counts across PostgreSQL,
 * Elasticsearch, and Neo4j. Highlights mismatches with a red indicator.
 */
function ReconciliationTable({ statuses }: ReconciliationTableProps): React.JSX.Element {
  if (statuses.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No reconciliation data available. Run a reconciliation check to compare backends.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Table</TableHead>
          <TableHead className="text-right">PostgreSQL</TableHead>
          <TableHead className="text-right">Elasticsearch</TableHead>
          <TableHead className="text-right">Neo4j</TableHead>
          <TableHead className="text-right">Mismatches</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {statuses.map((status) => {
          const isHealthy = status.mismatches === 0;

          return (
            <TableRow key={status.table}>
              <TableCell className="font-medium">{status.table}</TableCell>
              <TableCell className="text-right font-mono text-xs">
                {status.pgCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {status.esCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {status.neo4jCount.toLocaleString()}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-mono text-xs',
                  !isHealthy && 'font-semibold text-destructive',
                )}
              >
                {status.mismatches.toLocaleString()}
              </TableCell>
              <TableCell className="text-center">
                {isHealthy ? (
                  <CheckCircle2 className="mx-auto h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="mx-auto h-4 w-4 text-destructive" />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export type { ReconciliationTableProps };
export { ReconciliationTable };
