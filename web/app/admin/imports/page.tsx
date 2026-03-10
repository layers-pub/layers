'use client';

/**
 * Admin import history page showing format import jobs.
 *
 * @module
 */

import { useAdminImports } from '@/lib/hooks/use-admin';
import type { AdminImport } from '@/lib/hooks/use-admin';
import { formatRelativeTime, truncateText } from '@/lib/utils/format';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// =============================================================================
// STATUS BADGE
// =============================================================================

function statusVariant(
  status: AdminImport['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'running':
      return 'secondary';
    case 'pending':
      return 'outline';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function ImportsPage(): React.JSX.Element {
  const { data, isLoading } = useAdminImports();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import History"
        description="Format import jobs. Auto-refreshes every 30 seconds."
      />

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.imports || data.imports.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No import jobs found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Format</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Importer</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.imports.map((job: AdminImport) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[0.65rem] uppercase">
                        {job.format}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{truncateText(job.fileName, 40)}</TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">
                        {truncateText(job.importerDid, 24)}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeTime(job.timestamp)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {job.recordCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusVariant(job.status)} className="text-[0.65rem]">
                        {job.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ImportsPage;
