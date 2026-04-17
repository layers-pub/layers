/**
 * Center panel of the annotation workspace showing annotation layers.
 *
 * Fetches annotation layers for the expression and renders each visible
 * layer using the existing AnnotationLayerView dispatch component.
 * When in edit mode, shows inline controls for adding and removing
 * annotations and editing labels.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getLayerColor } from '@/lib/annotation-palette';
import type { AnnotationLayer } from '@/lib/hooks/use-annotation-layers';
import { useAnnotationLayersByExpression } from '@/lib/hooks/use-annotation-layers';

import { AnnotationLayerView } from '../annotations/annotation-layer-view';
import { mapAnnotations } from '../annotations/map-annotation';
import { EmptyState } from '../layout/empty-state';
import type { AnnotationItem, AnnotationLayerData, Token } from '../annotations/types';

interface AnnotationPanelProps {
  /** AT-URI of the expression. */
  expressionUri: string;
  /** Raw expression text. */
  text: string;
  /** Tokens from the selected segmentation. */
  tokens: Token[];
  /** Whether the panel is in edit mode. */
  isEditMode?: boolean;
  /** Callback to report the count of pending (unsaved) annotation items. */
  onPendingCountChange?: (count: number) => void;
}

/**
 * Transforms an API annotation layer record into the renderer data format.
 */
function toLayerData(layer: AnnotationLayer, colorIndex: number): AnnotationLayerData {
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
 * An inline label editor for a single annotation item.
 */
function InlineAnnotationItemEditor({
  item,
  onLabelChange,
  onDelete,
}: {
  item: AnnotationItem;
  onLabelChange: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
}): React.JSX.Element {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(item.label);

  const handleCommit = React.useCallback(() => {
    if (editValue !== item.label) {
      onLabelChange(item.id, editValue);
    }
    setIsEditing(false);
  }, [editValue, item.id, item.label, onLabelChange]);

  return (
    <div className="group flex items-center gap-1.5 py-0.5">
      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => setEditValue((e.target as HTMLInputElement).value)}
          onBlur={handleCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommit();
            if (e.key === 'Escape') {
              setEditValue(item.label);
              setIsEditing(false);
            }
          }}
          className="h-5 text-xs px-1 py-0 w-24"
          autoFocus
        />
      ) : (
        <span
          className="text-xs cursor-pointer hover:underline"
          onClick={() => setIsEditing(true)}
          role="button"
          aria-label={`Edit label for ${item.label}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsEditing(true);
            }
          }}
        >
          {item.label}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
        onClick={() => onDelete(item.id)}
      >
        <svg viewBox="0 0 15 15" fill="none" className="size-3">
          <path
            d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      </Button>
    </div>
  );
}

/**
 * Center workspace panel displaying annotation layers.
 *
 * Manages layer visibility state. All layers are visible by default.
 * Each visible layer is rendered using AnnotationLayerView, which
 * dispatches to the appropriate renderer based on kind.
 *
 * In edit mode, each layer shows:
 * - A "New Annotation" button to add items to the layer
 * - Inline label editing on individual annotation items
 * - Delete buttons on individual items
 * - A visual indicator for unsaved changes
 */
function AnnotationPanel({
  expressionUri,
  text,
  tokens,
  isEditMode = false,
  onPendingCountChange,
}: AnnotationPanelProps): React.JSX.Element {
  const { data, isLoading } = useAnnotationLayersByExpression(expressionUri);

  // Track layers with pending (unsaved) edits
  const [pendingEdits, setPendingEdits] = React.useState<Set<string>>(new Set());

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

  // Report pending count to parent
  React.useEffect(() => {
    onPendingCountChange?.(pendingEdits.size);
  }, [pendingEdits.size, onPendingCountChange]);

  const markLayerDirty = React.useCallback((layerUri: string) => {
    setPendingEdits((prev) => {
      const next = new Set(prev);
      next.add(layerUri);
      return next;
    });
  }, []);

  const handleLabelChange = React.useCallback(
    (layerUri: string, _itemId: string, _newLabel: string) => {
      // Label change will be persisted by the annotation creation context (created by other agents)
      markLayerDirty(layerUri);
    },
    [markLayerDirty],
  );

  const handleDeleteItem = React.useCallback(
    (layerUri: string, _itemId: string) => {
      // Deletion will be persisted by the annotation creation context (created by other agents)
      markLayerDirty(layerUri);
    },
    [markLayerDirty],
  );

  const handleNewAnnotation = React.useCallback(
    (layerUri: string) => {
      // New annotation creation will be handled by the annotation creation context (created by other agents)
      markLayerDirty(layerUri);
    },
    [markLayerDirty],
  );

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
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">
            Annotations ({visibleLayerList.length} of {layers.length})
          </CardTitle>
          {isEditMode && pendingEdits.size > 0 ? (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
              {pendingEdits.size} unsaved
            </Badge>
          ) : null}
        </div>
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
                      <span className="text-xs font-medium truncate flex-1">
                        {layer.label ?? layer.kind}
                        {layer.subkind ? ` (${layer.subkind})` : ''}
                      </span>
                      {isEditMode && pendingEdits.has(layer.uri) ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      ) : null}
                    </div>
                    <AnnotationLayerView
                      layer={layer}
                      text={text}
                      tokens={tokens}
                      color={layer.color ?? 'oklch(0.5 0 0)'}
                    />
                    {/* Edit mode: inline controls */}
                    {isEditMode ? (
                      <div className="mt-2 space-y-1">
                        {layer.items.map((item) => (
                          <InlineAnnotationItemEditor
                            key={item.id}
                            item={item}
                            onLabelChange={(id, label) => handleLabelChange(layer.uri, id, label)}
                            onDelete={(id) => handleDeleteItem(layer.uri, id)}
                          />
                        ))}
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-xs mt-1"
                          onClick={() => handleNewAnnotation(layer.uri)}
                        >
                          + New Annotation
                        </Button>
                      </div>
                    ) : null}
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
