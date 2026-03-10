'use client';

/**
 * Client component for the search page with debounced input and result rendering.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useRef, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchResultCard } from '@/components/search/search-result-card';
import { useSearch } from '@/lib/hooks/use-search';
import { events } from '@/lib/observability/custom-events';

/** Debounce delay in milliseconds for search input. */
const DEBOUNCE_MS = 300;

/**
 * Renders the search input, results, and empty/loading states.
 */
function SearchContent({ searchParamsPromise }: { searchParamsPromise: Promise<{ q?: string }> }) {
  const searchParamsResolved = use(searchParamsPromise);
  const initialQuery = searchParamsResolved.q ?? '';

  const router = useRouter();
  const currentParams = useSearchParams();

  const [inputValue, setInputValue] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isFetching } = useSearch(debouncedQuery);

  // Track when the debounced query changes so we can compute search latency
  const searchStartRef = useRef<number>(0);

  useEffect(() => {
    if (debouncedQuery.length > 0) {
      searchStartRef.current = performance.now();
    }
  }, [debouncedQuery]);

  // Track search results when they arrive
  useEffect(() => {
    if (data && debouncedQuery.length > 0 && !isLoading) {
      const latency =
        searchStartRef.current > 0 ? Math.round(performance.now() - searchStartRef.current) : 0;
      events.search({
        query: debouncedQuery,
        resultCount: data.total,
        latency,
      });
    }
  }, [data, debouncedQuery, isLoading]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setDebouncedQuery(value);

        const params = new URLSearchParams(currentParams.toString());
        if (value) {
          params.set('q', value);
        } else {
          params.delete('q');
        }
        router.replace(`/search?${params.toString()}`, { scroll: false });
      }, DEBOUNCE_MS);
    },
    [currentParams, router],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Input
          type="search"
          placeholder="Search records..."
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="h-10 text-base"
          autoFocus
        />
        {isFetching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
      </div>

      {debouncedQuery.length > 0 && data && (
        <p className="text-sm text-muted-foreground">
          {data.total} {data.total === 1 ? 'result' : 'results'} for &ldquo;{debouncedQuery}&rdquo;
        </p>
      )}

      {isLoading && debouncedQuery.length > 0 && <SearchResultsSkeleton />}

      {!isLoading && debouncedQuery.length > 0 && data && data.results.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-lg font-medium">No results found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search terms or broadening your query.
          </p>
        </div>
      )}

      {!isLoading && data && data.results.length > 0 && (
        <div className="space-y-3">
          {data.results.map((result, index) => (
            <div
              key={result.uri}
              onClick={() => {
                events.searchClick({
                  query: debouncedQuery,
                  itemUri: result.uri,
                  position: index,
                });
              }}
            >
              <SearchResultCard
                uri={result.uri}
                collection={result.collection}
                highlights={result.highlights}
                score={result.score}
              />
            </div>
          ))}
        </div>
      )}

      {debouncedQuery.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Enter a search query to find records across Layers.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton placeholder for search results while loading.
 */
function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="mt-2 h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export { SearchContent, SearchResultsSkeleton };
