/**
 * Visual indicator for annotation confidence scores.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ConfidenceIndicatorProps {
  /** Confidence score on a 0-1000 scale. */
  confidence: number;
  /** Additional CSS classes. */
  className?: string;
}

/**
 * Maps a 0-1000 confidence score to an opacity value.
 *
 * Minimum opacity is 0.3 for readability; maximum is 1.0.
 */
function confidenceToOpacity(confidence: number): number {
  const clamped = Math.max(0, Math.min(1000, confidence));
  return 0.3 + (clamped / 1000) * 0.7;
}

/**
 * Formats a 0-1000 confidence score as a percentage string.
 */
function confidenceToPercent(confidence: number): string {
  const clamped = Math.max(0, Math.min(1000, confidence));
  return `${(clamped / 10).toFixed(1)}%`;
}

/**
 * Small bar indicator showing annotation confidence.
 *
 * Renders as a 24px wide horizontal bar whose fill is proportional to
 * confidence. Shows the exact percentage on hover via tooltip.
 */
const ConfidenceIndicator = React.memo(function ConfidenceIndicator({
  confidence,
  className,
}: ConfidenceIndicatorProps): React.JSX.Element {
  const percent = confidenceToPercent(confidence);
  const fillWidth = Math.max(0, Math.min(100, confidence / 10));

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn('inline-flex h-2 w-6 rounded-full bg-muted overflow-hidden', className)}
            role="meter"
            aria-label={`Confidence: ${percent}`}
            aria-valuenow={confidence}
            aria-valuemin={0}
            aria-valuemax={1000}
          />
        }
      >
        <div
          className="h-full rounded-full bg-foreground/60 transition-all"
          style={{ width: `${fillWidth}%` }}
        />
      </TooltipTrigger>
      <TooltipContent>Confidence: {percent}</TooltipContent>
    </Tooltip>
  );
});

export type { ConfidenceIndicatorProps };
export { ConfidenceIndicator, confidenceToOpacity, confidenceToPercent };
