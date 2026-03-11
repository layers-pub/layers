'use client';

/**
 * Dropdown for selecting the active write target in the /design section.
 *
 * Displays the current target (user PDS or corpus PDS) as a small badge,
 * and opens a menu to switch targets or connect a new corpus PDS.
 *
 * @module
 */

import { useState } from 'react';
import { ChevronDown, Database, HardDrive, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { CorpusPdsConnector } from './corpus-pds-connector';
import { useProjectContext } from './project-context';

/**
 * Compact dropdown for switching the write target between the user's
 * PDS and any connected corpus PDS.
 *
 * Renders a badge showing the current target. Clicking opens a menu
 * with available options and a button to connect a new corpus PDS.
 */
function WriteTargetSelector(): React.JSX.Element {
  const { writeTarget, setWriteTarget } = useProjectContext();
  const [connectorOpen, setConnectorOpen] = useState(false);

  const isCorpus = writeTarget.kind === 'corpus';

  const label = isCorpus ? writeTarget.corpusHandle : 'My PDS';
  const variant = isCorpus ? ('default' as const) : ('secondary' as const);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-accent focus:outline-none">
          {isCorpus ? (
            <Database className="size-3 text-muted-foreground" />
          ) : (
            <HardDrive className="size-3 text-muted-foreground" />
          )}
          <span className="max-w-[120px] truncate">{label}</span>
          <Badge variant={variant} className="ml-0.5 px-1 py-0 text-[10px] leading-tight">
            {isCorpus ? 'corpus' : 'user'}
          </Badge>
          <ChevronDown className="size-3 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuLabel>Write Target</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* User PDS option (always available) */}
          <DropdownMenuItem onClick={() => setWriteTarget({ kind: 'user' })}>
            <HardDrive className="mr-1.5 size-3.5" />
            My PDS
            {!isCorpus ? (
              <Badge variant="outline" className="ml-auto px-1 py-0 text-[10px]">
                active
              </Badge>
            ) : null}
          </DropdownMenuItem>

          {/* Connected corpus option (only when a corpus is connected) */}
          {isCorpus ? (
            <DropdownMenuItem
              onClick={() => {
                // Already active; no-op but keeps the selection clear
              }}
            >
              <Database className="mr-1.5 size-3.5" />
              <span className="max-w-[140px] truncate">{writeTarget.corpusHandle}</span>
              <Badge variant="outline" className="ml-auto px-1 py-0 text-[10px]">
                active
              </Badge>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          {/* Connect corpus PDS action */}
          <DropdownMenuItem onClick={() => setConnectorOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Connect Corpus PDS...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CorpusPdsConnector open={connectorOpen} onOpenChange={setConnectorOpen} />
    </>
  );
}

export { WriteTargetSelector };
