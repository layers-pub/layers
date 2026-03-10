'use client';

/**
 * Admin firehose status and DLQ management page.
 *
 * @module
 */

import { Radio, RefreshCw, Trash2 } from 'lucide-react';

import {
  useAdminFirehose,
  useDLQEntries,
  useRetryDLQEntry,
  useDismissDLQEntry,
  useRetryAllDLQ,
  usePurgeDLQ,
} from '@/lib/hooks/use-admin';
import { formatRelativeTime } from '@/lib/utils/format';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DLQTable } from '@/components/admin/dlq-table';
import { cn } from '@/lib/utils';

// =============================================================================
// FIREHOSE STATUS CARD
// =============================================================================

function FirehoseStatusCard(): React.JSX.Element {
  const { data, isLoading } = useAdminFirehose();

  if (isLoading || !data) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Firehose Status</CardTitle>
        <Radio className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant={data.status === 'connected' ? 'default' : 'destructive'}>
            {data.status}
          </Badge>
          <span className="text-sm font-mono">{data.eventsPerSecond.toFixed(1)} events/sec</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Cursor</p>
            <code className="block break-all text-xs">{data.cursor}</code>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Events Processed</p>
            <p className="font-mono text-sm font-semibold">
              {data.totalEventsProcessed.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last Event</p>
            <p className="text-sm">
              {data.lastEventAt ? formatRelativeTime(data.lastEventAt) : 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// DLQ SECTION
// =============================================================================

function DLQSection(): React.JSX.Element {
  const { data, isLoading } = useDLQEntries();
  const retryMutation = useRetryDLQEntry();
  const dismissMutation = useDismissDLQEntry();
  const retryAllMutation = useRetryAllDLQ();
  const purgeMutation = usePurgeDLQ();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium">Dead Letter Queue</CardTitle>
          {data?.total !== undefined ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {data.total} {data.total === 1 ? 'entry' : 'entries'}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => retryAllMutation.mutate()}
            disabled={retryAllMutation.isPending || !data?.entries?.length}
          >
            <RefreshCw className={cn('h-3 w-3', retryAllMutation.isPending && 'animate-spin')} />
            Retry All
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => purgeMutation.mutate()}
            disabled={purgeMutation.isPending || !data?.entries?.length}
          >
            <Trash2 className="h-3 w-3" />
            Purge
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <DLQTable
            entries={data?.entries ?? []}
            onRetry={(id) => retryMutation.mutate(id)}
            onDismiss={(id) => dismissMutation.mutate(id)}
          />
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function FirehosePage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Firehose"
        description="Firehose subscription status and dead letter queue management"
      />

      <FirehoseStatusCard />
      <DLQSection />
    </div>
  );
}

export default FirehosePage;
