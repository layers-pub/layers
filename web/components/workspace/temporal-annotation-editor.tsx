/**
 * Temporal span annotation editor for audio/video media.
 *
 * Integrates with the workspace MediaPlayer, allowing users to click and
 * drag on a timeline to select temporal regions, add labels, and create
 * tier-style annotations. Follows fovea's temporal annotation patterns.
 *
 * @module
 */

'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface TemporalAnnotationEditorProps {
  /** Total media duration in seconds. */
  duration: number;
  /** Current playback time in seconds. */
  currentTime: number;
  /** Called when the user creates a temporal annotation. */
  onCreateAnnotation: (startTime: number, endTime: number, label: string) => void;
  /** Called when the user seeks to a specific time. */
  onSeek?: (time: number) => void;
  /** Existing temporal regions to display as reference. */
  existingRegions?: TemporalRegion[];
  /** Tier name displayed in the header. */
  tierName?: string;
}

/** A temporal region with label metadata. */
interface TemporalRegion {
  /** Unique ID. */
  id: string;
  /** Start time in seconds. */
  startTime: number;
  /** End time in seconds. */
  endTime: number;
  /** Display label. */
  label: string;
  /** Optional value. */
  value?: string;
  /** Confidence score (0-1000). */
  confidence?: number;
  /** oklch color for display. */
  color?: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIMELINE_HEIGHT = 48;
const RULER_HEIGHT = 20;
const MAX_RULER_MARKS = 20;

// =============================================================================
// Helpers
// =============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

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

// =============================================================================
// Component
// =============================================================================

/**
 * Interactive temporal annotation editor.
 *
 * Displays a timeline synchronized with the media player. Users click and
 * drag to select a temporal region, then enter a label to create the
 * annotation. Existing regions are displayed as colored overlays.
 */
function TemporalAnnotationEditor({
  duration,
  currentTime,
  onCreateAnnotation,
  onSeek,
  existingRegions = [],
  tierName,
}: TemporalAnnotationEditorProps): React.JSX.Element {
  const timelineRef = React.useRef<HTMLDivElement>(null);

  // Drag state for region selection
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartTime, setDragStartTime] = React.useState<number | null>(null);
  const [dragEndTime, setDragEndTime] = React.useState<number | null>(null);

  // Form state for the selected region
  const [showForm, setShowForm] = React.useState(false);
  const [labelInput, setLabelInput] = React.useState('');
  const [valueInput, setValueInput] = React.useState('');
  const [confidenceInput, setConfidenceInput] = React.useState('');

  const labelInputRef = React.useRef<HTMLInputElement>(null);

  const rulerMarks = React.useMemo(() => computeRulerMarks(duration), [duration]);

  /**
   * Converts a mouse/touch X position to a time value.
   */
  const xToTime = React.useCallback(
    (clientX: number): number => {
      if (!timelineRef.current || duration <= 0) return 0;
      const rect = timelineRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration],
  );

  /**
   * Handles mouse down to start region selection.
   */
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // Left click only
      const time = xToTime(e.clientX);
      setIsDragging(true);
      setDragStartTime(time);
      setDragEndTime(time);
      setShowForm(false);
    },
    [xToTime],
  );

  /**
   * Handles mouse move during drag.
   */
  React.useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent): void {
      if (!timelineRef.current || duration <= 0) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setDragEndTime(ratio * duration);
    }

    function handleMouseUp(): void {
      setIsDragging(false);
      setShowForm(true);
      // Focus the label input after render
      requestAnimationFrame(() => labelInputRef.current?.focus());
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration]);

  /**
   * Computes the selected region bounds (normalized so start < end).
   */
  const selectedRegion = React.useMemo(() => {
    if (dragStartTime === null || dragEndTime === null) return null;
    const start = Math.min(dragStartTime, dragEndTime);
    const end = Math.max(dragStartTime, dragEndTime);
    // Require a minimum duration of 10ms
    if (end - start < 0.01) return null;
    return { start, end };
  }, [dragStartTime, dragEndTime]);

  /**
   * Creates the annotation and resets the form.
   */
  const handleCreate = React.useCallback(() => {
    if (!selectedRegion || !labelInput.trim()) return;
    onCreateAnnotation(selectedRegion.start, selectedRegion.end, labelInput.trim());
    setDragStartTime(null);
    setDragEndTime(null);
    setShowForm(false);
    setLabelInput('');
    setValueInput('');
    setConfidenceInput('');
  }, [selectedRegion, labelInput, onCreateAnnotation]);

  /**
   * Cancels the current selection.
   */
  const handleCancel = React.useCallback(() => {
    setDragStartTime(null);
    setDragEndTime(null);
    setShowForm(false);
    setLabelInput('');
    setValueInput('');
    setConfidenceInput('');
  }, []);

  /**
   * Handles clicking the timeline to seek (when not dragging a region).
   */
  const handleTimelineClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging || showForm) return;
      const time = xToTime(e.clientX);
      onSeek?.(time);
    },
    [isDragging, showForm, xToTime, onSeek],
  );

  const cursorPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {tierName ?? 'Temporal Annotation'}
        </span>
        {selectedRegion ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatTime(selectedRegion.start)} - {formatTime(selectedRegion.end)} (
            {(selectedRegion.end - selectedRegion.start).toFixed(2)}s)
          </span>
        ) : null}
      </div>

      {/* Time ruler */}
      <div className="relative" style={{ height: RULER_HEIGHT }}>
        {rulerMarks.map((t) => {
          const leftPercent = duration > 0 ? (t / duration) * 100 : 0;
          return (
            <React.Fragment key={t}>
              <span
                className="absolute bottom-0 -translate-x-1/2 text-[9px] tabular-nums text-muted-foreground"
                style={{ left: `${leftPercent}%` }}
              >
                {formatTime(t)}
              </span>
              <div
                className="absolute bottom-0 w-px h-1.5 bg-border"
                style={{ left: `${leftPercent}%` }}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* Timeline */}
      <div
        ref={timelineRef}
        className={cn(
          'relative rounded-md border border-border bg-muted/30',
          isDragging ? 'cursor-col-resize' : 'cursor-crosshair',
        )}
        style={{ height: TIMELINE_HEIGHT }}
        onMouseDown={handleMouseDown}
        onClick={handleTimelineClick}
        role="slider"
        tabIndex={0}
        aria-label="Temporal annotation timeline"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
      >
        {/* Existing regions */}
        {existingRegions.map((region) => {
          if (duration <= 0) return null;
          const leftPercent = (region.startTime / duration) * 100;
          const widthPercent = ((region.endTime - region.startTime) / duration) * 100;
          const regionColor = region.color ?? 'oklch(0.6 0.15 260)';

          return (
            <Tooltip key={region.id}>
              <TooltipTrigger
                render={
                  <div
                    className="absolute top-0.5 bottom-0.5 flex items-center justify-center overflow-hidden rounded-sm px-1 text-[10px] font-medium"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 0.3)}%`,
                      backgroundColor: `color-mix(in oklch, ${regionColor} 25%, transparent)`,
                      borderLeft: `2px solid ${regionColor}`,
                    }}
                  />
                }
              >
                <span className="truncate">{region.label}</span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{region.label}</span>
                  {region.value ? <span>{region.value}</span> : null}
                  <span className="text-muted-foreground">
                    {region.startTime.toFixed(2)}s - {region.endTime.toFixed(2)}s
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Selection overlay */}
        {selectedRegion && duration > 0 ? (
          <div
            className="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary/50 pointer-events-none"
            style={{
              left: `${(selectedRegion.start / duration) * 100}%`,
              width: `${((selectedRegion.end - selectedRegion.start) / duration) * 100}%`,
            }}
          />
        ) : null}

        {/* Playback cursor */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
          style={{ left: `${cursorPercent}%` }}
        />
      </div>

      {/* Annotation form (visible after selecting a region) */}
      {showForm && selectedRegion ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
          <Input
            ref={labelInputRef}
            type="text"
            placeholder="Label"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') handleCancel();
            }}
            className="w-28 h-7 text-xs"
          />
          <Input
            type="text"
            placeholder="Value (optional)"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            className="w-32 h-7 text-xs"
          />
          <Input
            type="number"
            placeholder="Confidence"
            value={confidenceInput}
            onChange={(e) => setConfidenceInput(e.target.value)}
            min={0}
            max={1000}
            className="w-24 h-7 text-xs"
          />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleCreate}
                  disabled={!labelInput.trim()}
                />
              }
            >
              <Plus className="size-3" />
              Add
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Create annotation (Enter)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={handleCancel} />
              }
            >
              <X className="size-3" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Cancel (Esc)
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
}

export type { TemporalAnnotationEditorProps, TemporalRegion };
export { TemporalAnnotationEditor };
