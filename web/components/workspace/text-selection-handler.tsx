/**
 * Handles text selection in the expression panel for creating annotations.
 *
 * Converts browser Selection objects to character offsets (textSpan anchors)
 * or token indices (tokenRef/tokenRefSequence anchors). Supports discontiguous
 * span selection via Ctrl/Cmd+drag, following bead's multi-span pattern.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { Anchor, Token } from '../annotations/types';

// =============================================================================
// Types
// =============================================================================

/** Selection interaction mode. */
type SelectionMode = 'span' | 'token' | 'tokenSequence';

/** A single selected text range (character offsets). */
interface TextRange {
  start: number;
  end: number;
}

interface TextSelectionHandlerProps {
  /** Raw expression text. */
  text: string;
  /** Tokens from the current segmentation. */
  tokens: Token[];
  /** Called when the user confirms annotation creation from the selection. */
  onCreateAnnotation: (anchor: Anchor) => void;
  /** Selection interaction mode. */
  mode: SelectionMode;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Finds the character offset of a browser Range endpoint within a container.
 *
 * Walks the container's text nodes to compute an absolute character offset
 * from the start of the text content.
 */
function getCharacterOffset(container: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let charCount = 0;

  let current = walker.nextNode();
  while (current) {
    if (current === node) {
      return charCount + offset;
    }
    charCount += (current.textContent ?? '').length;
    current = walker.nextNode();
  }

  return charCount;
}

/**
 * Maps a character range to the token indices it covers.
 */
function rangeToTokenIndices(range: TextRange, tokens: Token[]): number[] {
  const indices: number[] = [];
  for (const token of tokens) {
    // Token overlaps the range if it starts before the range ends
    // and ends after the range starts
    if (token.byteStart < range.end && token.byteEnd > range.start) {
      indices.push(token.index);
    }
  }
  return indices;
}

/**
 * Builds the appropriate Anchor from the current selections and mode.
 */
function buildAnchor(
  ranges: TextRange[],
  selectedTokens: Set<number>,
  mode: SelectionMode,
  tokens: Token[],
): Anchor | null {
  if (mode === 'span') {
    if (ranges.length === 0) return null;
    // For a single contiguous span, use textSpan
    if (ranges.length === 1) {
      const range = ranges[0];
      if (!range) return null;
      return {
        type: 'textSpan',
        byteStart: range.start,
        byteEnd: range.end,
      };
    }
    // For discontiguous spans, convert all ranges to token indices
    const allIndices: number[] = [];
    for (const range of ranges) {
      const indices = rangeToTokenIndices(range, tokens);
      for (const idx of indices) {
        if (!allIndices.includes(idx)) {
          allIndices.push(idx);
        }
      }
    }
    allIndices.sort((a, b) => a - b);
    return {
      type: 'tokenRefSequence',
      tokenIndices: allIndices,
    };
  }

  if (mode === 'token') {
    const indices = Array.from(selectedTokens).sort((a, b) => a - b);
    if (indices.length === 0) return null;
    if (indices.length === 1) {
      return {
        type: 'tokenRef',
        tokenIndex: indices[0],
      };
    }
    return {
      type: 'tokenRefSequence',
      tokenIndices: indices,
    };
  }

  if (mode === 'tokenSequence') {
    const indices = Array.from(selectedTokens).sort((a, b) => a - b);
    if (indices.length === 0) return null;
    return {
      type: 'tokenRefSequence',
      tokenIndices: indices,
    };
  }

  return null;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Interactive text selection handler for annotation creation.
 *
 * In span mode, the user drags to select text ranges. Holding Ctrl/Cmd
 * adds additional non-adjacent ranges to the selection (discontiguous spans).
 *
 * In token mode, clicking a token selects it. Ctrl/Cmd+click adds tokens
 * to the selection.
 *
 * In tokenSequence mode, clicking tokens builds an ordered sequence.
 *
 * A floating popover appears near the selection with a "Create Annotation"
 * button that converts the selection to the appropriate Anchor type.
 */
function TextSelectionHandler({
  text,
  tokens,
  onCreateAnnotation,
  mode,
}: TextSelectionHandlerProps): React.JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selectedRanges, setSelectedRanges] = React.useState<TextRange[]>([]);
  const [selectedTokens, setSelectedTokens] = React.useState<Set<number>>(new Set());
  const [popoverPosition, setPopoverPosition] = React.useState<{ x: number; y: number } | null>(
    null,
  );

  // Clear selection when mode changes
  React.useEffect(() => {
    setSelectedRanges([]);
    setSelectedTokens(new Set());
    setPopoverPosition(null);
  }, [mode]);

  /**
   * Handles mouseup for span selection mode.
   */
  const handleMouseUp = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (mode !== 'span') return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !containerRef.current) return;

      const range = selection.getRangeAt(0);
      const container = containerRef.current;

      // Verify the selection is within our container
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
        return;
      }

      const start = getCharacterOffset(container, range.startContainer, range.startOffset);
      const end = getCharacterOffset(container, range.endContainer, range.endOffset);

      if (start === end) return;

      const newRange: TextRange = {
        start: Math.min(start, end),
        end: Math.max(start, end),
      };

      const isAdditive = e.ctrlKey || e.metaKey;

      if (isAdditive) {
        setSelectedRanges((prev) => [...prev, newRange]);
      } else {
        setSelectedRanges([newRange]);
      }

      // Position popover near the mouse
      setPopoverPosition({ x: e.clientX, y: e.clientY });

      // Clear browser selection to avoid visual confusion
      selection.removeAllRanges();
    },
    [mode],
  );

  /**
   * Handles touchend for span selection mode on mobile.
   */
  const handleTouchEnd = React.useCallback(() => {
    if (mode !== 'span') return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;

    const range = selection.getRangeAt(0);
    const container = containerRef.current;

    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
      return;
    }

    const start = getCharacterOffset(container, range.startContainer, range.startOffset);
    const end = getCharacterOffset(container, range.endContainer, range.endOffset);

    if (start === end) return;

    const newRange: TextRange = {
      start: Math.min(start, end),
      end: Math.max(start, end),
    };

    setSelectedRanges([newRange]);

    // Position popover at the end of the selection
    const rect = range.getBoundingClientRect();
    setPopoverPosition({ x: rect.right, y: rect.top });

    selection.removeAllRanges();
  }, [mode]);

  /**
   * Handles token click for token and tokenSequence modes.
   */
  const handleTokenClick = React.useCallback(
    (tokenIndex: number, e: React.MouseEvent) => {
      if (mode !== 'token' && mode !== 'tokenSequence') return;

      const isAdditive = e.ctrlKey || e.metaKey;

      setSelectedTokens((prev) => {
        const next = new Set(prev);
        if (isAdditive) {
          if (next.has(tokenIndex)) {
            next.delete(tokenIndex);
          } else {
            next.add(tokenIndex);
          }
        } else {
          if (next.has(tokenIndex) && next.size === 1) {
            next.clear();
          } else {
            next.clear();
            next.add(tokenIndex);
          }
        }
        return next;
      });

      setPopoverPosition({ x: e.clientX, y: e.clientY });
    },
    [mode],
  );

  /**
   * Creates the annotation from the current selection.
   */
  const handleCreate = React.useCallback(() => {
    const anchor = buildAnchor(selectedRanges, selectedTokens, mode, tokens);
    if (anchor) {
      onCreateAnnotation(anchor);
      setSelectedRanges([]);
      setSelectedTokens(new Set());
      setPopoverPosition(null);
    }
  }, [selectedRanges, selectedTokens, mode, tokens, onCreateAnnotation]);

  const hasSelection = selectedRanges.length > 0 || selectedTokens.size > 0;

  /**
   * Determines if a character position falls within any selected range.
   */
  const isCharSelected = React.useCallback(
    (charIndex: number): boolean => {
      return selectedRanges.some((range) => charIndex >= range.start && charIndex < range.end);
    },
    [selectedRanges],
  );

  // Render expression text with selection highlighting
  const renderText = React.useCallback((): React.ReactNode[] => {
    if (mode === 'span' || tokens.length === 0) {
      // Character-level rendering for span mode or when no tokens
      const elements: React.ReactNode[] = [];
      let i = 0;
      while (i < text.length) {
        const selected = isCharSelected(i);
        // Find the end of this run (same selection state)
        let j = i + 1;
        while (j < text.length && isCharSelected(j) === selected) {
          j++;
        }
        elements.push(
          <span key={`char-${i}`} className={cn(selected && 'bg-primary/20 rounded-sm')}>
            {text.slice(i, j)}
          </span>,
        );
        i = j;
      }
      return elements;
    }

    // Token-level rendering for token and tokenSequence modes
    const elements: React.ReactNode[] = [];
    let lastEnd = 0;

    for (const token of tokens) {
      // NOTE: text.slice with byte offsets works correctly only for ASCII text.
      // A future byte-to-char utility will be needed for multi-byte characters.
      if (token.byteStart > lastEnd) {
        elements.push(
          <span key={`gap-${lastEnd}`} className="whitespace-pre-wrap">
            {text.slice(lastEnd, token.byteStart)}
          </span>,
        );
      }

      const isSelected = selectedTokens.has(token.index);

      elements.push(
        <span
          key={`token-${token.index}`}
          role="button"
          tabIndex={0}
          className={cn(
            'cursor-pointer rounded-sm border-b border-border/50 px-px transition-colors',
            'hover:bg-muted',
            isSelected && 'bg-primary/20 border-b-primary ring-1 ring-primary/40',
          )}
          onClick={(e) => handleTokenClick(token.index, e)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTokenClick(token.index, e as unknown as React.MouseEvent);
            }
          }}
        >
          {token.text}
        </span>,
      );

      lastEnd = token.byteEnd;
    }

    if (lastEnd < text.length) {
      elements.push(
        <span key={`trail-${lastEnd}`} className="whitespace-pre-wrap">
          {text.slice(lastEnd)}
        </span>,
      );
    }

    return elements;
  }, [text, tokens, mode, isCharSelected, selectedTokens, handleTokenClick]);

  return (
    <div className="relative">
      {/* Selectable text area */}
      <div
        ref={containerRef}
        className={cn(
          'whitespace-pre-wrap leading-relaxed text-sm select-text',
          mode === 'span' && 'cursor-text',
        )}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
      >
        {renderText()}
      </div>

      {/* Floating popover near the selection */}
      {hasSelection && popoverPosition ? (
        <div
          className="fixed z-50 flex items-center gap-1 rounded-md border border-border bg-popover p-1 shadow-md"
          style={{
            left: popoverPosition.x,
            top: popoverPosition.y + 8,
          }}
        >
          <Button variant="default" size="sm" className="h-7 text-xs" onClick={handleCreate}>
            Create Annotation
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setSelectedRanges([]);
              setSelectedTokens(new Set());
              setPopoverPosition(null);
            }}
          >
            Clear
          </Button>
          {mode === 'span' && selectedRanges.length > 0 ? (
            <span className="text-[10px] text-muted-foreground px-1">
              {selectedRanges.length} range{selectedRanges.length !== 1 ? 's' : ''} (Ctrl+drag to
              add)
            </span>
          ) : null}
          {(mode === 'token' || mode === 'tokenSequence') && selectedTokens.size > 0 ? (
            <span className="text-[10px] text-muted-foreground px-1">
              {selectedTokens.size} token{selectedTokens.size !== 1 ? 's' : ''} (Ctrl+click to add)
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type { TextSelectionHandlerProps, SelectionMode, TextRange };
export { TextSelectionHandler };
