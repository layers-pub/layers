/**
 * View-only timeline that syncs tier annotations with media playback.
 *
 * Renders ELAN-style horizontal rows for each tier layer, with a vertical
 * cursor tracking the current playback position. Clicking segments or
 * empty space triggers seeking. Supports zoom controls, tier hierarchy
 * display, selection highlighting, and a waveform placeholder.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { AnnotationItem, AnnotationLayerData } from '../annotations/types';

/**
 * A time range defined by start and end in seconds.
 */
interface TimeRange {
  start: number;
  end: number;
}

/**
 * Hierarchy metadata for a single tier.
 */
interface TierHierarchyInfo {
  /** Tier name (must match the layer label or subkind). */
  name: string;
  /** Name of the parent tier, if any. */
  parentTier?: string;
  /** Linguistic type label (e.g., "default-lt", "utterance"). */
  linguisticType?: string;
}

interface TierTimelineProps {
  /** Annotation layers to display (only layers with kind "tier" are rendered). */
  layers: AnnotationLayerData[];
  /** Current playback time in seconds. */
  currentTime: number;
  /** Total media duration in seconds. */
  duration: number;
  /** Called when the user clicks to seek to a specific time. */
  onSeek?: (time: number) => void;
  /** Tier hierarchy information for indentation and linguistic type badges. */
  tierHierarchy?: TierHierarchyInfo[];
  /** Time range to highlight across all tier rows. */
  selectionRange?: TimeRange;
  /** When true, show a placeholder waveform row at the top. */
  showWaveform?: boolean;
}

/**
 * Number of second markers to show in the time ruler at 1x zoom.
 */
const MAX_RULER_MARKS = 20;

/**
 * Minimum zoom level.
 */
const MIN_ZOOM = 1;

/**
 * Maximum zoom level.
 */
const MAX_ZOOM = 10;

/**
 * Zoom threshold above which milliseconds are shown in ruler labels.
 */
const MILLISECOND_ZOOM_THRESHOLD = 4;

/**
 * Formats seconds to "m:ss" or "m:ss.SSS" depending on whether
 * millisecond precision is requested.
 */
function formatRulerTime(seconds: number, showMs: boolean): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds - mins * 60);
  if (showMs) {
    const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Computes evenly spaced time marks for the ruler, scaling with zoom.
 */
function computeRulerMarks(duration: number, zoomLevel: number): number[] {
  if (duration <= 0) return [0];

  const effectiveMarks = MAX_RULER_MARKS * zoomLevel;
  const idealStep = duration / effectiveMarks;
  const niceSteps = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  const step = niceSteps.find((s) => s >= idealStep) ?? niceSteps[niceSteps.length - 1]!;

  const marks: number[] = [];
  for (let t = 0; t <= duration; t += step) {
    marks.push(t);
  }
  return marks;
}

/**
 * Computes minor tick positions between major ruler marks at higher zoom levels.
 * Returns empty array when zoom is below 2x.
 */
function computeMinorTicks(duration: number, majorMarks: number[], zoomLevel: number): number[] {
  if (zoomLevel < 2 || majorMarks.length < 2) return [];

  const majorStep = majorMarks[1]! - majorMarks[0]!;
  const minorCount = zoomLevel >= 6 ? 4 : 2;
  const minorStep = majorStep / (minorCount + 1);

  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += minorStep) {
    // Skip positions that coincide with major marks (within tolerance)
    const isMajor = majorMarks.some((m) => Math.abs(m - t) < majorStep * 0.01);
    if (!isMajor) {
      ticks.push(t);
    }
  }
  return ticks;
}

/**
 * Computes the nesting depth for a tier within the hierarchy.
 */
function computeTierDepth(tierName: string, hierarchyMap: Map<string, TierHierarchyInfo>): number {
  let depth = 0;
  let current = hierarchyMap.get(tierName);
  while (current?.parentTier) {
    depth += 1;
    current = hierarchyMap.get(current.parentTier);
    // Guard against circular references
    if (depth > 10) break;
  }
  return depth;
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
  indentLevel,
  linguisticType,
  selectionRange,
}: {
  layer: AnnotationLayerData;
  duration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
  indentLevel: number;
  linguisticType?: string;
  selectionRange?: TimeRange;
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

  const indentPx = indentLevel * 8;

  return (
    <div className="tier-row">
      <div
        className="tier-label flex items-center gap-1"
        style={{
          borderLeftColor: color,
          borderLeftWidth: 3,
          paddingLeft: `${4 + indentPx}px`,
        }}
      >
        {indentLevel > 0 && (
          <span
            className="inline-block border-l border-b border-muted-foreground/30"
            style={{ width: 6, height: 8, marginRight: 2, flexShrink: 0 }}
          />
        )}
        <span className="truncate">{layer.label ?? layer.subkind ?? 'Tier'}</span>
        {linguisticType ? (
          <Badge variant="outline" className="h-3.5 px-1 text-[8px] text-muted-foreground">
            {linguisticType}
          </Badge>
        ) : null}
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
        {/* Selection highlight band */}
        {selectionRange && duration > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-blue-500/15 pointer-events-none z-[5]"
            style={{
              left: `${(selectionRange.start / duration) * 100}%`,
              width: `${((selectionRange.end - selectionRange.start) / duration) * 100}%`,
            }}
          />
        )}

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
 * Placeholder waveform row displayed at the top of the timeline.
 */
function WaveformPlaceholder({
  duration,
  currentTime,
  selectionRange,
}: {
  duration: number;
  currentTime: number;
  selectionRange?: TimeRange;
}): React.JSX.Element {
  const cursorPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="tier-row">
      <div
        className="tier-label text-muted-foreground italic"
        style={{ borderLeftColor: 'oklch(0.5 0 0)', borderLeftWidth: 3 }}
      >
        Waveform
      </div>
      <div className="tier-content border border-dashed border-muted-foreground/30 flex items-center justify-center">
        {/* Selection highlight band */}
        {selectionRange && duration > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-blue-500/15 pointer-events-none z-[5]"
            style={{
              left: `${(selectionRange.start / duration) * 100}%`,
              width: `${((selectionRange.end - selectionRange.start) / duration) * 100}%`,
            }}
          />
        )}
        <span className="text-[10px] text-muted-foreground/60 select-none">
          Waveform visualization available with media player
        </span>
        {/* Playback cursor */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
          style={{ left: `${cursorPercent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * View-only tier timeline synchronized with media playback.
 *
 * Filters the provided layers to only display those with kind "tier",
 * rendering each as a horizontal row with proportionally positioned
 * annotation segments. A red cursor line tracks the current time.
 *
 * Supports horizontal zoom (1x to 10x), millisecond time formatting at
 * high zoom, tier hierarchy indentation, selection range highlighting,
 * and an optional waveform placeholder row.
 */
function TierTimeline({
  layers,
  currentTime,
  duration,
  onSeek,
  tierHierarchy,
  selectionRange,
  showWaveform,
}: TierTimelineProps): React.JSX.Element {
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const tierLayers = React.useMemo(() => layers.filter((l) => l.kind === 'tier'), [layers]);

  const showMs = zoomLevel >= MILLISECOND_ZOOM_THRESHOLD;
  const rulerMarks = React.useMemo(
    () => computeRulerMarks(duration, zoomLevel),
    [duration, zoomLevel],
  );
  const minorTicks = React.useMemo(
    () => computeMinorTicks(duration, rulerMarks, zoomLevel),
    [duration, rulerMarks, zoomLevel],
  );

  // Build hierarchy lookup map
  const hierarchyMap = React.useMemo(() => {
    if (!tierHierarchy) return new Map<string, TierHierarchyInfo>();
    const map = new Map<string, TierHierarchyInfo>();
    for (const info of tierHierarchy) {
      map.set(info.name, info);
    }
    return map;
  }, [tierHierarchy]);

  // Keyboard shortcuts for zoom (active when container is focused)
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      setZoomLevel((prev) => Math.min(MAX_ZOOM, prev + 0.5));
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      setZoomLevel((prev) => Math.max(MIN_ZOOM, prev - 0.5));
    }
  }, []);

  const handleZoomChange = React.useCallback((val: number | readonly number[]) => {
    const newZoom = Array.isArray(val) ? (val[0] ?? MIN_ZOOM) : val;
    setZoomLevel(newZoom);
  }, []);

  if (tierLayers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-2 py-4">No tier annotations to display.</p>
    );
  }

  const contentWidthPercent = zoomLevel * 100;

  return (
    <div
      className="flex flex-col focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      {/* Zoom controls header */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-border text-xs text-muted-foreground">
        <span className="flex-shrink-0">Zoom</span>
        <Slider
          className="w-28"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.5}
          value={[zoomLevel]}
          onValueChange={handleZoomChange}
        />
        <span className="tabular-nums flex-shrink-0 w-8 text-right">{zoomLevel}x</span>
      </div>

      {/* Horizontally scrollable timeline area */}
      <ScrollArea>
        <div style={{ width: `${contentWidthPercent}%`, minWidth: '100%' }}>
          {/* Time ruler */}
          <div className="flex items-end text-[10px] text-muted-foreground border-b border-border">
            <div className="w-32 flex-shrink-0" />
            <div className="relative flex-1 h-5">
              {/* Major marks */}
              {rulerMarks.map((t) => {
                const leftPercent = duration > 0 ? (t / duration) * 100 : 0;
                return (
                  <span
                    key={t}
                    className="absolute bottom-0 -translate-x-1/2 tabular-nums"
                    style={{ left: `${leftPercent}%` }}
                  >
                    {formatRulerTime(t, showMs)}
                  </span>
                );
              })}
              {/* Minor tick marks */}
              {minorTicks.map((t) => {
                const leftPercent = duration > 0 ? (t / duration) * 100 : 0;
                return (
                  <span
                    key={`minor-${t}`}
                    className="absolute bottom-0 w-px h-1.5 bg-muted-foreground/30"
                    style={{ left: `${leftPercent}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Waveform placeholder */}
          {showWaveform && (
            <WaveformPlaceholder
              duration={duration}
              currentTime={currentTime}
              selectionRange={selectionRange}
            />
          )}

          {/* Tier rows */}
          <ScrollArea className={cn(tierLayers.length > 8 && 'max-h-64')}>
            {tierLayers.map((layer) => {
              const tierName = layer.label ?? layer.subkind ?? 'Tier';
              const hierarchyInfo = hierarchyMap.get(tierName);
              const indentLevel = hierarchyInfo ? computeTierDepth(tierName, hierarchyMap) : 0;

              return (
                <TierRow
                  key={layer.uri}
                  layer={layer}
                  duration={duration}
                  currentTime={currentTime}
                  onSeek={onSeek}
                  indentLevel={indentLevel}
                  linguisticType={hierarchyInfo?.linguisticType}
                  selectionRange={selectionRange}
                />
              );
            })}
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export type { TierHierarchyInfo, TierTimelineProps, TimeRange };
export { TierTimeline };
