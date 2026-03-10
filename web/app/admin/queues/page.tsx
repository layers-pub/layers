'use client';

/**
 * Admin BullMQ queue depths page.
 *
 * @module
 */

import { useQueueDepths } from '@/lib/hooks/use-admin';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QueueTable } from '@/components/admin/queue-table';

// =============================================================================
// MAIN PAGE
// =============================================================================

function QueuesPage(): React.JSX.Element {
  const { data, isLoading } = useQueueDepths();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Queue Depths"
        description="BullMQ queue monitoring. Auto-refreshes every 10 seconds."
      />

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <QueueTable queues={data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default QueuesPage;
