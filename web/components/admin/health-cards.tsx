'use client';

/**
 * System health metric cards for admin panel.
 *
 * @module
 */

import { Activity, Database, Server, Timer } from 'lucide-react';

import type { SystemHealth } from '@/lib/hooks/use-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HealthCardsProps {
  readonly health: SystemHealth;
}

/**
 * Formats uptime seconds into a human-readable string.
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Formats indexer lag in seconds into a readable string.
 */
function formatLag(seconds: number): string {
  if (seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.round(seconds / 60)}m`;
}

/**
 * Renders four system health metric cards showing API uptime, indexer lag,
 * PostgreSQL connection pool status, and memory usage.
 */
function HealthCards({ health }: HealthCardsProps): React.JSX.Element {
  const cards = [
    {
      title: 'API Uptime',
      value: formatUptime(health.apiUptime),
      icon: Server,
      description: 'Time since last API restart',
    },
    {
      title: 'Indexer Lag',
      value: formatLag(health.indexerLag),
      icon: Timer,
      description: 'Firehose processing delay',
    },
    {
      title: 'PG Pool',
      value: `${health.pgPoolActive} / ${health.pgPoolActive + health.pgPoolIdle}`,
      icon: Database,
      description: `${health.pgPoolActive} active, ${health.pgPoolIdle} idle`,
    },
    {
      title: 'Memory',
      value: `${Math.round(health.memoryUsageMb)} MB`,
      icon: Activity,
      description: 'Process memory usage',
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export type { HealthCardsProps };
export { HealthCards };
