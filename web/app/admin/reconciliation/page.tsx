'use client';

/**
 * Admin reconciliation page comparing record counts across storage backends.
 *
 * @module
 */

import { RefreshCw } from 'lucide-react';

import { useReconciliationStatus, useRunReconciliation } from '@/lib/hooks/use-admin';
import type { ReconciliationStatus } from '@/lib/hooks/use-admin';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReconciliationTable } from '@/components/admin/reconciliation-table';
import { cn } from '@/lib/utils';

// =============================================================================
// SUMMARY STATS
// =============================================================================

interface SummaryProps {
  readonly statuses: ReconciliationStatus[];
}

function ReconciliationSummary({ statuses }: SummaryProps): React.JSX.Element {
  const totalMismatches = statuses.reduce((sum, s) => sum + s.mismatches, 0);
  const healthyCount = statuses.filter((s) => s.mismatches === 0).length;

  return (
    <div className="flex items-center gap-6 text-sm">
      <div>
        <span className="text-muted-foreground">Tables checked: </span>
        <span className="font-medium">{statuses.length}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Healthy: </span>
        <span className="font-medium text-green-600 dark:text-green-400">{healthyCount}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Total mismatches: </span>
        <span className={cn('font-medium', totalMismatches > 0 && 'text-destructive')}>
          {totalMismatches.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function ReconciliationPage(): React.JSX.Element {
  const { data, isLoading } = useReconciliationStatus();
  const runMutation = useRunReconciliation();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconciliation"
        description="Compare record counts across PostgreSQL, Elasticsearch, and Neo4j"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', runMutation.isPending && 'animate-spin')} />
            Run Reconciliation
          </Button>
        }
      />

      {data && data.length > 0 ? <ReconciliationSummary statuses={data} /> : null}

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ReconciliationTable statuses={data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ReconciliationPage;
