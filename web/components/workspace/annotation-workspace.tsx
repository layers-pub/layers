/**
 * Three-panel annotation workspace layout with editing support.
 *
 * Uses react-resizable-panels for a horizontal layout with:
 * - Left panel (25%): expression text with segmentation overlay and token selection
 * - Center panel (50%): annotation layers with inline editing controls
 * - Right panel (25%): metadata, layer controls, cross-references, edit mode toggle
 *
 * When `isEditable` is true and the user is authenticated, a toolbar appears
 * between the header and the panel group, and keyboard shortcuts are active.
 * Annotation editors (text selection, dependency arcs, temporal spans, bounding
 * boxes) are conditionally rendered based on the selected annotation kind from
 * the creation context.
 *
 * @module
 */

'use client';

import * as React from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

import { Skeleton } from '@/components/ui/skeleton';
import { getLayerColor } from '@/lib/annotation-palette';
import { useAuth } from '@/lib/auth';
import type { AnnotationLayer } from '@/lib/hooks/use-annotation-layers';
import { useAnnotationLayersByExpression } from '@/lib/hooks/use-annotation-layers';
import { useSegmentationsByExpression } from '@/lib/hooks/use-segmentations';

import { mapAnnotations } from '../annotations/map-annotation';
import type { Anchor, AnnotationItem, AnnotationLayerData, Token } from '../annotations/types';

import { AnnotationCreationProvider, useAnnotationCreation } from './annotation-creation-context';
import { AnnotationToolbar } from './annotation-toolbar';
import type { BoundingBoxData } from './bounding-box-editor';
import { BoundingBoxEditor } from './bounding-box-editor';
import type { DependencyArc } from './dependency-arc-diagram';
import { DependencyArcEditor } from './dependency-arc-editor';
import { TemporalAnnotationEditor } from './temporal-annotation-editor';
import { TextSelectionHandler } from './text-selection-handler';

import { AnnotationPanel } from './annotation-panel';
import { ExpressionPanel } from './expression-panel';
import { MetadataPanel } from './metadata-panel';

/** Token selection modes for the expression panel. */
type SelectionMode = 'view' | 'token' | 'span' | 'tokenSequence';

interface AnnotationWorkspaceProps {
  /** AT-URI of the expression. */
  expressionUri: string;
  /** Raw expression text. */
  text: string;
  /** Whether editing UI should be available (default true). */
  isEditable?: boolean;
  /** URL of linked media (audio/video), for temporal annotation editing. */
  mediaUrl?: string;
  /** MIME type of linked media. */
  mediaMimeType?: string;
  /** Total media duration in seconds, for temporal annotation editing. */
  mediaDuration?: number;
  /** URL of linked image, for bounding box annotation editing. */
  imageUrl?: string;
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
 * Checks whether the active element is a text input, textarea, or contenteditable.
 */
function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (active.getAttribute('contenteditable') === 'true') return true;
  return false;
}

// =============================================================================
// Editor wiring helpers
// =============================================================================

/**
 * Renders the appropriate annotation editor based on the current creation
 * context state. Only visible in annotate mode.
 */
function AnnotationEditors({
  text,
  tokens,
  mediaDuration,
  imageUrl,
}: {
  text: string;
  tokens: Token[];
  mediaDuration?: number;
  imageUrl?: string;
}): React.JSX.Element | null {
  const { state, dispatch, addItem } = useAnnotationCreation();

  // Media playback time for temporal editor (local tracking)
  const [currentTime, setCurrentTime] = React.useState(0);

  // Dependency arcs built during tree editing
  const [pendingArcs, setPendingArcs] = React.useState<DependencyArc[]>([]);

  // Bounding boxes built during bbox editing
  const [pendingBoxes, setPendingBoxes] = React.useState<BoundingBoxData[]>([]);

  // Only show editors when in annotate mode
  if (state.mode !== 'annotate') return null;

  const { kind, subkind } = state;

  // Text-based annotations: span and token-tag kinds use TextSelectionHandler
  if (kind === 'span' || kind === 'token-tag') {
    const selectionMode = kind === 'span' ? 'span' : 'token';

    const handleCreateFromSelection = (anchor: Anchor): void => {
      dispatch({ type: 'SET_ANCHOR', anchor });

      // Also add a pending item with the anchor so the user can label it
      const item: AnnotationItem = {
        id: crypto.randomUUID(),
        label: '',
        anchor,
        tokenIndex: anchor.type === 'tokenRef' ? anchor.tokenIndex : undefined,
      };
      addItem(item);
    };

    return (
      <div className="border rounded-md border-primary/30 bg-primary/5 p-2 mb-2">
        <TextSelectionHandler
          text={text}
          tokens={tokens}
          onCreateAnnotation={handleCreateFromSelection}
          mode={selectionMode}
        />
      </div>
    );
  }

  // Dependency tree editing (tree kind with dependency subkind)
  if (kind === 'tree' && (subkind === 'dependency' || subkind === '')) {
    const handleArcCreate = (arc: DependencyArc): void => {
      setPendingArcs((prev) => [...prev, arc]);

      const item: AnnotationItem = {
        id: crypto.randomUUID(),
        label: arc.label,
        headIndex: arc.headIndex,
        targetIndex: arc.targetIndex,
      };
      addItem(item);
    };

    const handleArcUpdate = (index: number, arc: DependencyArc): void => {
      setPendingArcs((prev) => prev.map((a, i) => (i === index ? arc : a)));
    };

    const handleArcDelete = (index: number): void => {
      const removed = pendingArcs[index];
      setPendingArcs((prev) => prev.filter((_, i) => i !== index));

      // Remove the corresponding pending item by matching head/target indices
      if (removed) {
        const matchingItem = state.pendingItems.find(
          (item) =>
            item.headIndex === removed.headIndex && item.targetIndex === removed.targetIndex,
        );
        if (matchingItem) {
          dispatch({ type: 'REMOVE_ITEM', itemId: matchingItem.id });
        }
      }
    };

    return (
      <div className="border rounded-md border-primary/30 bg-primary/5 p-2 mb-2">
        <DependencyArcEditor
          tokens={tokens}
          arcs={pendingArcs}
          color="oklch(0.6 0.15 260)"
          onArcCreate={handleArcCreate}
          onArcUpdate={handleArcUpdate}
          onArcDelete={handleArcDelete}
        />
      </div>
    );
  }

  // Temporal tier annotations
  if (kind === 'tier' && mediaDuration != null && mediaDuration > 0) {
    const handleCreateTemporal = (startTime: number, endTime: number, label: string): void => {
      const anchor: Anchor = {
        type: 'temporalSpan',
        startTime,
        endTime,
      };
      dispatch({ type: 'SET_ANCHOR', anchor });

      const item: AnnotationItem = {
        id: crypto.randomUUID(),
        label,
        anchor,
      };
      addItem(item);
    };

    return (
      <div className="border rounded-md border-primary/30 bg-primary/5 p-2 mb-2">
        <TemporalAnnotationEditor
          duration={mediaDuration}
          currentTime={currentTime}
          onCreateAnnotation={handleCreateTemporal}
          onSeek={setCurrentTime}
          tierName={subkind || 'New Tier'}
        />
      </div>
    );
  }

  // Bounding box annotations (for image-linked expressions)
  if (imageUrl) {
    const handleBoxCreate = (box: BoundingBoxData): void => {
      setPendingBoxes((prev) => [...prev, box]);

      const anchor: Anchor = {
        type: 'boundingBox',
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
      dispatch({ type: 'SET_ANCHOR', anchor });

      const item: AnnotationItem = {
        id: box.id,
        label: box.label,
        anchor,
      };
      addItem(item);
    };

    const handleBoxUpdate = (id: string, box: BoundingBoxData): void => {
      setPendingBoxes((prev) => prev.map((b) => (b.id === id ? box : b)));

      const anchor: Anchor = {
        type: 'boundingBox',
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
      dispatch({
        type: 'UPDATE_ITEM',
        itemId: id,
        updates: { label: box.label, anchor },
      });
    };

    const handleBoxDelete = (id: string): void => {
      setPendingBoxes((prev) => prev.filter((b) => b.id !== id));
      dispatch({ type: 'REMOVE_ITEM', itemId: id });
    };

    return (
      <div className="border rounded-md border-primary/30 bg-primary/5 p-2 mb-2">
        <BoundingBoxEditor
          imageUrl={imageUrl}
          boxes={pendingBoxes}
          onBoxCreate={handleBoxCreate}
          onBoxUpdate={handleBoxUpdate}
          onBoxDelete={handleBoxDelete}
        />
      </div>
    );
  }

  return null;
}

// =============================================================================
// Main workspace
// =============================================================================

/**
 * Three-panel annotation workspace with optional editing support.
 *
 * When `isEditable` is true and the user is authenticated, the workspace
 * provides annotation creation and editing controls. Keyboard shortcuts
 * include Escape (cancel), Ctrl/Cmd+S (save layer), Ctrl/Cmd+Z (undo),
 * and E (toggle edit mode when not focused on an input).
 */
function AnnotationWorkspace({
  expressionUri,
  text,
  isEditable = true,
  mediaUrl,
  mediaMimeType,
  mediaDuration,
  imageUrl,
}: AnnotationWorkspaceProps): React.JSX.Element {
  const { isAuthenticated } = useAuth();
  const { data: segData } = useSegmentationsByExpression(expressionUri);
  const { data: layerData } = useAnnotationLayersByExpression(expressionUri);

  // Whether the workspace is currently in edit mode
  const [isEditMode, setIsEditMode] = React.useState(false);

  // Token selection mode for the expression panel
  const [selectionMode, setSelectionMode] = React.useState<SelectionMode>('view');

  // Selected tokens in the expression panel
  const [selectedTokens, setSelectedTokens] = React.useState<ReadonlySet<number>>(new Set());

  // Pending annotation items that have not been saved
  const [pendingCount, setPendingCount] = React.useState(0);

  // The editing controls are available only when the workspace is editable
  // and the user is authenticated
  const canEdit = isEditable && isAuthenticated;

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

  const handleSelectionChange = React.useCallback((tokens: ReadonlySet<number>) => {
    setSelectedTokens(tokens);
  }, []);

  const handleCancelAnnotation = React.useCallback(() => {
    setSelectedTokens(new Set());
    setSelectionMode('view');
  }, []);

  const handleDiscardChanges = React.useCallback(() => {
    setSelectedTokens(new Set());
    setSelectionMode('view');
    setPendingCount(0);
    setIsEditMode(false);
  }, []);

  const handleToggleEditMode = React.useCallback(() => {
    setIsEditMode((prev) => {
      if (prev) {
        // Exiting edit mode: clear selection state
        setSelectedTokens(new Set());
        setSelectionMode('view');
      }
      return !prev;
    });
  }, []);

  // Keyboard shortcut handler
  React.useEffect(() => {
    if (!canEdit) return;

    function handleKeyDown(e: KeyboardEvent): void {
      const isMeta = e.metaKey || e.ctrlKey;

      // Escape: cancel current annotation
      if (e.key === 'Escape') {
        handleCancelAnnotation();
        return;
      }

      // Ctrl/Cmd+S: save current layer (prevent browser save dialog)
      if (isMeta && e.key === 's') {
        e.preventDefault();
        // Save is handled by the annotation creation context
        return;
      }

      // Ctrl/Cmd+Z: undo last annotation item
      if (isMeta && e.key === 'z') {
        e.preventDefault();
        // Undo is handled by the annotation creation context
        return;
      }

      // E: toggle edit mode (only when not in an input field)
      if (e.key === 'e' && !isMeta && !e.shiftKey && !e.altKey && !isInputFocused()) {
        handleToggleEditMode();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canEdit, handleCancelAnnotation, handleToggleEditMode]);

  const workspaceContent = (
    <div className="flex h-full flex-col">
      {canEdit && isEditMode ? (
        <div className="flex-shrink-0">
          <AnnotationToolbar />
        </div>
      ) : null}

      {/* Annotation editors appear above the panels when in annotate mode */}
      {canEdit && isEditMode ? (
        <div className="flex-shrink-0 px-2">
          <AnnotationEditors
            text={text}
            tokens={tokens}
            mediaDuration={mediaDuration}
            imageUrl={imageUrl}
          />
        </div>
      ) : null}

      <PanelGroup orientation="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize={25} minSize={15} collapsible>
          <ExpressionPanel
            expressionUri={expressionUri}
            text={text}
            mediaUrl={mediaUrl}
            mediaMimeType={mediaMimeType}
            selectionMode={isEditMode ? selectionMode : 'view'}
            selectedTokens={selectedTokens}
            onSelectionChange={handleSelectionChange}
          />
        </Panel>

        <ResizeHandle />

        <Panel defaultSize={50} minSize={30}>
          <AnnotationPanel
            expressionUri={expressionUri}
            text={text}
            tokens={tokens}
            isEditMode={isEditMode}
            onPendingCountChange={setPendingCount}
          />
        </Panel>

        <ResizeHandle />

        <Panel defaultSize={25} minSize={15} collapsible>
          <MetadataPanel
            expressionUri={expressionUri}
            text={text}
            layers={layers}
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
            isEditMode={isEditMode}
            canEdit={canEdit}
            pendingCount={pendingCount}
            selectionMode={selectionMode}
            onToggleEditMode={handleToggleEditMode}
            onSelectionModeChange={setSelectionMode}
            onDiscardChanges={handleDiscardChanges}
          />
        </Panel>
      </PanelGroup>
    </div>
  );

  if (canEdit) {
    return (
      <AnnotationCreationProvider expressionUri={expressionUri}>
        {workspaceContent}
      </AnnotationCreationProvider>
    );
  }

  return workspaceContent;
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

export type { AnnotationWorkspaceProps, SelectionMode };
export { AnnotationWorkspace, AnnotationWorkspaceSkeleton };
