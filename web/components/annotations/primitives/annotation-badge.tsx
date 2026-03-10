/**
 * Reusable badge for annotation labels with color and confidence support.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { confidenceToOpacity } from './confidence-indicator';

interface AnnotationBadgeProps {
  /** Annotation label text. */
  label: string;
  /** Optional subkind shown as smaller secondary text. */
  subkind?: string;
  /** oklch color string for the badge background. */
  color: string;
  /** Optional confidence score (0-1000) that affects opacity. */
  confidence?: number;
  /** Additional CSS classes. */
  className?: string;
}

/**
 * Colored badge displaying an annotation label.
 *
 * The background uses the provided oklch color at reduced opacity. When a
 * confidence score is provided, the overall badge opacity scales accordingly
 * (minimum 0.3 for readability).
 */
const AnnotationBadge = React.memo(function AnnotationBadge({
  label,
  subkind,
  color,
  confidence,
  className,
}: AnnotationBadgeProps): React.JSX.Element {
  const opacity = confidence != null ? confidenceToOpacity(confidence) : 1;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 border-transparent', className)}
      style={{
        backgroundColor: `color-mix(in oklch, ${color} 20%, transparent)`,
        borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
        opacity,
      }}
    >
      <span className="text-xs font-medium">{label}</span>
      {subkind ? <span className="text-[10px] text-muted-foreground">{subkind}</span> : null}
    </Badge>
  );
});

export type { AnnotationBadgeProps };
export { AnnotationBadge };
