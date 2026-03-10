/**
 * Bounding box annotation editor for images.
 *
 * Renders an image with an SVG overlay for drawing, resizing, and labeling
 * bounding box annotations. Supports creating multiple boxes simultaneously,
 * with resize handles on corners and edges.
 *
 * @module
 */

'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

/** A bounding box annotation with label metadata. */
interface BoundingBoxData {
  /** Unique identifier. */
  id: string;
  /** X coordinate (0-1, relative to image width). */
  x: number;
  /** Y coordinate (0-1, relative to image height). */
  y: number;
  /** Width (0-1, relative to image width). */
  width: number;
  /** Height (0-1, relative to image height). */
  height: number;
  /** Display label. */
  label: string;
  /** oklch color for the box outline. */
  color?: string;
}

interface BoundingBoxEditorProps {
  /** URL of the image to annotate. */
  imageUrl: string;
  /** Existing bounding boxes to display. */
  boxes: BoundingBoxData[];
  /** Called when a new box is created via click-and-drag. */
  onBoxCreate: (box: BoundingBoxData) => void;
  /** Called when an existing box is updated (moved, resized, or relabeled). */
  onBoxUpdate: (id: string, box: BoundingBoxData) => void;
  /** Called when a box is deleted. */
  onBoxDelete: (id: string) => void;
}

/** Which resize handle is being dragged. */
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

/** Internal drag state. */
interface DragState {
  type: 'create' | 'move' | 'resize';
  /** Starting mouse position in normalized coords. */
  startX: number;
  startY: number;
  /** For move/resize: the box being manipulated. */
  boxId?: string;
  /** For resize: which handle. */
  handle?: ResizeHandle;
  /** Original box position for move/resize operations. */
  originalBox?: BoundingBoxData;
}

// =============================================================================
// Constants
// =============================================================================

const HANDLE_SIZE = 8;
const DEFAULT_BOX_COLOR = 'oklch(0.65 0.20 25)';

// =============================================================================
// Helpers
// =============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Generates a unique ID for new boxes.
 */
function generateBoxId(): string {
  return crypto.randomUUID();
}

/**
 * Converts mouse event coordinates to normalized (0-1) image coordinates.
 */
function eventToNormalized(
  e: React.MouseEvent | MouseEvent,
  container: HTMLElement,
): { nx: number; ny: number } {
  const rect = container.getBoundingClientRect();
  return {
    nx: clamp((e.clientX - rect.left) / rect.width, 0, 1),
    ny: clamp((e.clientY - rect.top) / rect.height, 0, 1),
  };
}

/**
 * Returns the resize cursor style for a given handle position.
 */
function handleCursor(handle: ResizeHandle): string {
  const cursors: Record<ResizeHandle, string> = {
    nw: 'nwse-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    se: 'nwse-resize',
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
  };
  return cursors[handle];
}

// =============================================================================
// Resize handles sub-component
// =============================================================================

interface BoxHandlesProps {
  box: BoundingBoxData;
  containerWidth: number;
  containerHeight: number;
  onHandleMouseDown: (boxId: string, handle: ResizeHandle, e: React.MouseEvent) => void;
}

function BoxHandles({
  box,
  containerWidth,
  containerHeight,
  onHandleMouseDown,
}: BoxHandlesProps): React.JSX.Element {
  const px = box.x * containerWidth;
  const py = box.y * containerHeight;
  const pw = box.width * containerWidth;
  const ph = box.height * containerHeight;
  const half = HANDLE_SIZE / 2;

  const handles: { key: ResizeHandle; cx: number; cy: number }[] = [
    { key: 'nw', cx: px, cy: py },
    { key: 'ne', cx: px + pw, cy: py },
    { key: 'sw', cx: px, cy: py + ph },
    { key: 'se', cx: px + pw, cy: py + ph },
    { key: 'n', cx: px + pw / 2, cy: py },
    { key: 's', cx: px + pw / 2, cy: py + ph },
    { key: 'w', cx: px, cy: py + ph / 2 },
    { key: 'e', cx: px + pw, cy: py + ph / 2 },
  ];

  return (
    <>
      {handles.map((h) => (
        <rect
          key={h.key}
          x={h.cx - half}
          y={h.cy - half}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill="white"
          stroke={box.color ?? DEFAULT_BOX_COLOR}
          strokeWidth={1.5}
          style={{ cursor: handleCursor(h.key) }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown(box.id, h.key, e);
          }}
        />
      ))}
    </>
  );
}

// =============================================================================
// Main component
// =============================================================================

/**
 * Interactive bounding box annotation editor.
 *
 * Renders an image with an SVG overlay. Click and drag on empty space to
 * create a new box. Click a box to select it and show its label input.
 * Drag handles to resize. Press Delete or click the trash icon to remove.
 */
function BoundingBoxEditor({
  imageUrl,
  boxes,
  onBoxCreate,
  onBoxUpdate,
  onBoxDelete,
}: BoundingBoxEditorProps): React.JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  const [selectedBoxId, setSelectedBoxId] = React.useState<string | null>(null);
  const [dragState, setDragState] = React.useState<DragState | null>(null);
  const [previewBox, setPreviewBox] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [editingLabel, setEditingLabel] = React.useState('');

  const selectedBox = boxes.find((b) => b.id === selectedBoxId);

  // Track container size
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (selectedBoxId) {
          onBoxDelete(selectedBoxId);
          setSelectedBoxId(null);
        }
      }
      if (e.key === 'Escape') {
        setSelectedBoxId(null);
        setDragState(null);
        setPreviewBox(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedBoxId, onBoxDelete]);

  /**
   * Starts creating a new box on mousedown in empty space.
   */
  const handleContainerMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;

    const { nx, ny } = eventToNormalized(e, container);

    setDragState({
      type: 'create',
      startX: nx,
      startY: ny,
    });
    setPreviewBox({ x: nx, y: ny, width: 0, height: 0 });
    setSelectedBoxId(null);
  }, []);

  /**
   * Starts moving a box on mousedown on the box body.
   */
  const handleBoxMouseDown = React.useCallback(
    (boxId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const container = containerRef.current;
      if (!container) return;

      const box = boxes.find((b) => b.id === boxId);
      if (!box) return;

      const { nx, ny } = eventToNormalized(e, container);

      setSelectedBoxId(boxId);
      setEditingLabel(box.label);
      setDragState({
        type: 'move',
        startX: nx,
        startY: ny,
        boxId,
        originalBox: { ...box },
      });
    },
    [boxes],
  );

  /**
   * Starts resizing a box from a handle.
   */
  const handleResizeMouseDown = React.useCallback(
    (boxId: string, handle: ResizeHandle, e: React.MouseEvent) => {
      e.stopPropagation();
      const container = containerRef.current;
      if (!container) return;

      const box = boxes.find((b) => b.id === boxId);
      if (!box) return;

      const { nx, ny } = eventToNormalized(e, container);

      setSelectedBoxId(boxId);
      setDragState({
        type: 'resize',
        startX: nx,
        startY: ny,
        boxId,
        handle,
        originalBox: { ...box },
      });
    },
    [boxes],
  );

  // Mouse move and mouse up handlers for drag operations
  React.useEffect(() => {
    if (!dragState) return;

    function handleMouseMove(e: MouseEvent): void {
      const container = containerRef.current;
      if (!container || !dragState) return;

      const { nx, ny } = eventToNormalized(e, container);

      if (dragState.type === 'create') {
        const x = Math.min(dragState.startX, nx);
        const y = Math.min(dragState.startY, ny);
        const width = Math.abs(nx - dragState.startX);
        const height = Math.abs(ny - dragState.startY);
        setPreviewBox({ x, y, width, height });
      }

      if (dragState.type === 'move' && dragState.originalBox && dragState.boxId) {
        const dx = nx - dragState.startX;
        const dy = ny - dragState.startY;
        const orig = dragState.originalBox;
        onBoxUpdate(dragState.boxId, {
          ...orig,
          x: clamp(orig.x + dx, 0, 1 - orig.width),
          y: clamp(orig.y + dy, 0, 1 - orig.height),
        });
      }

      if (
        dragState.type === 'resize' &&
        dragState.originalBox &&
        dragState.boxId &&
        dragState.handle
      ) {
        const orig = dragState.originalBox;
        const dx = nx - dragState.startX;
        const dy = ny - dragState.startY;

        let newX = orig.x;
        let newY = orig.y;
        let newW = orig.width;
        let newH = orig.height;

        const handle = dragState.handle;
        if (handle.includes('w')) {
          newX = clamp(orig.x + dx, 0, orig.x + orig.width - 0.01);
          newW = orig.width - (newX - orig.x);
        }
        if (handle.includes('e')) {
          newW = clamp(orig.width + dx, 0.01, 1 - orig.x);
        }
        if (handle.includes('n')) {
          newY = clamp(orig.y + dy, 0, orig.y + orig.height - 0.01);
          newH = orig.height - (newY - orig.y);
        }
        if (handle.includes('s')) {
          newH = clamp(orig.height + dy, 0.01, 1 - orig.y);
        }

        onBoxUpdate(dragState.boxId, {
          ...orig,
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        });
      }
    }

    function handleMouseUp(): void {
      if (dragState?.type === 'create' && previewBox) {
        // Only create if the box has meaningful size
        if (previewBox.width > 0.01 && previewBox.height > 0.01) {
          const newBox: BoundingBoxData = {
            id: generateBoxId(),
            x: previewBox.x,
            y: previewBox.y,
            width: previewBox.width,
            height: previewBox.height,
            label: '',
            color: DEFAULT_BOX_COLOR,
          };
          onBoxCreate(newBox);
          setSelectedBoxId(newBox.id);
          setEditingLabel('');
        }
      }
      setDragState(null);
      setPreviewBox(null);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, previewBox, onBoxCreate, onBoxUpdate]);

  /**
   * Commits a label edit for the selected box.
   */
  const handleLabelCommit = React.useCallback(() => {
    if (selectedBox) {
      onBoxUpdate(selectedBox.id, { ...selectedBox, label: editingLabel });
    }
  }, [selectedBox, editingLabel, onBoxUpdate]);

  return (
    <div className="flex flex-col gap-2">
      {/* Image container with SVG overlay */}
      <div
        ref={containerRef}
        className={cn(
          'relative select-none',
          dragState?.type === 'create' ? 'cursor-crosshair' : 'cursor-default',
        )}
        onMouseDown={handleContainerMouseDown}
      >
        {/* Image */}
        <img
          src={imageUrl}
          alt="Annotatable image"
          className="w-full h-auto block rounded-md"
          draggable={false}
        />

        {/* SVG overlay */}
        {containerSize.width > 0 && containerSize.height > 0 ? (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
          >
            {/* Existing boxes */}
            {boxes.map((box) => {
              const px = box.x * containerSize.width;
              const py = box.y * containerSize.height;
              const pw = box.width * containerSize.width;
              const ph = box.height * containerSize.height;
              const boxColor = box.color ?? DEFAULT_BOX_COLOR;
              const isSelected = box.id === selectedBoxId;

              return (
                <g key={box.id} className="pointer-events-auto">
                  {/* Box fill (semi-transparent) */}
                  <rect
                    x={px}
                    y={py}
                    width={pw}
                    height={ph}
                    fill={`color-mix(in oklch, ${boxColor} 15%, transparent)`}
                    stroke={boxColor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={isSelected ? 'none' : '4 2'}
                    className="cursor-move"
                    onMouseDown={(e) => handleBoxMouseDown(box.id, e)}
                  />

                  {/* Label background */}
                  {box.label ? (
                    <>
                      <rect
                        x={px}
                        y={py - 16}
                        width={Math.min(box.label.length * 7 + 8, pw)}
                        height={16}
                        fill={boxColor}
                        rx={2}
                      />
                      <text x={px + 4} y={py - 4} className="text-[10px] fill-white font-medium">
                        {box.label}
                      </text>
                    </>
                  ) : null}

                  {/* Resize handles (only for selected box) */}
                  {isSelected ? (
                    <BoxHandles
                      box={box}
                      containerWidth={containerSize.width}
                      containerHeight={containerSize.height}
                      onHandleMouseDown={handleResizeMouseDown}
                    />
                  ) : null}
                </g>
              );
            })}

            {/* Preview box during creation */}
            {previewBox && dragState?.type === 'create' ? (
              <rect
                x={previewBox.x * containerSize.width}
                y={previewBox.y * containerSize.height}
                width={previewBox.width * containerSize.width}
                height={previewBox.height * containerSize.height}
                fill="oklch(0.6 0.15 260 / 0.15)"
                stroke="oklch(0.6 0.15 260)"
                strokeWidth={2}
                strokeDasharray="6 3"
              />
            ) : null}
          </svg>
        ) : null}
      </div>

      {/* Selected box controls */}
      {selectedBox ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
          <Input
            type="text"
            placeholder="Label"
            value={editingLabel}
            onChange={(e) => setEditingLabel(e.target.value)}
            onBlur={handleLabelCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelCommit();
            }}
            className="w-40 h-7 text-xs"
          />

          <span className="text-[10px] text-muted-foreground tabular-nums">
            ({(selectedBox.x * 100).toFixed(0)}%, {(selectedBox.y * 100).toFixed(0)}%){' '}
            {(selectedBox.width * 100).toFixed(0)}x{(selectedBox.height * 100).toFixed(0)}%
          </span>

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 text-destructive"
                  onClick={() => {
                    onBoxDelete(selectedBox.id);
                    setSelectedBoxId(null);
                  }}
                />
              }
            >
              <Trash2 className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Delete box (Delete key)
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
}

export type { BoundingBoxEditorProps, BoundingBoxData };
export { BoundingBoxEditor };
