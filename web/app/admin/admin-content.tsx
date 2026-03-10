'use client';

/**
 * Admin panel content with tabbed layout for DLQ, reconciliation, health, and queues.
 *
 * @module
 */

import { RefreshCw } from 'lucide-react';

import {
  useDLQEntries,
  useRetryDLQEntry,
  useDismissDLQEntry,
  useReconciliationStatus,
  useRunReconciliation,
  useSystemHealth,
  useQueueDepths,
} from '@/lib/hooks/use-admin';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DLQTable } from '@/components/admin/dlq-table';
import { ReconciliationTable } from '@/components/admin/reconciliation-table';
import { HealthCards } from '@/components/admin/health-cards';
import { QueueTable } from '@/components/admin/queue-table';

// =============================================================================
// DLQ TAB
// =============================================================================

function DLQTab(): React.JSX.Element {
  const { data, isLoading } = useDLQEntries();
  const retryMutation = useRetryDLQEntry();
  const dismissMutation = useDismissDLQEntry();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data?.total !== undefined ? (
        <p className="text-sm text-muted-foreground">
          {data.total} {data.total === 1 ? 'entry' : 'entries'} in the dead letter queue
        </p>
      ) : null}
      <DLQTable
        entries={data?.entries ?? []}
        onRetry={(id) => retryMutation.mutate(id)}
        onDismiss={(id) => dismissMutation.mutate(id)}
      />
    </div>
  );
}

// =============================================================================
// RECONCILIATION TAB
// =============================================================================

function ReconciliationTab(): React.JSX.Element {
  const { data, isLoading } = useReconciliationStatus();
  const runMutation = useRunReconciliation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Compare record counts across PostgreSQL, Elasticsearch, and Neo4j.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
        >
          <RefreshCw className={runMutation.isPending ? 'animate-spin' : ''} />
          Run Reconciliation
        </Button>
      </div>
      <ReconciliationTable statuses={data ?? []} />
    </div>
  );
}

// =============================================================================
// HEALTH TAB
// =============================================================================

function HealthTab(): React.JSX.Element {
  const { data, isLoading } = useSystemHealth();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Health data unavailable.</p>
    );
  }

  return <HealthCards health={data} />;
}

// =============================================================================
// QUEUES TAB
// =============================================================================

function QueuesTab(): React.JSX.Element {
  const { data, isLoading } = useQueueDepths();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        BullMQ queue depths. Auto-refreshes every 10 seconds.
      </p>
      <QueueTable queues={data ?? []} />
    </div>
  );
}

// =============================================================================
// MAIN CONTENT
// =============================================================================

/**
 * Admin panel with tabs for DLQ management, reconciliation status,
 * system health metrics, and queue monitoring.
 */
function AdminContent(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <PageHeader title="Admin" description="System administration and monitoring" />

      <Tabs defaultValue="dlq">
        <TabsList>
          <TabsTrigger value="dlq">Dead Letter Queue</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
        </TabsList>

        <TabsContent value="dlq">
          <Card>
            <CardContent className="pt-4">
              <DLQTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation">
          <Card>
            <CardContent className="pt-4">
              <ReconciliationTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <HealthTab />
        </TabsContent>

        <TabsContent value="queues">
          <Card>
            <CardContent className="pt-4">
              <QueuesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { AdminContent };
