'use client';

/**
 * Table displaying resource entries in a lexicon collection.
 *
 * Supports client-side sorting by column headers, search/filter, row
 * selection for bulk operations, and per-row edit/delete actions.
 *
 * @module
 */

import { useMemo, useState } from 'react';
import { ArrowUpDown, Pencil, Search, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// =============================================================================
// TYPES
// =============================================================================

interface EntryView {
  readonly uri: string;
  readonly membershipUri: string;
  readonly form: string;
  readonly lemma?: string;
  readonly language?: string;
  readonly features?: { entries?: Array<{ key: string; value: string }> };
}

type SortField = 'form' | 'lemma' | 'language';
type SortDirection = 'asc' | 'desc';

// =============================================================================
// PROPS
// =============================================================================

interface EntryTableProps {
  readonly entries: readonly EntryView[];
  readonly onSelect: (uri: string) => void;
  readonly selectedUri?: string;
  readonly onEdit: (uri: string) => void;
  readonly onDelete: (entry: EntryView) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getPosFromFeatures(features?: {
  entries?: Array<{ key: string; value: string }>;
}): string | undefined {
  if (!features?.entries) return undefined;
  const posEntry = features.entries.find(
    (f) => f.key === 'pos' || f.key === 'POS' || f.key === 'upos',
  );
  return posEntry?.value;
}

function compareStrings(a: string | undefined, b: string | undefined, dir: SortDirection): number {
  const aVal = a ?? '';
  const bVal = b ?? '';
  const result = aVal.localeCompare(bVal);
  return dir === 'asc' ? result : -result;
}

// =============================================================================
// COMPONENT
// =============================================================================

function EntryTable({
  entries,
  onSelect,
  selectedUri,
  onEdit,
  onDelete,
}: EntryTableProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('form');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());

  // Filter by search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.form.toLowerCase().includes(query) ||
        entry.lemma?.toLowerCase().includes(query) ||
        getPosFromFeatures(entry.features)?.toLowerCase().includes(query),
    );
  }, [entries, searchQuery]);

  // Sort by selected column
  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries];
    sorted.sort((a, b) => {
      switch (sortField) {
        case 'form':
          return compareStrings(a.form, b.form, sortDirection);
        case 'lemma':
          return compareStrings(a.lemma, b.lemma, sortDirection);
        case 'language':
          return compareStrings(a.language, b.language, sortDirection);
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredEntries, sortField, sortDirection]);

  function handleSort(field: SortField): void {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function handleToggleSelect(uri: string): void {
    setSelectedUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  }

  function handleToggleAll(): void {
    if (selectedUris.size === sortedEntries.length) {
      setSelectedUris(new Set());
    } else {
      setSelectedUris(new Set(sortedEntries.map((e) => e.uri)));
    }
  }

  const allSelected = sortedEntries.length > 0 && selectedUris.size === sortedEntries.length;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Bulk action bar */}
      {selectedUris.size > 0 ? (
        <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
          <span className="text-muted-foreground">{selectedUris.size} selected</span>
          <Button
            variant="destructive"
            size="xs"
            onClick={() => {
              const toDelete = sortedEntries.filter((e) => selectedUris.has(e.uri));
              for (const entry of toDelete) {
                onDelete(entry);
              }
              setSelectedUris(new Set());
            }}
          >
            <Trash2 className="mr-1 size-3" />
            Delete Selected
          </Button>
        </div>
      ) : null}

      {/* Empty state */}
      {sortedEntries.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {entries.length === 0
            ? 'No entries yet. Use the form to add entries.'
            : 'No entries match your filter.'}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleToggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleSort('form')}
                  className="-ml-2 font-medium"
                >
                  Form
                  <ArrowUpDown className="ml-1 size-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleSort('lemma')}
                  className="-ml-2 font-medium"
                >
                  Lemma
                  <ArrowUpDown className="ml-1 size-3" />
                </Button>
              </TableHead>
              <TableHead>POS</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleSort('language')}
                  className="-ml-2 font-medium"
                >
                  Language
                  <ArrowUpDown className="ml-1 size-3" />
                </Button>
              </TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.map((entry) => {
              const pos = getPosFromFeatures(entry.features);
              const isSelected = entry.uri === selectedUri;

              return (
                <TableRow
                  key={entry.uri}
                  data-state={isSelected ? 'selected' : undefined}
                  className="cursor-pointer"
                  onClick={() => onSelect(entry.uri)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedUris.has(entry.uri)}
                      onCheckedChange={() => handleToggleSelect(entry.uri)}
                      aria-label={`Select ${entry.form}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{entry.form}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.lemma || '\u2014'}</TableCell>
                  <TableCell>{pos ? <Badge variant="secondary">{pos}</Badge> : null}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.language || '\u2014'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onEdit(entry.uri)}
                        aria-label={`Edit ${entry.form}`}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onDelete(entry)}
                        aria-label={`Delete ${entry.form}`}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export { EntryTable };
export type { EntryTableProps, EntryView };
