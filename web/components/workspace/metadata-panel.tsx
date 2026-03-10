/**
 * Right panel of the annotation workspace showing metadata and layer controls.
 *
 * In edit mode, displays the current selection mode, pending change count,
 * and provides controls for toggling edit mode and discarding changes.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CrossReferenceList } from '@/components/records/cross-reference-list';

import { LayerToggleSidebar } from '../annotations/composition/layer-toggle-sidebar';
import type { AnnotationLayerData } from '../annotations/types';

import type { SelectionMode } from './annotation-workspace';

interface MetadataPanelProps {
  /** AT-URI of the expression. */
  expressionUri: string;
  /** Raw expression text (for display metrics). */
  text: string;
  /** All annotation layers. */
  layers: AnnotationLayerData[];
  /** Set of currently visible layer URIs. */
  visibleLayers: Set<string>;
  /** Callback when a layer's visibility is toggled. */
  onToggleLayer: (uri: string) => void;
  /** Whether the workspace is in edit mode. */
  isEditMode?: boolean;
  /** Whether the current user can edit (authenticated and isEditable). */
  canEdit?: boolean;
  /** Count of pending unsaved annotation changes. */
  pendingCount?: number;
  /** Current token selection mode. */
  selectionMode?: SelectionMode;
  /** Callback to toggle edit mode on/off. */
  onToggleEditMode?: () => void;
  /** Callback to change the token selection mode. */
  onSelectionModeChange?: (mode: SelectionMode) => void;
  /** Callback to discard all pending changes and exit edit mode. */
  onDiscardChanges?: () => void;
}

/**
 * Extracts the DID from an AT-URI.
 *
 * @param uri - an AT-URI (e.g., "at://did:plc:abc/collection/rkey")
 * @returns the DID portion, or the full URI if parsing fails
 */
function extractDid(uri: string): string {
  const match = uri.match(/^at:\/\/(did:[^/]+)/);
  return match?.[1] ?? uri;
}

/**
 * Truncates a string to a maximum length, adding an ellipsis if needed.
 */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

/** Human-readable label for a selection mode. */
function formatSelectionMode(mode: SelectionMode): string {
  switch (mode) {
    case 'token':
      return 'Token';
    case 'span':
      return 'Span';
    case 'tokenSequence':
      return 'Sequence';
    default:
      return 'None';
  }
}

/** All available selection modes for the mode picker. */
const SELECTION_MODES: SelectionMode[] = ['view', 'token', 'span', 'tokenSequence'];

/**
 * Right sidebar showing expression metadata, layer controls, and cross-references.
 *
 * When `canEdit` is true, a toggle button in the header switches between
 * view and edit modes. In edit mode, the panel shows:
 * - Count of pending unsaved annotations
 * - A "Discard Changes" button
 * - The currently active selection mode with a picker
 */
function MetadataPanel({
  expressionUri,
  text,
  layers,
  visibleLayers,
  onToggleLayer,
  isEditMode = false,
  canEdit = false,
  pendingCount = 0,
  selectionMode = 'view',
  onToggleEditMode,
  onSelectionModeChange,
  onDiscardChanges,
}: MetadataPanelProps): React.JSX.Element {
  const did = extractDid(expressionUri);
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return (
    <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Details</CardTitle>
          {canEdit ? (
            <Button
              variant={isEditMode ? 'secondary' : 'ghost'}
              size="xs"
              onClick={onToggleEditMode}
            >
              {isEditMode ? 'Editing' : 'Edit'}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {/* Edit mode controls */}
            {isEditMode ? (
              <>
                <section className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Annotation Mode
                  </h4>

                  {/* Selection mode picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Selection Mode</label>
                    <div className="flex flex-wrap gap-1">
                      {SELECTION_MODES.map((mode) => (
                        <Button
                          key={mode}
                          variant={selectionMode === mode ? 'secondary' : 'ghost'}
                          size="xs"
                          className="text-[10px]"
                          onClick={() => onSelectionModeChange?.(mode)}
                        >
                          {mode === 'view' ? 'None' : formatSelectionMode(mode)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Pending changes */}
                  {pendingCount > 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-600 border-amber-300"
                      >
                        {pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-[10px] text-destructive"
                        onClick={onDiscardChanges}
                      >
                        Discard Changes
                      </Button>
                    </div>
                  ) : null}
                </section>

                <Separator />
              </>
            ) : null}

            {/* Expression info */}
            <section>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Expression
              </h4>
              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">URI</dt>
                  <dd className="font-mono break-all mt-0.5">{truncate(expressionUri, 60)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Creator</dt>
                  <dd className="font-mono break-all mt-0.5">{truncate(did, 40)}</dd>
                </div>
                <div className="flex gap-4">
                  <div>
                    <dt className="text-muted-foreground">Characters</dt>
                    <dd className="mt-0.5">{charCount.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Words</dt>
                    <dd className="mt-0.5">{wordCount.toLocaleString()}</dd>
                  </div>
                </div>
              </dl>
            </section>

            <Separator />

            {/* Layer controls */}
            <section>
              <LayerToggleSidebar
                layers={layers}
                visibleLayers={visibleLayers}
                onToggle={onToggleLayer}
              />
            </section>

            <Separator />

            {/* Cross-references */}
            <section>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Cross-References
              </h4>
              <CrossReferenceList targetUri={expressionUri} />
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export type { MetadataPanelProps };
export { MetadataPanel };
