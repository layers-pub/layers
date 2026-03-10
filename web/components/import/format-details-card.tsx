'use client';

/**
 * Format-specific metadata display for the import wizard preview step.
 *
 * @module
 */

import { Clock, FileAudio2, GitBranch, Layers } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PreviewMetadata } from '@/lib/import-parsers';

interface FormatDetailsCardProps {
  metadata: PreviewMetadata;
  format: string;
}

/**
 * Formats a duration in seconds into a human-readable string.
 *
 * Returns "Xm Ys" for durations of 60 seconds or more, or "Xs" for shorter durations.
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds < 0.1) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Computes the indentation level for a tier in the hierarchy by walking
 * the parent chain.
 */
function getTierDepth(
  tierName: string,
  parentMap: Map<string, string>,
  visited: Set<string>,
): number {
  if (visited.has(tierName)) return 0;
  visited.add(tierName);
  const parent = parentMap.get(tierName);
  if (!parent) return 0;
  return 1 + getTierDepth(parent, parentMap, visited);
}

/**
 * Displays format-specific metadata (duration, tier count, media reference,
 * and tier hierarchy) extracted during file parsing.
 */
function FormatDetailsCard({ metadata, format }: FormatDetailsCardProps): React.JSX.Element | null {
  const hasDuration = metadata.duration != null && metadata.duration > 0;
  const hasTierCount = metadata.tierCount != null && metadata.tierCount > 0;
  const hasMedia = metadata.mediaUrl != null && metadata.mediaUrl.length > 0;
  const hasHierarchy = metadata.tierHierarchy != null && metadata.tierHierarchy.length > 0;

  if (!hasDuration && !hasTierCount && !hasMedia && !hasHierarchy) {
    return null;
  }

  // Build parent map for indentation
  const parentMap = new Map<string, string>();
  if (metadata.tierHierarchy) {
    for (const tier of metadata.tierHierarchy) {
      if (tier.parentTier) {
        parentMap.set(tier.name, tier.parentTier);
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Format Details ({format})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="flex flex-wrap gap-6 text-sm">
          {hasDuration && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Duration</span>
                <p className="font-medium">{formatDuration(metadata.duration!)}</p>
              </div>
            </div>
          )}
          {hasTierCount && (
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Tiers</span>
                <p className="font-medium">{metadata.tierCount}</p>
              </div>
            </div>
          )}
          {hasMedia && (
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <FileAudio2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Media</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="max-w-48 truncate font-medium">
                        {metadata.mediaUrl!.split('/').pop() ?? metadata.mediaUrl}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="break-all">{metadata.mediaUrl}</p>
                      {metadata.mediaMimeType && (
                        <p className="text-xs text-muted-foreground">{metadata.mediaMimeType}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
          )}
        </div>

        {/* Tier hierarchy */}
        {hasHierarchy && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Tier Hierarchy</span>
            </div>
            <ul className="space-y-1 text-sm">
              {metadata.tierHierarchy!.map((tier) => {
                const depth = getTierDepth(tier.name, parentMap, new Set<string>());
                return (
                  <li
                    key={tier.name}
                    className="flex items-center gap-2"
                    style={{ paddingLeft: `${depth * 16}px` }}
                  >
                    <span className="font-mono text-xs">{tier.name}</span>
                    {tier.linguisticType && (
                      <Badge variant="outline" className="text-[10px]">
                        {tier.linguisticType}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {tier.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({tier.annotationCount} ann.)
                    </span>
                    {tier.controlledVocabulary && (
                      <Badge variant="outline" className="text-[10px] border-dashed">
                        CV: {tier.controlledVocabulary}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { FormatDetailsCardProps };
export { FormatDetailsCard };
