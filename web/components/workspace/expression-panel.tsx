/**
 * Left panel of the annotation workspace showing expression text.
 *
 * Displays the expression text with an optional segmentation overlay.
 * When segmentations exist, tokens are rendered as clickable spans.
 * For expressions with linked media (audio/video), renders a media
 * player with tier timeline instead of (or above) the text display.
 *
 * Supports multiple selection modes for annotation creation:
 * - view: single-click visual reference (default)
 * - token: click to toggle token selection
 * - span: click start and end tokens to select a contiguous span
 * - tokenSequence: click tokens to build an ordered sequence
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useSegmentationsByExpression } from '@/lib/hooks/use-segmentations';

import type { AnnotationLayerData, Token } from '../annotations/types';

import type { SelectionMode } from './annotation-workspace';
import { MediaExpressionView } from './media-expression-view';
import { TokenOverlay } from './token-overlay';

interface ExpressionPanelProps {
  /** AT-URI of the expression. */
  expressionUri: string;
  /** Raw expression text. */
  text: string;
  /** URL of linked media (audio or video), if present. */
  mediaUrl?: string;
  /** MIME type of the linked media. */
  mediaMimeType?: string;
  /** Tier annotation layers to display synced with media playback. */
  tierLayers?: AnnotationLayerData[];
  /** Token selection mode (default 'view'). */
  selectionMode?: SelectionMode;
  /** Externally controlled set of selected token indices. */
  selectedTokens?: ReadonlySet<number>;
  /** Callback when the token selection changes. */
  onSelectionChange?: (tokens: ReadonlySet<number>) => void;
}

/**
 * Label text for the current selection mode badge.
 */
function selectionModeLabel(mode: SelectionMode): string {
  switch (mode) {
    case 'token':
      return 'Token Select';
    case 'span':
      return 'Span Select';
    case 'tokenSequence':
      return 'Sequence Select';
    default:
      return '';
  }
}

/**
 * Left workspace panel displaying the expression text with segmentation overlay.
 *
 * If multiple segmentations exist, a dropdown allows switching between them.
 * When in a selection mode other than 'view', the token overlay enables
 * multi-token selection for annotation anchor creation.
 */
function ExpressionPanel({
  expressionUri,
  text,
  mediaUrl,
  mediaMimeType,
  tierLayers,
  selectionMode = 'view',
  selectedTokens,
  onSelectionChange,
}: ExpressionPanelProps): React.JSX.Element {
  const { data, isLoading } = useSegmentationsByExpression(expressionUri);

  const [selectedSegIndex, setSelectedSegIndex] = React.useState(0);
  // Local single-token selection for view mode (visual reference only)
  const [selectedTokenIndex, setSelectedTokenIndex] = React.useState<number | null>(null);

  const segmentations = data?.records ?? [];
  const hasMedia =
    mediaUrl != null &&
    (mediaMimeType?.startsWith('audio/') === true || mediaMimeType?.startsWith('video/') === true);

  // Build Token[] from the selected segmentation's first tokenization
  const tokens: Token[] = React.useMemo(() => {
    const segs = data?.records ?? [];
    const seg = segs[selectedSegIndex];
    if (!seg?.value.tokenizations?.length) return [];
    const firstTokenization = seg.value.tokenizations[0];
    if (!firstTokenization?.tokens) return [];
    return firstTokenization.tokens.map((t, i) => ({
      text: t.text ?? '',
      index: i,
      start: t.textSpan?.start ?? 0,
      end: t.textSpan?.ending ?? 0,
    }));
  }, [data?.records, selectedSegIndex]);

  const handleTokenClick = React.useCallback((index: number) => {
    setSelectedTokenIndex((prev) => (prev === index ? null : index));
  }, []);

  const isAnnotateMode = selectionMode !== 'view';

  return (
    <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Expression</CardTitle>
            {isAnnotateMode ? (
              <Badge variant="secondary" className="text-[10px]">
                {selectionModeLabel(selectionMode)}
              </Badge>
            ) : null}
          </div>
          {segmentations.length > 1 ? (
            <select
              className="text-xs border rounded px-2 py-1 bg-background"
              value={selectedSegIndex}
              onChange={(e) => {
                setSelectedSegIndex(Number(e.target.value));
                setSelectedTokenIndex(null);
              }}
            >
              {segmentations.map((seg, i) => (
                <option key={seg.uri} value={i}>
                  {`Segmentation ${i + 1}`}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          {hasMedia ? (
            <div className="flex flex-col gap-3">
              <MediaExpressionView
                mediaUrl={mediaUrl}
                mimeType={mediaMimeType}
                tierLayers={tierLayers ?? []}
              />
              {text ? (
                <>
                  <Separator />
                  {tokens.length > 0 ? (
                    <TokenOverlay
                      text={text}
                      tokens={tokens}
                      selectedTokenIndex={selectedTokenIndex}
                      onTokenClick={handleTokenClick}
                      selectionMode={selectionMode}
                      selectedTokens={selectedTokens}
                      onSelectionChange={onSelectionChange}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed text-sm">{text}</p>
                  )}
                </>
              ) : null}
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : tokens.length > 0 ? (
            <TokenOverlay
              text={text}
              tokens={tokens}
              selectedTokenIndex={selectedTokenIndex}
              onTokenClick={handleTokenClick}
              selectionMode={selectionMode}
              selectedTokens={selectedTokens}
              onSelectionChange={onSelectionChange}
            />
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed text-sm">{text}</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export type { ExpressionPanelProps };
export { ExpressionPanel };
