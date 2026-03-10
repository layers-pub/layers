/**
 * Renderer for tier-based annotations (ELAN-style horizontal timelines).
 *
 * Renders tier annotations as horizontal timeline rows proportional to their
 * temporal duration.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { confidenceToOpacity } from '../primitives/confidence-indicator';
import type { AnnotationItem, AnnotationLayerData } from '../types';

interface TierRendererProps {
  /** Annotation layer data with kind "tier". */
  layer: AnnotationLayerData;
  /** oklch color string for this layer. */
  color: string;
}

/**
 * Computes the total time span of all items in the layer.
 */
function computeTimeRange(items: AnnotationItem[]): { minTime: number; maxTime: number } {
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const item of items) {
    const anchor = item.anchor;
    if (!anchor) continue;
    if (anchor.startTime != null && anchor.startTime < minTime) minTime = anchor.startTime;
    if (anchor.endTime != null && anchor.endTime > maxTime) maxTime = anchor.endTime;
  }

  if (minTime === Infinity) return { minTime: 0, maxTime: 1 };
  if (maxTime <= minTime) return { minTime, maxTime: minTime + 1 };
  return { minTime, maxTime };
}

/**
 * Formats a time value in seconds to a "mm:ss.s" string.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

/**
 * Renders a single tier segment as a positioned bar.
 */
const TierSegment = React.memo(function TierSegment({
  item,
  minTime,
  totalDuration,
  color,
}: {
  item: AnnotationItem;
  minTime: number;
  totalDuration: number;
  color: string;
}): React.JSX.Element | null {
  const anchor = item.anchor;
  if (!anchor || anchor.startTime == null || anchor.endTime == null) return null;

  const leftPercent = ((anchor.startTime - minTime) / totalDuration) * 100;
  const widthPercent = ((anchor.endTime - anchor.startTime) / totalDuration) * 100;
  const opacity = item.confidence != null ? confidenceToOpacity(item.confidence) : 1;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className="absolute top-0.5 bottom-0.5 flex items-center justify-center overflow-hidden rounded-sm px-1 text-[10px] font-medium"
            style={{
              left: `${leftPercent}%`,
              width: `${Math.max(widthPercent, 0.5)}%`,
              backgroundColor: `color-mix(in oklch, ${color} 30%, transparent)`,
              borderLeft: `2px solid ${color}`,
              opacity,
            }}
          />
        }
      >
        <span className="truncate">{item.value ?? item.label}</span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="font-medium">{item.label}</span>
          {item.value ? <span>{item.value}</span> : null}
          <span className="text-muted-foreground">
            {formatTime(anchor.startTime)} - {formatTime(anchor.endTime)}
          </span>
          {item.confidence != null ? (
            <span className="text-muted-foreground">
              Confidence: {(item.confidence / 10).toFixed(1)}%
            </span>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

/**
 * ELAN-style horizontal timeline tier renderer.
 *
 * Shows a fixed-width label column and a proportional content area where
 * annotation segments are positioned based on their temporal anchors.
 */
const TierRenderer = React.memo(function TierRenderer({
  layer,
  color,
}: TierRendererProps): React.JSX.Element {
  const temporalItems = React.useMemo(
    () =>
      layer.items.filter((item) => item.anchor?.startTime != null && item.anchor?.endTime != null),
    [layer.items],
  );

  const { minTime, maxTime } = React.useMemo(
    () => computeTimeRange(temporalItems),
    [temporalItems],
  );

  const totalDuration = maxTime - minTime;

  if (temporalItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No time-aligned annotations in this tier.</p>
    );
  }

  return (
    <div className={cn('flex flex-col')}>
      {/* Time axis labels */}
      <div className="flex items-center text-[10px] text-muted-foreground mb-1">
        <div className="w-32 flex-shrink-0" />
        <div className="flex-1 flex justify-between px-1">
          <span>{formatTime(minTime)}</span>
          <span>{formatTime((minTime + maxTime) / 2)}</span>
          <span>{formatTime(maxTime)}</span>
        </div>
      </div>

      {/* Tier row */}
      <div className="tier-row">
        <div className="tier-label" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
          {layer.label ?? layer.subkind ?? 'Tier'}
        </div>
        <div className="tier-content">
          {temporalItems.map((item) => (
            <TierSegment
              key={item.id}
              item={item}
              minTime={minTime}
              totalDuration={totalDuration}
              color={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export type { TierRendererProps };
export { TierRenderer };
