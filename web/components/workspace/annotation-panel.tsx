/**
 * Center panel of the annotation workspace showing annotation layers.
 *
 * Fetches annotation layers for the expression and renders each visible
 * layer using the existing AnnotationLayerView dispatch component.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getLayerColor } from '@/lib/annotation-palette';
import type { AnnotationLayer } from '@/lib/hooks/use-annotation-layers';
import { useAnnotationLayersByExpression } from '@/lib/hooks/use-annotation-layers';

import { AnnotationLayerView } from '../annotations/annotation-layer-view';
import { mapAnnotations } from '../annotations/map-annotation';
import { EmptyState } from '../layout/empty-state';
import type { AnnotationLayerData, Token } from '../annotations/types';

interface AnnotationPanelProps {
  /** AT-URI of the expression. */
  expressionUri: string;
  /** Raw expression text. */
  text: string;
  /** Tokens from the selected segmentation. */
  tokens: Token[];
}

/**
 * Transforms an API annotation layer record into the renderer data format.
 */
function toLayerData(
  layer: AnnotationLayer,
  colorIndex: number,
): AnnotationLayerData {
  return {
    uri: layer.uri,
    kind: layer.value.kind,
    subkind: layer.value.subkind,
    formalism: layer.value.formalism,
    label: undefined,
    items: mapAnnotations(layer.value.annotations),
    color: getLayerColor(colorIndex),
  };
}

/**
 * Center workspace panel displaying annotation layers.
 *
 * Manages layer visibility state. All layers are visible by default.
 * Each visible layer is rendered using AnnotationLayerView, which
 * dispatches to the appropriate renderer based on kind.
 */
function AnnotationPanel({ expressionUri, text, tokens }: AnnotationPanelProps): React.JSX.Element {
  const { data, isLoading } = useAnnotationLayersByExpression(expressionUri);

  const layers: AnnotationLayerData[] = React.useMemo(() => {
    const rawLayers = data?.records ?? [];
    return rawLayers.map((layer, i) => toLayerData(layer, i));
  }, [data?.records]);

  const [visibleLayers, setVisibleLayers] = React.useState<Set<string>>(new Set());

  // Initialize visible layers when data loads
  React.useEffect(() => {
    if (layers.length > 0 && visibleLayers.size === 0) {
      setVisibleLayers(new Set(layers.map((l) => l.uri)));
    }
  }, [layers, visibleLayers.size]);

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
        <CardHeader className="flex-shrink-0 pb-2">
          <CardTitle className="text-sm">Annotations</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const visibleLayerList = layers.filter((l) => visibleLayers.has(l.uri));

  return (
    <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-sm">
          Annotations ({visibleLayerList.length} of {layers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          {layers.length === 0 ? (
            <EmptyState
              title="No annotations"
              description="No annotation layers have been created for this expression."
            />
          ) : visibleLayerList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              All layers are hidden. Toggle layers in the right panel.
            </p>
          ) : (
            <div className="space-y-4">
              {visibleLayerList.map((layer, i) => (
                <div key={layer.uri}>
                  {i > 0 ? <Separator className="mb-4" /> : null}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-xs font-medium truncate">
                        {layer.label ?? layer.kind}
                        {layer.subkind ? ` (${layer.subkind})` : ''}
                      </span>
                    </div>
                    <AnnotationLayerView
                      layer={layer}
                      text={text}
                      tokens={tokens}
                      color={layer.color ?? 'oklch(0.5 0 0)'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export type { AnnotationPanelProps };
export { AnnotationPanel };
