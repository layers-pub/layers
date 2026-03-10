/**
 * Three-panel annotation workspace layout.
 *
 * Uses react-resizable-panels for a horizontal layout with:
 * - Left panel (25%): expression text with segmentation overlay
 * - Center panel (50%): annotation layers using existing renderers
 * - Right panel (25%): metadata, layer controls, cross-references
 *
 * @module
 */

'use client';

import * as React from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

import { Skeleton } from '@/components/ui/skeleton';
import { getLayerColor } from '@/lib/annotation-palette';
import type { AnnotationLayer } from '@/lib/hooks/use-annotation-layers';
import { useAnnotationLayersByExpression } from '@/lib/hooks/use-annotation-layers';
import { useSegmentationsByExpression } from '@/lib/hooks/use-segmentations';

import { mapAnnotations } from '../annotations/map-annotation';
import type { AnnotationLayerData, Token } from '../annotations/types';

import { AnnotationPanel } from './annotation-panel';
import { ExpressionPanel } from './expression-panel';
import { MetadataPanel } from './metadata-panel';

interface AnnotationWorkspaceProps {
  /** AT-URI of the expression. */
  expressionUri: string;
  /** Raw expression text. */
  text: string;
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
 * A thin visual handle for panel resize.
 */
function ResizeHandle(): React.JSX.Element {
  return (
    <PanelResizeHandle className="relative w-1.5 bg-transparent group data-[resize-handle-active]:bg-primary/10">
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border transition-colors group-hover:bg-primary/50" />
    </PanelResizeHandle>
  );
}

/**
 * Three-panel annotation workspace for viewing expression annotations.
 *
 * This is a view-only workspace. No editing, creation, or mutation hooks.
 * The left panel shows the expression text, the center panel shows annotation
 * layers, and the right panel shows metadata and layer toggle controls.
 */
function AnnotationWorkspace({ expressionUri, text }: AnnotationWorkspaceProps): React.JSX.Element {
  const { data: segData } = useSegmentationsByExpression(expressionUri);
  const { data: layerData } = useAnnotationLayersByExpression(expressionUri);

  // Build tokens from the first segmentation's first tokenization
  const tokens: Token[] = React.useMemo(() => {
    const segmentations = segData?.records ?? [];
    const seg = segmentations[0];
    if (!seg?.value.tokenizations?.length) return [];
    const firstTokenization = seg.value.tokenizations[0];
    if (!firstTokenization?.tokens) return [];
    return firstTokenization.tokens.map((t, i) => ({
      text: t.text ?? '',
      index: i,
      start: t.textSpan?.start ?? 0,
      end: t.textSpan?.ending ?? 0,
    }));
  }, [segData?.records]);

  // Build layer data with colors
  const layers: AnnotationLayerData[] = React.useMemo(() => {
    const rawLayers = layerData?.records ?? [];
    return rawLayers.map((layer, i) => toLayerData(layer, i));
  }, [layerData?.records]);

  // Visible layers state (all visible by default)
  const [visibleLayers, setVisibleLayers] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (layers.length > 0 && visibleLayers.size === 0) {
      setVisibleLayers(new Set(layers.map((l) => l.uri)));
    }
  }, [layers, visibleLayers.size]);

  const handleToggleLayer = React.useCallback((uri: string) => {
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

  return (
    <PanelGroup orientation="horizontal" className="h-full">
      <Panel defaultSize={25} minSize={15} collapsible>
        <ExpressionPanel expressionUri={expressionUri} text={text} />
      </Panel>

      <ResizeHandle />

      <Panel defaultSize={50} minSize={30}>
        <AnnotationPanel expressionUri={expressionUri} text={text} tokens={tokens} />
      </Panel>

      <ResizeHandle />

      <Panel defaultSize={25} minSize={15} collapsible>
        <MetadataPanel
          expressionUri={expressionUri}
          text={text}
          layers={layers}
          visibleLayers={visibleLayers}
          onToggleLayer={handleToggleLayer}
        />
      </Panel>
    </PanelGroup>
  );
}

/**
 * Loading skeleton for the workspace layout.
 */
function AnnotationWorkspaceSkeleton(): React.JSX.Element {
  return (
    <div className="flex h-full gap-1">
      <div className="w-1/4 p-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="w-1/2 p-4 space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="w-1/4 p-4 space-y-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export type { AnnotationWorkspaceProps };
export { AnnotationWorkspace, AnnotationWorkspaceSkeleton };
