/**
 * Renders expression text as tokenized spans with visible boundaries.
 *
 * Supports multiple selection modes for annotation creation:
 * - view: single-click to highlight one token (visual reference)
 * - token: click to toggle individual token selection; Ctrl/Cmd+click for multi-select
 * - span: click two tokens to select a contiguous range
 * - tokenSequence: click tokens to build an ordered sequence with numbering
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { Token } from '../annotations/types';

import type { SelectionMode } from './annotation-workspace';

interface TokenOverlayProps {
  /** Raw expression text. */
  text: string;
  /** Tokens from the selected segmentation. */
  tokens: Token[];
  /** Index of the currently selected token in view mode, or null. */
  selectedTokenIndex: number | null;
  /** Callback when a token is clicked in view mode. */
  onTokenClick: (index: number) => void;
  /** Token selection mode (default 'view'). */
  selectionMode?: SelectionMode;
  /** Externally controlled set of selected token indices. */
  selectedTokens?: ReadonlySet<number>;
  /** Callback when the token selection changes. */
  onSelectionChange?: (tokens: ReadonlySet<number>) => void;
}

/**
 * Computes the set of tokens in a contiguous span between two indices.
 */
function spanBetween(a: number, b: number): ReadonlySet<number> {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  const result = new Set<number>();
  for (let i = min; i <= max; i++) {
    result.add(i);
  }
  return result;
}

/**
 * Renders text split into token spans with visible boundaries.
 *
 * Each token is a clickable span. Whitespace between tokens is rendered
 * as plain text. In view mode, the selected token receives a primary color
 * highlight. In annotation selection modes, tokens receive selection styling
 * and support multi-select interactions.
 */
const TokenOverlay = React.memo(function TokenOverlay({
  text,
  tokens,
  selectedTokenIndex,
  onTokenClick,
  selectionMode = 'view',
  selectedTokens,
  onSelectionChange,
}: TokenOverlayProps): React.JSX.Element {
  // For span mode: track the first endpoint so we can complete the span on second click
  const [spanStart, setSpanStart] = React.useState<number | null>(null);

  // For tokenSequence mode: track the order of selection
  const [sequenceOrder, setSequenceOrder] = React.useState<number[]>([]);

  // Reset span/sequence state when selection mode changes
  React.useEffect(() => {
    setSpanStart(null);
    setSequenceOrder([]);
  }, [selectionMode]);

  const isAnnotateMode = selectionMode !== 'view';

  const emptySet = React.useMemo(() => new Set<number>(), []);
  const currentSelection = selectedTokens ?? emptySet;

  const handleAnnotateClick = React.useCallback(
    (index: number, e: React.MouseEvent | React.KeyboardEvent) => {
      if (!onSelectionChange) return;

      if (selectionMode === 'token') {
        const isMultiSelect = 'metaKey' in e && (e.metaKey || e.ctrlKey);
        if (isMultiSelect) {
          // Toggle the clicked token
          const next = new Set(currentSelection);
          if (next.has(index)) {
            next.delete(index);
          } else {
            next.add(index);
          }
          onSelectionChange(next);
        } else {
          // Single select: toggle or replace
          if (currentSelection.has(index) && currentSelection.size === 1) {
            onSelectionChange(new Set());
          } else {
            onSelectionChange(new Set([index]));
          }
        }
      } else if (selectionMode === 'span') {
        if (spanStart === null) {
          // First click: set the start
          setSpanStart(index);
          onSelectionChange(new Set([index]));
        } else {
          // Second click: complete the span
          onSelectionChange(spanBetween(spanStart, index));
          setSpanStart(null);
        }
      } else if (selectionMode === 'tokenSequence') {
        const next = new Set(currentSelection);
        if (next.has(index)) {
          // Remove from sequence
          next.delete(index);
          setSequenceOrder((prev) => prev.filter((i) => i !== index));
        } else {
          next.add(index);
          setSequenceOrder((prev) => [...prev, index]);
        }
        onSelectionChange(next);
      }
    },
    [selectionMode, onSelectionChange, currentSelection, spanStart],
  );

  if (tokens.length === 0) {
    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;
  }

  const elements: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const token of tokens) {
    // Render any gap between the previous token and this one
    if (token.start > lastEnd) {
      elements.push(
        <span key={`gap-${lastEnd}`} className="whitespace-pre-wrap">
          {text.slice(lastEnd, token.start)}
        </span>,
      );
    }

    const isViewSelected = !isAnnotateMode && selectedTokenIndex === token.index;
    const isAnnotateSelected = isAnnotateMode && currentSelection.has(token.index);
    const sequenceNumber =
      selectionMode === 'tokenSequence' ? sequenceOrder.indexOf(token.index) + 1 : 0;

    const tooltipLabel =
      selectionMode === 'tokenSequence' && sequenceNumber > 0
        ? `Token ${token.index} (#${sequenceNumber})`
        : `Token ${token.index}`;

    elements.push(
      <Tooltip key={`token-${token.index}`}>
        <TooltipTrigger
          render={
            <span
              role="button"
              tabIndex={0}
              className={cn(
                'cursor-pointer rounded-sm border-b border-border/50 px-px transition-colors',
                'hover:bg-muted',
                // View mode highlight
                isViewSelected && 'bg-primary/15 border-b-primary',
                // Annotate mode highlight
                isAnnotateSelected && 'bg-primary/20 ring-1 ring-primary/50',
                // Span start indicator
                selectionMode === 'span' && spanStart === token.index && 'ring-2 ring-primary',
              )}
              onClick={(e) => {
                if (isAnnotateMode) {
                  handleAnnotateClick(token.index, e);
                } else {
                  onTokenClick(token.index);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (isAnnotateMode) {
                    handleAnnotateClick(token.index, e);
                  } else {
                    onTokenClick(token.index);
                  }
                }
              }}
            />
          }
        >
          {selectionMode === 'tokenSequence' && sequenceNumber > 0 ? (
            <>
              <sup className="text-[9px] font-bold text-primary mr-px">{sequenceNumber}</sup>
              {token.text}
            </>
          ) : (
            token.text
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>,
    );

    lastEnd = token.end;
  }

  // Render any trailing text after the last token
  if (lastEnd < text.length) {
    elements.push(
      <span key={`trail-${lastEnd}`} className="whitespace-pre-wrap">
        {text.slice(lastEnd)}
      </span>,
    );
  }

  return <div className="whitespace-pre-wrap leading-relaxed text-sm">{elements}</div>;
});

export type { TokenOverlayProps };
export { TokenOverlay };
