'use client';

/**
 * Network resource browser for discovering and forking published
 * resource collections from the ATProto network.
 *
 * Searches for collections via the appview's search endpoint, displays
 * results as cards, and supports forking (copying a collection and its
 * entries to the user's PDS).
 *
 * @module
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  Globe,
  Languages,
  BookOpen,
  GitFork,
  Loader2,
  FolderOpen,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LanguagesMultiCombobox } from '@/components/ui/languages-multicombobox';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent, useAuth } from '@/lib/auth';
import { useNetworkCollections, useForkCollection } from '@/lib/hooks/use-design';

// =============================================================================
// DEBOUNCE HOOK
// =============================================================================

/**
 * Returns a debounced version of the provided value.
 *
 * @param value - the value to debounce
 * @param delayMs - debounce delay in milliseconds
 * @returns the debounced value
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const COLLECTION_KINDS = [
  { value: '', label: 'All kinds' },
  { value: 'lexicon', label: 'Lexicon' },
  { value: 'frame-inventory', label: 'Frame inventory' },
  { value: 'gazetteer', label: 'Gazetteer' },
  { value: 'paradigm', label: 'Paradigm' },
  { value: 'stop-list', label: 'Stop list' },
  { value: 'stimulus-pool', label: 'Stimulus pool' },
  { value: 'custom', label: 'Custom' },
] as const;

const DEBOUNCE_MS = 300;

// =============================================================================
// COLLECTION CARD
// =============================================================================

interface CollectionCardProps {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly languages?: readonly string[];
  readonly kind?: string;
  readonly did: string;
  readonly entryCount?: number;
  readonly isForkingThis: boolean;
  readonly canFork: boolean;
  readonly onFork: (uri: string) => void;
}

function CollectionCard({
  uri,
  name,
  description,
  languages,
  kind,
  did,
  entryCount,
  isForkingThis,
  canFork,
  onFork,
}: CollectionCardProps): React.JSX.Element {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 text-base font-semibold leading-tight">{name}</CardTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            {languages && languages.length > 0 ? (
              <Badge variant="outline">
                <Languages className="mr-1 size-3" />
                {languages.length === 1 ? languages[0] : `${languages.length} langs`}
              </Badge>
            ) : null}
            {kind ? <Badge variant="secondary">{kind}</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between">
        <div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description || 'No description'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Globe className="size-3" />
              <span className="min-w-0 max-w-[180px] truncate font-mono">{did}</span>
            </span>
            {entryCount != null ? (
              <span className="flex items-center gap-1">
                <BookOpen className="size-3" />
                {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={!canFork || isForkingThis}
            onClick={() => onFork(uri)}
            className="w-full"
          >
            {isForkingThis ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <GitFork className="mr-1.5 size-4" />
            )}
            {isForkingThis ? 'Forking...' : 'Fork'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// CARD SKELETON
// =============================================================================

function CollectionCardSkeleton(): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-14" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-2/3" />
        <Skeleton className="mt-3 h-3 w-1/2" />
        <Skeleton className="mt-4 h-8 w-full" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({ hasSearchTerm }: { readonly hasSearchTerm: boolean }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FolderOpen className="mb-4 size-12 text-muted-foreground/50" />
      <h3 className="text-lg font-semibold">
        {hasSearchTerm ? 'No collections found' : 'Search the network'}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasSearchTerm
          ? 'Try adjusting your search term or filters.'
          : 'Enter a search term to discover published resource collections from other users on the network.'}
      </p>
    </div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

function ErrorState({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8">
        <AlertCircle className="size-8 text-destructive" />
        <p className="text-center text-sm text-destructive">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// FORK PROGRESS
// =============================================================================

interface ForkProgressProps {
  readonly current: number;
  readonly total: number;
  readonly collectionName: string;
}

function ForkProgress({ current, total, collectionName }: ForkProgressProps): React.JSX.Element {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Forking &quot;{collectionName}&quot;</span>
          <span className="text-muted-foreground">
            {current} / {total} entries
          </span>
        </div>
        <Progress value={percentage} />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// NETWORK BROWSER
// =============================================================================

function NetworkBrowser(): React.JSX.Element {
  const { user } = useAuth();
  const agent = useAgent();

  const [searchTerm, setSearchTerm] = useState('');
  const [languagesFilter, setLanguagesFilter] = useState<readonly string[]>([]);
  const [kindFilter, setKindFilter] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = useState<string[]>([]);

  const debouncedSearch = useDebouncedValue(searchTerm, DEBOUNCE_MS);

  // Reset cursor when filters change.
  const lastFiltersRef = useRef({
    search: debouncedSearch,
    languages: languagesFilter,
    kind: kindFilter,
  });
  useEffect(() => {
    const prev = lastFiltersRef.current;
    const langsChanged =
      prev.languages.length !== languagesFilter.length ||
      prev.languages.some((l, i) => l !== languagesFilter[i]);
    if (prev.search !== debouncedSearch || langsChanged || prev.kind !== kindFilter) {
      setCursor(undefined);
      setPrevCursors([]);
      lastFiltersRef.current = {
        search: debouncedSearch,
        languages: languagesFilter,
        kind: kindFilter,
      };
    }
  }, [debouncedSearch, languagesFilter, kindFilter]);

  const { data, isLoading, isError, error, refetch } = useNetworkCollections({
    query: debouncedSearch,
    languages: languagesFilter.length > 0 ? Array.from(languagesFilter) : undefined,
    kind: kindFilter || undefined,
    cursor,
    limit: 12,
  });

  const forkMutation = useForkCollection();
  const [forkingUri, setForkingUri] = useState<string | null>(null);
  const [forkProgress, setForkProgress] = useState<{
    current: number;
    total: number;
    name: string;
  } | null>(null);

  const canFork = Boolean(agent && user);

  const handleFork = useCallback(
    async (collectionUri: string) => {
      if (!agent || !user) {
        toast.error('You must be signed in to fork a collection.');
        return;
      }

      const collection = data?.collections.find((c) => c.uri === collectionUri);
      const collectionName = collection?.name ?? 'Collection';

      setForkingUri(collectionUri);
      setForkProgress({ current: 0, total: 0, name: collectionName });

      try {
        await forkMutation.mutateAsync({
          agent,
          authToken: '',
          sourceCollectionUri: collectionUri,
          onProgress: (current: number, total: number) => {
            setForkProgress({ current, total, name: collectionName });
          },
        });

        toast.success(`Forked "${collectionName}" to your PDS.`);
      } catch {
        toast.error(`Failed to fork "${collectionName}". Please try again.`);
      } finally {
        setForkingUri(null);
        setForkProgress(null);
      }
    },
    [agent, user, data?.collections, forkMutation],
  );

  const handleNextPage = useCallback(() => {
    if (data?.cursor) {
      setPrevCursors((prev) => [...prev, cursor ?? '']);
      setCursor(data.cursor);
    }
  }, [data?.cursor, cursor]);

  const handlePrevPage = useCallback(() => {
    setPrevCursors((prev) => {
      const next = [...prev];
      const prevCursor = next.pop();
      setCursor(prevCursor || undefined);
      return next;
    });
  }, []);

  const hasSearchTerm = debouncedSearch.length >= 2;
  const collections = data?.collections ?? [];
  const hasNextPage = Boolean(data?.cursor);
  const hasPrevPage = prevCursors.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Network Resources"
        description="Browse and fork published resource collections from other users"
      />

      {/* Search and filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Kind" />
            </SelectTrigger>
            <SelectContent>
              {COLLECTION_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <LanguagesMultiCombobox
            value={languagesFilter}
            onChange={setLanguagesFilter}
            className="w-56"
          />
        </div>
      </div>

      {/* Fork progress indicator */}
      {forkProgress ? (
        <ForkProgress
          current={forkProgress.current}
          total={forkProgress.total}
          collectionName={forkProgress.name}
        />
      ) : null}

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <CollectionCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to search collections.'}
          onRetry={() => refetch()}
        />
      ) : !hasSearchTerm && collections.length === 0 ? (
        <EmptyState hasSearchTerm={false} />
      ) : collections.length === 0 ? (
        <EmptyState hasSearchTerm={true} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.uri}
                uri={collection.uri}
                name={collection.name}
                description={collection.description}
                languages={collection.languages}
                kind={collection.kind}
                did={collection.did}
                entryCount={collection.entryCount}
                isForkingThis={forkingUri === collection.uri}
                canFork={canFork}
                onFork={handleFork}
              />
            ))}
          </div>

          {/* Pagination */}
          {hasPrevPage || hasNextPage ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={!hasPrevPage} onClick={handlePrevPage}>
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!hasNextPage} onClick={handleNextPage}>
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export { NetworkBrowser };
