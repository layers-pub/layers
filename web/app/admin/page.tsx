'use client';

/**
 * Admin overview dashboard with aggregate stats, health bar, and quick actions.
 *
 * @module
 */

import Link from 'next/link';
import {
  Database,
  FileText,
  GitBranch,
  Layers,
  ListTodo,
  Plug,
  Radio,
  Upload,
  Users,
} from 'lucide-react';

import { useAdminOverview } from '@/lib/hooks/use-admin';
import type { DatabaseStatus } from '@/lib/hooks/use-admin';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// =============================================================================
// STAT CARD
// =============================================================================

interface StatCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly description?: string;
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// DATABASE HEALTH BAR
// =============================================================================

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

interface DatabaseHealthBarProps {
  readonly databases: Record<string, DatabaseStatus>;
}

function DatabaseHealthBar({ databases }: DatabaseHealthBarProps): React.JSX.Element {
  const entries = Object.entries(databases);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Database Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {entries.map(([name, db]) => (
            <div key={name} className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded-full', statusColor(db.status))} />
              <span className="text-sm font-medium capitalize">{name}</span>
              <Badge variant={statusBadgeVariant(db.status)} className="text-[0.65rem]">
                {db.latencyMs}ms
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// FIREHOSE STATUS CARD
// =============================================================================

interface FirehoseCardProps {
  readonly cursor: string;
  readonly eventsPerSecond: number;
  readonly dlqCount: number;
  readonly status: string;
}

function FirehoseCard({
  cursor,
  eventsPerSecond,
  dlqCount,
  status,
}: FirehoseCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Firehose</CardTitle>
        <Radio className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={status === 'connected' ? 'default' : 'destructive'}
            className="text-[0.65rem]"
          >
            {status}
          </Badge>
          <span className="text-sm font-mono">{eventsPerSecond.toFixed(1)} evt/s</span>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            Cursor: <code className="font-mono">{cursor.slice(0, 20)}...</code>
          </p>
          <p>
            DLQ:{' '}
            <span className={cn('font-medium', dlqCount > 0 && 'text-destructive')}>
              {dlqCount}
            </span>{' '}
            entries
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// QUEUES SUMMARY CARD
// =============================================================================

interface QueuesSummaryCardProps {
  readonly totalWaiting: number;
  readonly totalActive: number;
  readonly totalFailed: number;
}

function QueuesSummaryCard({
  totalWaiting,
  totalActive,
  totalFailed,
}: QueuesSummaryCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Active Queues</CardTitle>
        <ListTodo className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-4">
          <div>
            <span className="text-2xl font-bold">{totalWaiting.toLocaleString()}</span>
            <span className="ml-1 text-xs text-muted-foreground">waiting</span>
          </div>
          <div>
            <span className="text-lg font-semibold">{totalActive.toLocaleString()}</span>
            <span className="ml-1 text-xs text-muted-foreground">active</span>
          </div>
          <div>
            <span className={cn('text-lg font-semibold', totalFailed > 0 && 'text-destructive')}>
              {totalFailed.toLocaleString()}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">failed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

const QUICK_ACTIONS = [
  { label: 'Firehose', href: '/admin/firehose', icon: Radio },
  { label: 'Queues', href: '/admin/queues', icon: ListTodo },
  { label: 'Content', href: '/admin/content', icon: FileText },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Plugins', href: '/admin/plugins', icon: Plug },
  { label: 'Imports', href: '/admin/imports', icon: Upload },
] as const;

function QuickActions(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.href}
                variant="outline"
                size="sm"
                className="h-auto flex-col gap-1 py-3"
                render={<Link href={action.href} />}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function OverviewSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function AdminOverviewPage(): React.JSX.Element {
  const { data, isLoading } = useAdminOverview();

  if (isLoading || !data) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Overview"
        description="System administration and monitoring dashboard"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Expressions" value={data.expressionCount} icon={FileText} />
        <StatCard title="Corpora" value={data.corporaCount} icon={Database} />
        <StatCard title="Ontologies" value={data.ontologyCount} icon={GitBranch} />
        <StatCard title="Annotation Layers" value={data.annotationLayerCount} icon={Layers} />
        <StatCard title="Active Users (24h)" value={data.activeUsers24h} icon={Users} />
        <StatCard title="Imports" value={data.importCount} icon={Upload} />
      </div>

      {/* Database Health Bar */}
      <DatabaseHealthBar databases={data.databases} />

      {/* Firehose + Queues */}
      <div className="grid gap-4 md:grid-cols-2">
        <FirehoseCard
          cursor={data.firehose.cursor}
          eventsPerSecond={data.firehose.eventsPerSecond}
          dlqCount={data.firehose.dlqCount}
          status={data.firehose.status}
        />
        <QueuesSummaryCard
          totalWaiting={data.queues.totalWaiting}
          totalActive={data.queues.totalActive}
          totalFailed={data.queues.totalFailed}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}

export default AdminOverviewPage;
