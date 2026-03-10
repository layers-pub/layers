/**
 * SVG arc diagram for dependency parse visualization (view-only).
 *
 * Tokens are rendered in a horizontal row at the bottom. Arcs are drawn
 * as quadratic bezier curves above the tokens, with height proportional
 * to the distance between head and dependent.
 *
 * @module
 */

'use client';

import * as React from 'react';

import type { Token } from '../annotations/types';

/**
 * A single arc in a dependency parse.
 */
interface DependencyArc {
  /** Index of the head token (-1 for root). */
  headIndex: number;
  /** Index of the dependent token. */
  targetIndex: number;
  /** Relation label (e.g., "nsubj", "dobj"). */
  label: string;
}

interface DependencyArcDiagramProps {
  /** Tokens from the segmentation record. */
  tokens: Token[];
  /** Dependency arcs to render. */
  arcs: DependencyArc[];
  /** oklch color string for arc strokes. */
  color: string;
}

/** Horizontal spacing per token (pixels). */
const TOKEN_WIDTH = 70;
/** Vertical space for arc labels. */
const ARC_LABEL_HEIGHT = 14;
/** Minimum vertical space for arcs above tokens. */
const MIN_ARC_HEIGHT = 80;
/** Height per unit of distance between head and dependent. */
const ARC_HEIGHT_PER_DISTANCE = 25;
/** Vertical space for the token row. */
const TOKEN_ROW_HEIGHT = 28;
/** Horizontal padding. */
const PADDING_X = 30;
/** Top padding above arcs. */
const PADDING_TOP = 20;

/**
 * Computes the maximum arc height needed for the diagram.
 */
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

/**
 * SVG arc diagram for dependency parse visualization.
 *
 * Draws tokens along the bottom with quadratic bezier arcs connecting
 * heads to dependents above. Root arcs originate from a position above
 * the root token.
 */
const DependencyArcDiagram = React.memo(function DependencyArcDiagram({
  tokens,
  arcs,
  color,
}: DependencyArcDiagramProps): React.JSX.Element {
  if (tokens.length === 0) {
    return <p className="text-sm text-muted-foreground">No tokens to display.</p>;
  }

  const maxArcHeight = computeMaxArcHeight(arcs, tokens.length);
  const totalWidth = tokens.length * TOKEN_WIDTH + PADDING_X * 2;
  const totalHeight = maxArcHeight + TOKEN_ROW_HEIGHT + PADDING_TOP;
  const tokenY = totalHeight - TOKEN_ROW_HEIGHT / 2;
  const baselineY = totalHeight - TOKEN_ROW_HEIGHT;

  /**
   * Returns the x-coordinate center of the token at the given index.
   */
  function tokenX(index: number): number {
    return PADDING_X + index * TOKEN_WIDTH + TOKEN_WIDTH / 2;
  }

  return (
    <div className="overflow-x-auto">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="block"
        role="img"
        aria-label="Dependency parse arc diagram"
      >
        {/* Arcs */}
        {arcs.map((arc, i) => {
          const targetXPos = tokenX(arc.targetIndex);

          if (arc.headIndex === -1) {
            // Root arc: vertical line from above
            const rootY = PADDING_TOP;
            return (
              <g key={`arc-${i}`}>
                <line
                  x1={targetXPos}
                  y1={rootY}
                  x2={targetXPos}
                  y2={baselineY}
                  className="annotation-arc"
                  style={{ stroke: color }}
                />
                <text
                  x={targetXPos}
                  y={rootY - 4}
                  textAnchor="middle"
                  className="text-[10px] fill-muted-foreground"
                >
                  {arc.label}
                </text>
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
            <g key={`arc-${i}`}>
              <path d={d} className="annotation-arc" style={{ stroke: color }} />
              {/* Arrowhead on the dependent end */}
              <circle cx={targetXPos} cy={baselineY} r={3} fill={color} />
              {/* Label at arc midpoint */}
              <text
                x={midX}
                y={midY - 4}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground"
              >
                {arc.label}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={PADDING_X}
          y1={baselineY}
          x2={totalWidth - PADDING_X}
          y2={baselineY}
          className="stroke-border"
          strokeWidth={1}
        />

        {/* Token labels */}
        {tokens.map((token) => (
          <text
            key={`token-${token.index}`}
            x={tokenX(token.index)}
            y={tokenY + 4}
            textAnchor="middle"
            className="text-xs fill-foreground font-mono"
          >
            {token.text.length > 8 ? token.text.slice(0, 7) + '\u2026' : token.text}
          </text>
        ))}
      </svg>
    </div>
  );
});

export type { DependencyArc, DependencyArcDiagramProps };
export { DependencyArcDiagram };
