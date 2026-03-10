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
import type { AnnotationLayerData, Token } from '../annotations/types';

import { AnnotationCreationProvider } from './annotation-creation-context';
import { AnnotationToolbar } from './annotation-toolbar';

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
        // Save is handled by the annotation creation context (created by other agents)
        return;
      }

      // Ctrl/Cmd+Z: undo last annotation item
      if (isMeta && e.key === 'z') {
        e.preventDefault();
        // Undo is handled by the annotation creation context (created by other agents)
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

      <PanelGroup orientation="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize={25} minSize={15} collapsible>
          <ExpressionPanel
            expressionUri={expressionUri}
            text={text}
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
