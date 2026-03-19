/**
 * Renderer for external (margin.at) annotations in the Layers workspace.
 *
 * Displays margin.at annotations as highlighted spans with a distinctive
 * "external" badge, motivation label, and creator DID. Renders inline
 * alongside native Layers annotations.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { ExternalAnnotationView } from '@/lib/hooks/use-external-annotations';
import type { Token } from '../types';

/**
 * Props for the {@link ExternalAnnotationRenderer} component.
 */
interface ExternalAnnotationRendererProps {
  /** External annotations to render. */
  annotations: ExternalAnnotationView[];
  /** Raw expression text for character-offset highlighting. */
  text: string;
  /** Tokens from the segmentation record. */
  tokens: Token[];
}

/**
 * Maps motivation values to Tailwind color classes.
 */
const MOTIVATION_COLORS: Readonly<Record<string, string>> = {
  commenting: 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700',
  highlighting: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700',
  tagging: 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700',
  bookmarking: 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700',
  describing: 'bg-teal-100 border-teal-300 dark:bg-teal-900/30 dark:border-teal-700',
  classifying: 'bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700',
  questioning: 'bg-rose-100 border-rose-300 dark:bg-rose-900/30 dark:border-rose-700',
  replying: 'bg-indigo-100 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700',
};

/**
 * Truncates a DID for display, keeping the method and first 8 chars of the identifier.
 *
 * @example
 * ```typescript
 * truncateDid('did:plc:abc123defghijklmno');
 * // 'did:plc:abc123de...'
 * ```
 */
function truncateDid(did: string): string {
  if (did.length <= 20) return did;
  return `${did.slice(0, 20)}...`;
}

/**
 * Formats an ISO timestamp to a human-readable relative or absolute date.
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 48) return 'yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoString;
  }
}

/**
 * A single external annotation card displayed in the annotation panel.
 */
const ExternalAnnotationCard = React.memo(function ExternalAnnotationCard({
  annotation,
}: {
  annotation: ExternalAnnotationView;
}): React.JSX.Element {
  const colorClass =
    MOTIVATION_COLORS[annotation.motivation] ??
    'bg-slate-100 border-slate-300 dark:bg-slate-900/30 dark:border-slate-700';

  return (
    <div className={`rounded-md border p-3 text-sm ${colorClass}`}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
          {annotation.source}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {annotation.kind}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatTimestamp(annotation.createdAt)}
        </span>
      </div>

      {annotation.text ? <p className="mb-1.5 text-sm leading-relaxed">{annotation.text}</p> : null}

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Tooltip>
          <TooltipTrigger render={<span className="cursor-help font-mono" />}>
            {truncateDid(annotation.creatorDid)}
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-mono text-xs">{annotation.creatorDid}</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

/**
 * Renders a highlighted span in the expression text for anchored external annotations.
 */
const ExternalSpanHighlight = React.memo(function ExternalSpanHighlight({
  annotation,
  text,
}: {
  annotation: ExternalAnnotationView;
  text: string;
}): React.JSX.Element | null {
  const anchor = annotation.anchor;
  if (!anchor || anchor.byteStart < 0 || anchor.byteEnd > text.length) {
    return null;
  }

  // NOTE: text.slice with byte offsets works correctly only for ASCII text.
  // A future byte-to-char utility will be needed for multi-byte characters.
  const before = text.slice(0, anchor.byteStart);
  const selected = text.slice(anchor.byteStart, anchor.byteEnd);
  const after = text.slice(anchor.byteEnd);

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline" />}>
        {before ? <span>{before}</span> : null}
        <mark className="rounded-sm bg-amber-200/60 px-0.5 dark:bg-amber-800/40">{selected}</mark>
        {after ? <span>{after}</span> : null}
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div className="font-medium">{annotation.kind}</div>
          {annotation.text ? <div className="mt-0.5">{annotation.text}</div> : null}
          <div className="mt-0.5 font-mono text-muted-foreground">
            {truncateDid(annotation.creatorDid)}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

/**
 * Renders external (margin.at) annotations in the Layers workspace.
 *
 * Displays annotations in two forms:
 * 1. Inline highlights for annotations with resolved text anchors
 * 2. Card list for all annotations (including those without anchors)
 *
 * @example
 * ```tsx
 * <ExternalAnnotationRenderer
 *   annotations={externalAnnotations}
 *   text={expression.text}
 *   tokens={tokens}
 * />
 * ```
 */
const ExternalAnnotationRenderer = React.memo(function ExternalAnnotationRenderer({
  annotations,
  text,
}: ExternalAnnotationRendererProps): React.JSX.Element {
  if (annotations.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No external annotations found.
      </p>
    );
  }

  const anchored = annotations.filter(
    (a) => a.anchor && a.anchor.byteStart >= 0 && a.anchor.byteEnd <= text.length,
  );
  const hasAnchored = anchored.length > 0;

  return (
    <div className="space-y-4">
      {hasAnchored ? (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Highlighted regions
          </h4>
          <div className="space-y-2 text-sm leading-relaxed">
            {anchored.map((ann) => (
              <ExternalSpanHighlight key={ann.id} annotation={ann} text={text} />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          External annotations ({annotations.length})
        </h4>
        <div className="space-y-2">
          {annotations.map((ann) => (
            <ExternalAnnotationCard key={ann.id} annotation={ann} />
          ))}
        </div>
      </div>
    </div>
  );
});

export type { ExternalAnnotationRendererProps };
export { ExternalAnnotationRenderer, ExternalAnnotationCard, ExternalSpanHighlight };
