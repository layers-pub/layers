'use client';

/**
 * Admin Node.js runtime metrics page.
 *
 * @module
 */

import { Cpu, HardDrive, Server, Timer } from 'lucide-react';

import { useAdminRuntime } from '@/lib/hooks/use-admin';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

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
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

function formatCpuTime(microseconds: number): string {
  const seconds = microseconds / 1_000_000;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${minutes}m ${remainingSecs.toFixed(1)}s`;
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function RuntimePage(): React.JSX.Element {
  const { data, isLoading } = useAdminRuntime();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const heapPercent =
    data.memory.heapTotal > 0 ? (data.memory.heapUsed / data.memory.heapTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Runtime Metrics"
        description="Node.js process information. Auto-refreshes every 10 seconds."
      />

      {/* Process Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Node.js</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.nodeVersion}</div>
            <p className="mt-1 text-xs text-muted-foreground">PID {data.pid}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(data.uptime)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RSS</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(data.memory.rss)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Memory</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">RSS</p>
              <p className="text-sm font-semibold">{formatBytes(data.memory.rss)}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Heap Used</p>
                <p className="text-xs font-mono">{formatBytes(data.memory.heapUsed)}</p>
              </div>
              <Progress value={heapPercent} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Heap Total</p>
              <p className="text-sm font-semibold">{formatBytes(data.memory.heapTotal)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">External</p>
              <p className="text-sm font-semibold">{formatBytes(data.memory.external)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Array Buffers</p>
              <p className="text-sm font-semibold">{formatBytes(data.memory.arrayBuffers)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CPU Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">CPU Time</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">User Time</p>
              <p className="text-lg font-semibold">{formatCpuTime(data.cpu.userTime)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">System Time</p>
              <p className="text-lg font-semibold">{formatCpuTime(data.cpu.systemTime)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RuntimePage;
