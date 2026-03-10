/**
 * Interactive dependency arc editor for creating and editing dependency parses.
 *
 * Extends the view-only DependencyArcDiagram with creation, editing, and
 * deletion interactions. Click a token to start an arc, click another to
 * set the head. Click an arc label to edit it inline. Right-click to delete.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import type { Token } from '../annotations/types';

import type { DependencyArc } from './dependency-arc-diagram';

// =============================================================================
// Types
// =============================================================================

interface DependencyArcEditorProps {
  /** Tokens from the segmentation record. */
  tokens: Token[];
  /** Current dependency arcs. */
  arcs: DependencyArc[];
  /** oklch color string for arc strokes. */
  color: string;
  /** Called when a new arc is created. */
  onArcCreate: (arc: DependencyArc) => void;
  /** Called when an existing arc's label is updated. */
  onArcUpdate: (index: number, arc: DependencyArc) => void;
  /** Called when an arc is deleted. */
  onArcDelete: (index: number) => void;
}

/** Layout constants (matching the view-only diagram). */
const TOKEN_WIDTH = 70;
const ARC_LABEL_HEIGHT = 14;
const MIN_ARC_HEIGHT = 80;
const ARC_HEIGHT_PER_DISTANCE = 25;
const TOKEN_ROW_HEIGHT = 28;
const PADDING_X = 30;
const PADDING_TOP = 20;

/** Click zone above tokens for setting root (headIndex = -1). */
const ROOT_ZONE_HEIGHT = 30;

// =============================================================================
// Helpers
// =============================================================================

function computeMaxArcHeight(arcs: DependencyArc[], tokenCount: number): number {
  if (arcs.length === 0) return MIN_ARC_HEIGHT;

  let maxDist = 1;
  for (const arc of arcs) {
    const head = arc.headIndex === -1 ? -1 : arc.headIndex;
    const dist = head === -1 ? tokenCount * 0.5 : Math.abs(head - arc.targetIndex);
    if (dist > maxDist) maxDist = dist;
  }

  return Math.max(MIN_ARC_HEIGHT, maxDist * ARC_HEIGHT_PER_DISTANCE + ARC_LABEL_HEIGHT);
}

function tokenX(index: number): number {
  return PADDING_X + index * TOKEN_WIDTH + TOKEN_WIDTH / 2;
}

/**
 * Returns an oklch color for a given label, cycling through a small palette.
 */
function arcColorForLabel(label: string, baseColor: string): string {
  if (!label) return baseColor;
  // Simple hash to pick a hue offset
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0;
  }
  const hueOffset = (Math.abs(hash) % 12) * 30;
  // Extract the base oklch and shift hue
  const match = baseColor.match(/oklch\(([^ ]+) ([^ ]+) ([^)]+)\)/);
  if (!match) return baseColor;
  const [, l, c, h] = match;
  const newHue = (parseFloat(h ?? '0') + hueOffset) % 360;
  return `oklch(${l} ${c} ${newHue})`;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Interactive dependency arc editor.
 *
 * Building on the visual structure of DependencyArcDiagram, this component
 * adds interactive arc creation, label editing, and deletion.
 *
 * - Click a token, then click another token to create a head-dependent arc
 * - Click above a token (in the root zone) to set it as root (headIndex = -1)
 * - Click an arc label to edit it inline
 * - Right-click an arc to delete it
 */
const DependencyArcEditor = React.memo(function DependencyArcEditor({
  tokens,
  arcs,
  color,
  onArcCreate,
  onArcUpdate,
  onArcDelete,
}: DependencyArcEditorProps): React.JSX.Element {
  // Pending arc creation state: the index of the first token clicked
  const [pendingSource, setPendingSource] = React.useState<number | null>(null);
  // Inline label editing state
  const [editingArcIndex, setEditingArcIndex] = React.useState<number | null>(null);
  const [editingLabel, setEditingLabel] = React.useState('');
  const editInputRef = React.useRef<HTMLInputElement>(null);

  if (tokens.length === 0) {
    return <p className="text-sm text-muted-foreground">No tokens to display.</p>;
  }

  const maxArcHeight = computeMaxArcHeight(arcs, tokens.length);
  const totalWidth = tokens.length * TOKEN_WIDTH + PADDING_X * 2;
  const totalHeight = maxArcHeight + TOKEN_ROW_HEIGHT + PADDING_TOP + ROOT_ZONE_HEIGHT;
  const tokenY = totalHeight - TOKEN_ROW_HEIGHT / 2;
  const baselineY = totalHeight - TOKEN_ROW_HEIGHT;

  /**
   * Handles clicking on a token to start or finish arc creation.
   */
  function handleTokenClick(tokenIndex: number): void {
    if (pendingSource === null) {
      // First click: set the head (source)
      setPendingSource(tokenIndex);
    } else {
      if (pendingSource !== tokenIndex) {
        // Second click: create arc from head to dependent
        onArcCreate({
          headIndex: pendingSource,
          targetIndex: tokenIndex,
          label: 'dep',
        });
      }
      setPendingSource(null);
    }
  }

  /**
   * Handles clicking in the root zone above a token to set it as root.
   */
  function handleRootZoneClick(e: React.MouseEvent<SVGRectElement>): void {
    const svg = e.currentTarget.closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = e.clientX - rect.left;

    // Find the nearest token
    let nearestIndex = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < tokens.length; i++) {
      const tx = tokenX(i);
      const dist = Math.abs(svgX - tx);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    }

    if (nearestDist < TOKEN_WIDTH / 2) {
      onArcCreate({
        headIndex: -1,
        targetIndex: nearestIndex,
        label: 'root',
      });
      setPendingSource(null);
    }
  }

  /**
   * Begins inline editing of an arc's label.
   */
  function handleLabelClick(arcIndex: number, currentLabel: string): void {
    setEditingArcIndex(arcIndex);
    setEditingLabel(currentLabel);
    // Focus the input on next tick after render
    requestAnimationFrame(() => editInputRef.current?.focus());
  }

  /**
   * Commits the label edit.
   */
  function commitLabelEdit(): void {
    if (editingArcIndex !== null) {
      const arc = arcs[editingArcIndex];
      if (arc) {
        onArcUpdate(editingArcIndex, { ...arc, label: editingLabel });
      }
      setEditingArcIndex(null);
      setEditingLabel('');
    }
  }

  /**
   * Handles right-click on an arc to delete it.
   */
  function handleArcContextMenu(e: React.MouseEvent, arcIndex: number): void {
    e.preventDefault();
    onArcDelete(arcIndex);
  }

  return (
    <div className="overflow-x-auto relative">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="block"
        role="img"
        aria-label="Interactive dependency parse arc editor"
      >
        {/* Root zone (clickable area above all tokens) */}
        <rect
          x={0}
          y={0}
          width={totalWidth}
          height={ROOT_ZONE_HEIGHT}
          fill="transparent"
          className="cursor-pointer"
          onClick={handleRootZoneClick}
        />

        {/* Hint text in root zone */}
        <text
          x={totalWidth / 2}
          y={ROOT_ZONE_HEIGHT / 2 + 4}
          textAnchor="middle"
          className="text-[9px] fill-muted-foreground/50 pointer-events-none select-none"
        >
          Click here above a token to set root
        </text>

        {/* Arcs */}
        {arcs.map((arc, i) => {
          const targetXPos = tokenX(arc.targetIndex);
          const arcColor = arcColorForLabel(arc.label, color);

          if (arc.headIndex === -1) {
            // Root arc
            const rootY = PADDING_TOP + ROOT_ZONE_HEIGHT;
            return (
              <g
                key={`arc-${i}`}
                className="cursor-pointer"
                onContextMenu={(e) => handleArcContextMenu(e, i)}
              >
                <line
                  x1={targetXPos}
                  y1={rootY}
                  x2={targetXPos}
                  y2={baselineY}
                  className="annotation-arc"
                  style={{ stroke: arcColor }}
                  strokeWidth={2}
                />
                {/* Wider invisible hit area for right-click */}
                <line
                  x1={targetXPos}
                  y1={rootY}
                  x2={targetXPos}
                  y2={baselineY}
                  stroke="transparent"
                  strokeWidth={10}
                  onContextMenu={(e) => handleArcContextMenu(e, i)}
                />
                {editingArcIndex === i ? (
                  <foreignObject x={targetXPos - 30} y={rootY - 18} width={60} height={20}>
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onBlur={commitLabelEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitLabelEdit();
                        if (e.key === 'Escape') {
                          setEditingArcIndex(null);
                          setEditingLabel('');
                        }
                      }}
                      className="w-full h-full text-[10px] text-center border rounded bg-background px-1"
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={targetXPos}
                    y={rootY - 4}
                    textAnchor="middle"
                    className="text-[10px] fill-muted-foreground cursor-pointer hover:fill-foreground"
                    onClick={() => handleLabelClick(i, arc.label)}
                  >
                    {arc.label}
                  </text>
                )}
              </g>
            );
          }

          const headXPos = tokenX(arc.headIndex);
          const dist = Math.abs(arc.headIndex - arc.targetIndex);
          const arcHeight = dist * ARC_HEIGHT_PER_DISTANCE;
          const midX = (headXPos + targetXPos) / 2;
          const midY = baselineY - arcHeight;
          const d = `M ${headXPos} ${baselineY} Q ${midX} ${midY} ${targetXPos} ${baselineY}`;

          return (
            <g
              key={`arc-${i}`}
              className="cursor-pointer"
              onContextMenu={(e) => handleArcContextMenu(e, i)}
            >
              <path d={d} className="annotation-arc" style={{ stroke: arcColor }} strokeWidth={2} />
              {/* Wider invisible hit area */}
              <path d={d} stroke="transparent" strokeWidth={10} fill="none" />
              {/* Arrowhead */}
              <circle cx={targetXPos} cy={baselineY} r={3} fill={arcColor} />

              {/* Label */}
              {editingArcIndex === i ? (
                <foreignObject x={midX - 30} y={midY - 18} width={60} height={20}>
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    onBlur={commitLabelEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitLabelEdit();
                      if (e.key === 'Escape') {
                        setEditingArcIndex(null);
                        setEditingLabel('');
                      }
                    }}
                    className="w-full h-full text-[10px] text-center border rounded bg-background px-1"
                  />
                </foreignObject>
              ) : (
                <text
                  x={midX}
                  y={midY - 4}
                  textAnchor="middle"
                  className="text-[10px] fill-muted-foreground cursor-pointer hover:fill-foreground"
                  onClick={() => handleLabelClick(i, arc.label)}
                >
                  {arc.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Pending arc preview (dashed line from source to cursor would be complex,
            so we show a highlight on the source token instead) */}

        {/* Baseline */}
        <line
          x1={PADDING_X}
          y1={baselineY}
          x2={totalWidth - PADDING_X}
          y2={baselineY}
          className="stroke-border"
          strokeWidth={1}
        />

        {/* Token labels (clickable for arc creation) */}
        {tokens.map((token) => {
          const tx = tokenX(token.index);
          const isSourceToken = pendingSource === token.index;

          return (
            <g key={`token-${token.index}`}>
              {/* Token hit area */}
              <rect
                x={tx - TOKEN_WIDTH / 2}
                y={baselineY}
                width={TOKEN_WIDTH}
                height={TOKEN_ROW_HEIGHT}
                fill={isSourceToken ? 'oklch(0.9 0.05 260)' : 'transparent'}
                className="cursor-pointer"
                rx={3}
                onClick={() => handleTokenClick(token.index)}
              />
              <text
                x={tx}
                y={tokenY + 4}
                textAnchor="middle"
                className={cn(
                  'text-xs font-mono cursor-pointer',
                  isSourceToken ? 'fill-primary font-bold' : 'fill-foreground',
                )}
                onClick={() => handleTokenClick(token.index)}
              >
                {token.text.length > 8 ? token.text.slice(0, 7) + '\u2026' : token.text}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Status indicator */}
      {pendingSource !== null ? (
        <div className="absolute top-2 right-2 rounded-md border border-border bg-popover px-2 py-1 text-xs text-muted-foreground shadow-sm">
          Click another token to set as dependent (Esc to cancel)
        </div>
      ) : null}
    </div>
  );
});

export type { DependencyArcEditorProps };
export { DependencyArcEditor };
