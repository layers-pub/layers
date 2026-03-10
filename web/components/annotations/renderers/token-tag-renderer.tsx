/**
 * Renderer for token-tag annotations (POS, NER, lemma, morph, gloss, etc.).
 *
 * Displays tokens in an interlinear layout with annotation labels beneath
 * each token. Handles subkinds: pos, ner, lemma, morph, gloss, phonetic,
 * language-id (all rendered identically, differing only in label content).
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { confidenceToOpacity } from '../primitives/confidence-indicator';
import type { AnnotationItem, AnnotationLayerData, Token } from '../types';

interface TokenTagRendererProps {
  /** Annotation layer data with kind "token-tag". */
  layer: AnnotationLayerData;
  /** Tokens from the segmentation record. */
  tokens: Token[];
  /** oklch color string for this layer. */
  color: string;
}

/**
 * Builds a map from token index to annotation items for fast lookup.
 */
function buildTokenAnnotationMap(items: AnnotationItem[]): Map<number, AnnotationItem[]> {
  const map = new Map<number, AnnotationItem[]>();

  for (const item of items) {
    if (item.anchor?.tokenIndex != null) {
      const existing = map.get(item.anchor.tokenIndex);
      if (existing) {
        existing.push(item);
      } else {
        map.set(item.anchor.tokenIndex, [item]);
      }
    }

    if (item.anchor?.tokenIndices) {
      for (const idx of item.anchor.tokenIndices) {
        const existing = map.get(idx);
        if (existing) {
          existing.push(item);
        } else {
          map.set(idx, [item]);
        }
      }
    }
  }

  return map;
}

/**
 * Renders a single token with its annotation labels beneath.
 */
const TokenTagPair = React.memo(function TokenTagPair({
  token,
  annotations,
  color,
}: {
  token: Token;
  annotations: AnnotationItem[];
  color: string;
}): React.JSX.Element {
  const displayLabel = annotations.map((a) => a.value ?? a.label).join(', ');
  const confidence = annotations[0]?.confidence;
  const opacity = confidence != null ? confidenceToOpacity(confidence) : 1;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="annotation-tag"
            style={{
              borderColor: `color-mix(in oklch, ${color} 50%, transparent)`,
              opacity,
            }}
          />
        }
      >
        <span className="tag-token">{token.text}</span>
        <span className="tag-label" style={{ color: color }}>
          {displayLabel}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-0.5">
          {annotations.map((a) => (
            <div key={a.id} className="text-xs">
              <span className="font-medium">{a.label}</span>
              {a.value ? <span className="ml-1 text-muted-foreground">{a.value}</span> : null}
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
 * Interlinear token-tag display.
 *
 * Each token is shown with annotation labels in a small mono font beneath.
 * Tokens without annotations are shown without labels.
 */
const TokenTagRenderer = React.memo(function TokenTagRenderer({
  layer,
  tokens,
  color,
}: TokenTagRendererProps): React.JSX.Element {
  const annotationMap = React.useMemo(() => buildTokenAnnotationMap(layer.items), [layer.items]);

  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No tokens available for token-tag display.</p>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-end gap-1 py-1')}>
      {tokens.map((token) => {
        const annotations = annotationMap.get(token.index);
        if (!annotations || annotations.length === 0) {
          return (
            <span key={token.index} className="annotation-tag">
              <span className="tag-token">{token.text}</span>
              <span className="tag-label">&nbsp;</span>
            </span>
          );
        }
        return (
          <TokenTagPair key={token.index} token={token} annotations={annotations} color={color} />
        );
      })}
    </div>
  );
});

export type { TokenTagRendererProps };
export { TokenTagRenderer };
