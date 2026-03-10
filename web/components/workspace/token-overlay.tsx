/**
 * Renders expression text as tokenized spans with visible boundaries.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { Token } from '../annotations/types';

interface TokenOverlayProps {
  /** Raw expression text. */
  text: string;
  /** Tokens from the selected segmentation. */
  tokens: Token[];
  /** Index of the currently selected token, or null. */
  selectedTokenIndex: number | null;
  /** Callback when a token is clicked. */
  onTokenClick: (index: number) => void;
}

/**
 * Renders text split into token spans with visible boundaries.
 *
 * Each token is a clickable span. Whitespace between tokens is rendered
 * as plain text. The selected token receives a primary color highlight.
 */
const TokenOverlay = React.memo(function TokenOverlay({
  text,
  tokens,
  selectedTokenIndex,
  onTokenClick,
}: TokenOverlayProps): React.JSX.Element {
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

    const isSelected = selectedTokenIndex === token.index;

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
                isSelected && 'bg-primary/15 border-b-primary',
              )}
              onClick={() => onTokenClick(token.index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTokenClick(token.index);
                }
              }}
            />
          }
        >
          {token.text}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Token {token.index}
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
