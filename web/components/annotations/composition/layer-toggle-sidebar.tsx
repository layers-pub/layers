/**
 * Sidebar for toggling annotation layer visibility.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import type { AnnotationLayerData } from '../types';

interface LayerToggleSidebarProps {
  /** All available annotation layers. */
  layers: AnnotationLayerData[];
  /** Set of currently visible layer URIs. */
  visibleLayers: Set<string>;
  /** Callback when a layer's visibility is toggled. */
  onToggle: (uri: string) => void;
}

/**
 * Formats a kind string for display (e.g., "token-tag" becomes "Token Tag").
 */
function formatKind(kind: string): string {
  return kind
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * A single row in the layer toggle sidebar.
 */
const LayerToggleRow = React.memo(function LayerToggleRow({
  layer,
  isVisible,
  onToggle,
}: {
  layer: AnnotationLayerData;
  isVisible: boolean;
  onToggle: (uri: string) => void;
}): React.JSX.Element {
  const color = layer.color ?? 'oklch(0.5 0 0)';
  const handleChange = React.useCallback(() => {
    onToggle(layer.uri);
  }, [layer.uri, onToggle]);

  return (
    <label
      className={cn(
        'flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors',
        'hover:bg-muted/50',
        !isVisible && 'opacity-50',
      )}
    >
      <input
        type="checkbox"
        checked={isVisible}
        onChange={handleChange}
        className="h-3.5 w-3.5 rounded border-border accent-primary"
      />
      <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {formatKind(layer.kind)}
          </Badge>
          {layer.subkind ? (
            <span className="text-[10px] text-muted-foreground truncate">{layer.subkind}</span>
          ) : null}
        </div>
        {layer.label ? (
          <span className="text-xs text-foreground truncate">{layer.label}</span>
        ) : null}
      </div>
    </label>
  );
});

/**
 * Sidebar listing all annotation layers with visibility toggles.
 *
 * Each layer row shows a color swatch, kind badge, optional subkind text,
 * and a checkbox for toggling visibility. Uses ScrollArea for overflow.
 */
const LayerToggleSidebar = React.memo(function LayerToggleSidebar({
  layers,
  visibleLayers,
  onToggle,
}: LayerToggleSidebarProps): React.JSX.Element {
  if (layers.length === 0) {
    return <div className="px-3 py-4 text-sm text-muted-foreground">No annotation layers</div>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-0.5 py-2">
        <div className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Layers ({layers.length})
        </div>
        {layers.map((layer) => (
          <LayerToggleRow
            key={layer.uri}
            layer={layer}
            isVisible={visibleLayers.has(layer.uri)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </ScrollArea>
  );
});

export type { LayerToggleSidebarProps };
export { LayerToggleSidebar };
