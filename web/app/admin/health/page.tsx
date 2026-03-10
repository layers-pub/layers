'use client';

/**
 * Detailed health page showing database status and process information.
 *
 * @module
 */

import { Activity, Database, HardDrive, Server } from 'lucide-react';

import { useDetailedHealth } from '@/lib/hooks/use-admin';
import type { DatabaseStatus } from '@/lib/hooks/use-admin';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// =============================================================================
// HELPERS
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function statusColor(status: DatabaseStatus['status']): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-500';
    case 'degraded':
      return 'bg-amber-500';
    case 'down':
      return 'bg-red-500';
    default:
      return 'bg-muted';
  }
}

function statusBadgeVariant(
  status: DatabaseStatus['status'],
): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'healthy':
      return 'default';
    case 'degraded':
      return 'secondary';
    case 'down':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// =============================================================================
// DATABASE CARD
// =============================================================================

interface DatabaseCardProps {
  readonly name: string;
  readonly db: DatabaseStatus;
  readonly icon: React.ComponentType<{ className?: string }>;
}

function DatabaseCard({ name, db, icon: Icon }: DatabaseCardProps): React.JSX.Element {
  const latencyPercent = Math.min((db.latencyMs / 500) * 100, 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium capitalize">{name}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn('h-2.5 w-2.5 rounded-full', statusColor(db.status))} />
          <Badge variant={statusBadgeVariant(db.status)}>{db.status}</Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Latency</span>
            <span className="font-mono">{db.latencyMs}ms</span>
          </div>
          <Progress value={latencyPercent} />
        </div>

        {db.connections ? (
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Active</span>
              <span className="font-mono">{db.connections.active}</span>
            </div>
            <div className="flex justify-between">
              <span>Idle</span>
              <span className="font-mono">{db.connections.idle}</span>
            </div>
            <div className="flex justify-between">
              <span>Total</span>
              <span className="font-mono">{db.connections.total}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PROCESS INFO CARD
// =============================================================================

interface ProcessInfoProps {
  readonly process: {
    uptime: number;
    memoryRss: number;
    heapUsed: number;
    heapTotal: number;
    nodeVersion: string;
    pid: number;
  };
}

function ProcessInfoCard({ process: p }: ProcessInfoProps): React.JSX.Element {
  const heapPercent = p.heapTotal > 0 ? (p.heapUsed / p.heapTotal) * 100 : 0;

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Process Info</CardTitle>
        <Server className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Uptime</p>
            <p className="text-lg font-semibold">{formatUptime(p.uptime)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Memory (RSS)</p>
            <p className="text-lg font-semibold">{formatBytes(p.memoryRss)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Heap Used / Total</p>
            <p className="text-lg font-semibold">
              {formatBytes(p.heapUsed)} / {formatBytes(p.heapTotal)}
            </p>
            <Progress value={heapPercent} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Node.js / PID</p>
            <p className="text-lg font-semibold">{p.nodeVersion}</p>
            <p className="font-mono text-xs text-muted-foreground">PID {p.pid}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function HealthPage(): React.JSX.Element {
  const { data, isLoading } = useDetailedHealth();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        description="Database status, latency, and process metrics. Auto-refreshes every 10 seconds."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DatabaseCard name="PostgreSQL" db={data.databases.postgresql} icon={Database} />
        <DatabaseCard name="Elasticsearch" db={data.databases.elasticsearch} icon={HardDrive} />
        <DatabaseCard name="Neo4j" db={data.databases.neo4j} icon={Activity} />
        <DatabaseCard name="Redis" db={data.databases.redis} icon={Server} />
      </div>

      <ProcessInfoCard process={data.process} />
    </div>
  );
}

export default HealthPage;
