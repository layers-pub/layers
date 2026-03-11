'use client';

/**
 * Table displaying generated filling previews with selection for saving.
 *
 * Supports select-all, per-row selection, pagination for large result
 * sets, and constraint violation tooltips.
 *
 * @module
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// =============================================================================
// TYPES
// =============================================================================

/** A single generated filling preview before saving. */
interface FillingPreview {
  readonly slotFillings: Array<{
    slotName: string;
    entryRef?: string;
    literalValue?: string;
  }>;
  readonly renderedText: string;
  readonly strategy: string;
  readonly constraintViolations?: Array<{
    expression: string;
    satisfied: boolean;
  }>;
  /** Optional score from MLM generation. */
  readonly score?: number;
}

interface FillingResultsTableProps {
  readonly fillings: FillingPreview[];
  readonly onSave: (indices: number[]) => void;
  readonly isSaving: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZE = 50;

// =============================================================================
// STRATEGY BADGE COLORS
// =============================================================================

function strategyVariant(strategy: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (strategy) {
    case 'exhaustive':
      return 'default';
    case 'random':
    case 'stratified':
      return 'secondary';
    case 'csp':
    case 'mlm':
      return 'outline';
    case 'manual':
      return 'secondary';
    default:
      return 'secondary';
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

function FillingResultsTable({
  fillings,
  onSave,
  isSaving,
}: FillingResultsTableProps): React.JSX.Element {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(fillings.length / PAGE_SIZE);
  const pagedFillings = useMemo(
    () => fillings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [fillings, page],
  );

  // The actual indices in the full array for the current page
  const pageOffset = page * PAGE_SIZE;

  function handleToggleSelect(globalIndex: number): void {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(globalIndex)) {
        next.delete(globalIndex);
      } else {
        next.add(globalIndex);
      }
      return next;
    });
  }

  function handleToggleAll(): void {
    const pageIndices = pagedFillings.map((_, i) => pageOffset + i);
    const allPageSelected = pageIndices.every((idx) => selectedIndices.has(idx));

    if (allPageSelected) {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        for (const idx of pageIndices) {
          next.delete(idx);
        }
        return next;
      });
    } else {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        for (const idx of pageIndices) {
          next.add(idx);
        }
        return next;
      });
    }
  }

  function handleSaveSelected(): void {
    onSave(Array.from(selectedIndices));
  }

  const pageIndices = pagedFillings.map((_, i) => pageOffset + i);
  const allPageSelected =
    pagedFillings.length > 0 && pageIndices.every((idx) => selectedIndices.has(idx));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {fillings.length} filling{fillings.length !== 1 ? 's' : ''} generated
          {selectedIndices.size > 0 ? ` (${selectedIndices.size} selected)` : ''}
        </p>
        <Button
          size="sm"
          disabled={selectedIndices.size === 0 || isSaving}
          onClick={handleSaveSelected}
        >
          {isSaving ? 'Saving...' : `Save Selected (${selectedIndices.size})`}
        </Button>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allPageSelected}
                onCheckedChange={handleToggleAll}
                aria-label="Select all on this page"
              />
            </TableHead>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Rendered Text</TableHead>
            <TableHead className="w-28">Strategy</TableHead>
            <TableHead className="w-28">Constraints</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedFillings.map((filling, localIndex) => {
            const globalIndex = pageOffset + localIndex;
            const violations = filling.constraintViolations ?? [];
            const allSatisfied = violations.every((v) => v.satisfied);
            const violationCount = violations.filter((v) => !v.satisfied).length;

            return (
              <TableRow key={globalIndex}>
                <TableCell>
                  <Checkbox
                    checked={selectedIndices.has(globalIndex)}
                    onCheckedChange={() => handleToggleSelect(globalIndex)}
                    aria-label={`Select filling ${globalIndex + 1}`}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{globalIndex + 1}</TableCell>
                <TableCell className="max-w-md">
                  <span className="line-clamp-2 text-sm">{filling.renderedText}</span>
                  {filling.score !== undefined ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      score: {filling.score.toFixed(3)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant={strategyVariant(filling.strategy)}>{filling.strategy}</Badge>
                </TableCell>
                <TableCell>
                  {violations.length === 0 ? (
                    <span className="text-xs text-muted-foreground">n/a</span>
                  ) : allSatisfied ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle2 className="size-4 text-green-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>All {violations.length} constraints satisfied</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1">
                            <XCircle className="size-4 text-destructive" />
                            <span className="text-xs text-destructive">{violationCount}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1 text-xs">
                            {violations
                              .filter((v) => !v.satisfied)
                              .map((v, vi) => (
                                <p key={vi} className="text-destructive">
                                  Failed: {v.expression}
                                </p>
                              ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { FillingResultsTable };
export type { FillingResultsTableProps, FillingPreview };
