'use client';

/**
 * Badge component indicating the conversion quality of an import format.
 *
 * Displays a colored badge based on the optic kind returned by panproto:
 * - "iso" (lossless): green
 * - "lens" (lossy in one direction): yellow
 * - All others (prism, affine, traversal): gray (partial)
 *
 * @module
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type OpticKind = 'iso' | 'lens' | 'prism' | 'affine' | 'traversal';

interface OpticKindBadgeProps {
  /** The optic kind from panproto import metadata. */
  readonly opticKind: OpticKind | string;
}

const OPTIC_CONFIG: Record<string, { label: string; className: string; tooltip: string }> = {
  iso: {
    label: 'Lossless',
    className:
      'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400',
    tooltip: 'Lossless conversion: no data is lost during import or export.',
  },
  lens: {
    label: 'Lossy',
    className:
      'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
    tooltip: 'Lossy conversion: some data may be discarded during import.',
  },
};

const PARTIAL_CONFIG = {
  label: 'Partial',
  className:
    'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  tooltip: 'Partial conversion: only a subset of the format is supported.',
};

/**
 * Renders a small colored badge indicating conversion quality.
 *
 * Only renders when an opticKind value is provided.
 */
function OpticKindBadge({ opticKind }: OpticKindBadgeProps): React.JSX.Element {
  const config = OPTIC_CONFIG[opticKind] ?? PARTIAL_CONFIG;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              variant="outline"
              className={cn('cursor-default text-[10px] font-semibold', config.className)}
            />
          }
        >
          {config.label}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export type { OpticKindBadgeProps, OpticKind };
export { OpticKindBadge };
