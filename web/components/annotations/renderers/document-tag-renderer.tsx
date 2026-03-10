/**
 * Renderer for document-level tag annotations (sentiment, topic, genre, etc.).
 *
 * Displays annotations as colored badge chips in a horizontal wrap layout.
 * No anchor is needed because these apply to the entire document.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { AnnotationBadge } from '../primitives/annotation-badge';
import { ConfidenceIndicator } from '../primitives/confidence-indicator';
import type { AnnotationLayerData } from '../types';

interface DocumentTagRendererProps {
  /** Annotation layer data with kind "document-tag". */
  layer: AnnotationLayerData;
  /** oklch color string for this layer. */
  color: string;
}

/**
 * Badge/chip display for document-level annotations.
 *
 * Each annotation is shown as a badge with the label and optional confidence
 * indicator. Handles subkinds: sentiment, emotion, stance, topic, genre,
 * register, and others (all rendered identically).
 */
const DocumentTagRenderer = React.memo(function DocumentTagRenderer({
  layer,
  color,
}: DocumentTagRendererProps): React.JSX.Element {
  if (layer.items.length === 0) {
    return <p className="text-sm text-muted-foreground">No document-level tags in this layer.</p>;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2 py-1')}>
      {layer.items.map((item) => (
        <div key={item.id} className="inline-flex items-center gap-1">
          <AnnotationBadge
            label={item.value ?? item.label}
            subkind={layer.subkind}
            color={color}
            confidence={item.confidence}
          />
          {item.confidence != null ? <ConfidenceIndicator confidence={item.confidence} /> : null}
        </div>
      ))}
    </div>
  );
});

export type { DocumentTagRendererProps };
export { DocumentTagRenderer };
