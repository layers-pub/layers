/**
 * Renderer for span-based annotations (NER, constituents, etc.).
 *
 * Highlights text ranges with colored backgrounds. Supports both character-offset
 * anchors (textSpan) and token-based anchors (tokenRef, tokenRefSequence).
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { confidenceToOpacity } from '../primitives/confidence-indicator';
import type { AnnotationItem, AnnotationLayerData, Token } from '../types';

interface SpanRendererProps {
  /** Annotation layer data with kind "span". */
  layer: AnnotationLayerData;
  /** Raw expression text for character-offset spans. */
  text: string;
  /** Tokens from the segmentation record. */
  tokens: Token[];
  /** oklch color string for this layer. */
  color: string;
}

/**
 * Resolved character range for a span annotation.
 */
interface ResolvedSpan {
  item: AnnotationItem;
  start: number;
  end: number;
}

/**
 * Resolves an annotation item's anchor to character offsets.
 *
 * For textSpan anchors, uses start/end directly. For token-based anchors,
 * looks up character offsets from the token array.
 */
function resolveSpan(item: AnnotationItem, tokens: Token[]): ResolvedSpan | null {
  const anchor = item.anchor;
  if (!anchor) return null;

  if (anchor.type === 'textSpan' && anchor.start != null && anchor.end != null) {
    return { item, start: anchor.start, end: anchor.end };
  }

  if (anchor.type === 'tokenRef' && anchor.tokenIndex != null) {
    const token = tokens[anchor.tokenIndex];
    if (!token) return null;
    return { item, start: token.start, end: token.end };
  }

  if (anchor.type === 'tokenRefSequence' && anchor.tokenIndices && anchor.tokenIndices.length > 0) {
    let minStart = Infinity;
    let maxEnd = -Infinity;
    for (const idx of anchor.tokenIndices) {
      const token = tokens[idx];
      if (!token) continue;
      if (token.start < minStart) minStart = token.start;
      if (token.end > maxEnd) maxEnd = token.end;
    }
    if (minStart === Infinity) return null;
    return { item, start: minStart, end: maxEnd };
  }

  return null;
}

/**
 * A text segment: either plain text or annotated text.
 */
interface TextSegment {
  text: string;
  annotations: AnnotationItem[];
  start: number;
  end: number;
}

/**
 * Splits text into segments based on resolved span boundaries.
 *
 * Handles overlapping spans by assigning multiple annotations to the same
 * character range. Segments are non-overlapping and cover the full text.
 */
function segmentText(text: string, spans: ResolvedSpan[]): TextSegment[] {
  if (spans.length === 0) {
    return [{ text, annotations: [], start: 0, end: text.length }];
  }

  // Collect all boundary points
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(text.length);
  for (const span of spans) {
    boundaries.add(Math.max(0, span.start));
    boundaries.add(Math.min(text.length, span.end));
  }

  const sorted = [...boundaries].sort((a, b) => a - b);
  const segments: TextSegment[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]!;
    const end = sorted[i + 1]!;
    if (start >= end) continue;

    const overlapping = spans.filter((s) => s.start <= start && s.end >= end);
    segments.push({
      text: text.slice(start, end),
      annotations: overlapping.map((s) => s.item),
      start,
      end,
    });
  }

  return segments;
}

/**
 * Renders a single text segment, highlighted if annotated.
 */
const SpanSegment = React.memo(function SpanSegment({
  segment,
  color,
}: {
  segment: TextSegment;
  color: string;
}): React.JSX.Element {
  if (segment.annotations.length === 0) {
    return <span>{segment.text}</span>;
  }

  const firstAnnotation = segment.annotations[0]!;
  const opacity =
    firstAnnotation.confidence != null ? confidenceToOpacity(firstAnnotation.confidence) : 1;

  const bgIntensity = Math.min(40, 15 + segment.annotations.length * 8);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="annotation-span"
            style={{
              backgroundColor: `color-mix(in oklch, ${color} ${bgIntensity}%, transparent)`,
              borderBottomColor: color,
              opacity,
            }}
          />
        }
      >
        {segment.text}
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-0.5">
          {segment.annotations.map((a) => (
            <div key={a.id} className="text-xs">
              <span className="font-medium">{a.label}</span>
              {a.confidence != null ? (
                <span className="ml-1 text-muted-foreground">
                  ({(a.confidence / 10).toFixed(1)}%)
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

/**
 * Span annotation renderer.
 *
 * Highlights text ranges with colored backgrounds. Overlapping spans produce
 * deeper colors. Each segment shows its annotations on hover.
 */
const SpanRenderer = React.memo(function SpanRenderer({
  layer,
  text,
  tokens,
  color,
}: SpanRendererProps): React.JSX.Element {
  const segments = React.useMemo(() => {
    const resolved = layer.items
      .map((item) => resolveSpan(item, tokens))
      .filter((s): s is ResolvedSpan => s != null);
    return segmentText(text, resolved);
  }, [layer.items, text, tokens]);

  if (text.length === 0) {
    return <p className="text-sm text-muted-foreground">No text available for span display.</p>;
  }

  return (
    <div className="leading-relaxed text-sm">
      {segments.map((segment) => (
        <SpanSegment key={`${segment.start}-${segment.end}`} segment={segment} color={color} />
      ))}
    </div>
  );
});

export type { SpanRendererProps };
export { SpanRenderer };
