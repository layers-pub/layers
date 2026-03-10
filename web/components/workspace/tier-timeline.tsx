/**
 * View-only timeline that syncs tier annotations with media playback.
 *
 * Renders ELAN-style horizontal rows for each tier layer, with a vertical
 * cursor tracking the current playback position. Clicking segments or
 * empty space triggers seeking.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { AnnotationItem, AnnotationLayerData } from '../annotations/types';

interface TierTimelineProps {
  /** Annotation layers to display (only layers with kind "tier" are rendered). */
  layers: AnnotationLayerData[];
  /** Current playback time in seconds. */
  currentTime: number;
  /** Total media duration in seconds. */
  duration: number;
  /** Called when the user clicks to seek to a specific time. */
  onSeek?: (time: number) => void;
}

/**
 * Number of second markers to show in the time ruler.
 */
const MAX_RULER_MARKS = 20;

/**
 * Formats seconds to "m:ss" for ruler labels.
 */
function formatRulerTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds - mins * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Computes evenly spaced time marks for the ruler.
 */
function computeRulerMarks(duration: number): number[] {
  if (duration <= 0) return [0];

  const idealStep = duration / MAX_RULER_MARKS;
  const niceSteps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  const step = niceSteps.find((s) => s >= idealStep) ?? niceSteps[niceSteps.length - 1]!;

  const marks: number[] = [];
  for (let t = 0; t <= duration; t += step) {
    marks.push(t);
  }
  return marks;
}

/**
 * A single segment within a tier row, positioned proportionally.
 */
const TimelineSegment = React.memo(function TimelineSegment({
  item,
  duration,
  color,
  onSeek,
}: {
  item: AnnotationItem;
  duration: number;
  color: string;
  onSeek?: (time: number) => void;
}): React.JSX.Element | null {
  const anchor = item.anchor;
  const startTime = anchor?.startTime;

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (startTime != null) onSeek?.(startTime);
    },
    [onSeek, startTime],
  );

  const endTime = anchor?.endTime;
  if (!anchor || startTime == null || endTime == null) return null;
  if (duration <= 0) return null;

  const leftPercent = (startTime / duration) * 100;
  const widthPercent = ((endTime - startTime) / duration) * 100;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            role="button"
            tabIndex={0}
            className="absolute top-0.5 bottom-0.5 flex items-center justify-center overflow-hidden rounded-sm px-1 text-[10px] font-medium cursor-pointer hover:brightness-110 transition-[filter]"
            style={{
              left: `${leftPercent}%`,
              width: `${Math.max(widthPercent, 0.3)}%`,
              backgroundColor: `color-mix(in oklch, ${color} 30%, transparent)`,
              borderLeft: `2px solid ${color}`,
            }}
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (startTime != null) onSeek?.(startTime);
              }
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
            {startTime.toFixed(2)}s - {endTime.toFixed(2)}s
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

/**
 * A single tier row with a label column and a content area.
 */
const TierRow = React.memo(function TierRow({
  layer,
  duration,
  currentTime,
  onSeek,
}: {
  layer: AnnotationLayerData;
  duration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
}): React.JSX.Element {
  const color = layer.color ?? 'oklch(0.6 0.1 260)';

  const temporalItems = React.useMemo(
    () =>
      layer.items.filter((item) => item.anchor?.startTime != null && item.anchor?.endTime != null),
    [layer.items],
  );

  const handleContentClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || duration <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const time = Math.max(0, Math.min(duration, ratio * duration));
      onSeek(time);
    },
    [onSeek, duration],
  );

  const cursorPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="tier-row">
      <div className="tier-label" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
        {layer.label ?? layer.subkind ?? 'Tier'}
      </div>
      <div
        className="tier-content cursor-pointer"
        onClick={handleContentClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
          }
        }}
      >
        {temporalItems.map((item) => (
          <TimelineSegment
            key={item.id}
            item={item}
            duration={duration}
            color={color}
            onSeek={onSeek}
          />
        ))}

        {/* Playback cursor */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
          style={{ left: `${cursorPercent}%` }}
        />
      </div>
    </div>
  );
});

/**
 * View-only tier timeline synchronized with media playback.
 *
 * Filters the provided layers to only display those with kind "tier",
 * rendering each as a horizontal row with proportionally positioned
 * annotation segments. A red cursor line tracks the current time.
 */
function TierTimeline({
  layers,
  currentTime,
  duration,
  onSeek,
}: TierTimelineProps): React.JSX.Element {
  const tierLayers = React.useMemo(() => layers.filter((l) => l.kind === 'tier'), [layers]);

  const rulerMarks = React.useMemo(() => computeRulerMarks(duration), [duration]);

  if (tierLayers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-2 py-4">No tier annotations to display.</p>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Time ruler */}
      <div className="flex items-end text-[10px] text-muted-foreground border-b border-border">
        <div className="w-32 flex-shrink-0" />
        <div className="relative flex-1 h-5">
          {rulerMarks.map((t) => {
            const leftPercent = duration > 0 ? (t / duration) * 100 : 0;
            return (
              <span
                key={t}
                className="absolute bottom-0 -translate-x-1/2 tabular-nums"
                style={{ left: `${leftPercent}%` }}
              >
                {formatRulerTime(t)}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tier rows */}
      <ScrollArea className={cn(tierLayers.length > 8 && 'max-h-64')}>
        {tierLayers.map((layer) => (
          <TierRow
            key={layer.uri}
            layer={layer}
            duration={duration}
            currentTime={currentTime}
            onSeek={onSeek}
          />
        ))}
      </ScrollArea>
    </div>
  );
}

export type { TierTimelineProps };
export { TierTimeline };
