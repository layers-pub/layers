/**
 * Orchestrates multiple annotation layers on a single expression.
 *
 * Fetches annotation layers, manages visibility state, assigns palette colors,
 * and renders the toggle sidebar alongside stacked AnnotationLayerViews.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getLayerColor } from '@/lib/annotation-palette';
import type { AnnotationLayer } from '@/lib/hooks/use-annotation-layers';
import { useAnnotationLayersByExpression } from '@/lib/hooks/use-annotation-layers';

import { AnnotationLayerView } from '../annotation-layer-view';
import { mapAnnotations } from '../map-annotation';
import type { AnnotationLayerData, Token } from '../types';
import { LayerToggleSidebar } from './layer-toggle-sidebar';

interface MultiLayerViewProps {
  /** AT-URI of the expression whose layers to display. */
  expressionUri: string;
  /** Raw expression text for span-based renderers. */
  text: string;
  /** Tokens from the segmentation record. */
  tokens: Token[];
}

/**
 * Maps API annotation layer records to the renderer data format.
 *
 * Assigns palette colors based on index order.
 */
function mapToLayerData(layers: AnnotationLayer[]): AnnotationLayerData[] {
  return layers.map((layer, index) => ({
    uri: layer.uri,
    kind: layer.value.kind,
    subkind: layer.value.subkind,
    formalism: layer.value.formalism,
    label: undefined,
    items: mapAnnotations(layer.value.annotations),
    color: getLayerColor(index),
  }));
}

/**
 * Loading skeleton for the multi-layer view.
 */
function MultiLayerSkeleton(): React.JSX.Element {
  return (
    <div className="flex gap-4">
      <div className="w-56 flex-shrink-0 space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex-1 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

/**
 * Multi-layer annotation view.
 *
 * Fetches annotation layers for the given expression, manages per-layer
 * visibility state (all visible by default), and renders a sidebar with
 * toggles alongside the stacked annotation layer views.
 */
function MultiLayerView({ expressionUri, text, tokens }: MultiLayerViewProps): React.JSX.Element {
  const { data, isLoading, error } = useAnnotationLayersByExpression(expressionUri);

  // Map API data to renderer format
  const layerData = React.useMemo(() => {
    if (!data?.records) return [];
    return mapToLayerData(data.records);
  }, [data]);

  // Visibility state: all layers visible by default
  const [visibleLayers, setVisibleLayers] = React.useState<Set<string>>(new Set());

  // Sync visibility set when layers change
  React.useEffect(() => {
    if (layerData.length > 0) {
      setVisibleLayers((prev) => {
        // On first load or when new layers appear, make all visible
        if (prev.size === 0) {
          return new Set(layerData.map((l) => l.uri));
        }
        return prev;
      });
    }
  }, [layerData]);

  const handleToggle = React.useCallback((uri: string) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  }, []);

  // Filter to visible layers only
  const visibleLayerData = React.useMemo(
    () => layerData.filter((l) => visibleLayers.has(l.uri)),
    [layerData, visibleLayers],
  );

  if (isLoading) {
    return <MultiLayerSkeleton />;
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load annotation layers: {error instanceof Error ? error.message : 'Unknown error'}
      </p>
    );
  }

  if (layerData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No annotation layers for this expression.</p>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-border">
        <LayerToggleSidebar
          layers={layerData}
          visibleLayers={visibleLayers}
          onToggle={handleToggle}
        />
      </div>

      {/* Layer stack */}
      <div className="flex-1 min-w-0 space-y-3">
        {visibleLayerData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All layers are hidden. Use the sidebar to show annotation layers.
          </p>
        ) : (
          visibleLayerData.map((layer, index) => (
            <React.Fragment key={layer.uri}>
              {index > 0 ? <Separator /> : null}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="text-xs font-medium">
                    {layer.label ?? layer.subkind ?? layer.kind}
                  </span>
                  {layer.formalism ? (
                    <span className="text-[10px] text-muted-foreground">({layer.formalism})</span>
                  ) : null}
                </div>
                <AnnotationLayerView
                  layer={layer}
                  text={text}
                  tokens={tokens}
                  color={layer.color ?? getLayerColor(0)}
                />
              </div>
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}

export type { MultiLayerViewProps };
export { MultiLayerView };
