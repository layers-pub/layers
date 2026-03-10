'use client';

/**
 * Admin plugin registry management page.
 *
 * @module
 */

import { useAdminPlugins, useTogglePlugin } from '@/lib/hooks/use-admin';
import type { AdminPlugin } from '@/lib/hooks/use-admin';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// =============================================================================
// HELPERS
// =============================================================================

function typeLabel(type: AdminPlugin['type']): string {
  switch (type) {
    case 'importer':
      return 'Importer';
    case 'importing':
      return 'Harvester';
    case 'backlink':
      return 'Backlink';
    case 'search':
      return 'Search';
    default:
      return type;
  }
}

function healthColor(health: AdminPlugin['health']): string {
  switch (health) {
    case 'healthy':
      return 'bg-green-500';
    case 'degraded':
      return 'bg-amber-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-muted';
  }
}

// =============================================================================
// PLUGIN CARD
// =============================================================================

interface PluginCardProps {
  readonly plugin: AdminPlugin;
  readonly onToggle: (enabled: boolean) => void;
  readonly isToggling: boolean;
}

function PluginCard({ plugin, onToggle, isToggling }: PluginCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{plugin.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[0.65rem]">
              {typeLabel(plugin.type)}
            </Badge>
            <span className="text-xs text-muted-foreground">v{plugin.version}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', healthColor(plugin.health))} />
          <Switch
            checked={plugin.enabled}
            onCheckedChange={onToggle}
            disabled={isToggling}
            size="sm"
          />
        </div>
      </CardHeader>
      {plugin.description ? (
        <CardContent>
          <p className="text-xs text-muted-foreground">{plugin.description}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function PluginsPage(): React.JSX.Element {
  const { data: plugins, isLoading } = useAdminPlugins();
  const toggleMutation = useTogglePlugin();

  if (isLoading || !plugins) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Group plugins by type
  const grouped = plugins.reduce<Record<string, AdminPlugin[]>>((acc, plugin) => {
    const key = plugin.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(plugin);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader title="Plugins" description="Manage the plugin registry" />

      {Object.entries(grouped).map(([type, group]) => (
        <div key={type} className="space-y-3">
          <h3 className="text-sm font-medium capitalize text-muted-foreground">
            {typeLabel(type as AdminPlugin['type'])}s
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.map((plugin) => (
              <PluginCard
                key={plugin.name}
                plugin={plugin}
                onToggle={(enabled) => toggleMutation.mutate({ name: plugin.name, enabled })}
                isToggling={toggleMutation.isPending}
              />
            ))}
          </div>
        </div>
      ))}

      {plugins.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No plugins registered.</p>
      ) : null}
    </div>
  );
}

export default PluginsPage;
