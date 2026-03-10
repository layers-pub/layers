/**
 * TanStack Query hooks for changelog entries.
 *
 * @remarks
 * Changelog entries track record creation, update, and deletion events.
 * Uses a 30-second stale time since changelog data is append-only and
 * does not change frequently after initial write.
 *
 * Two endpoints are available:
 * - `listByCollection`: browse entries filtered by collection type
 * - `listEntries`: list entries for a specific subject record
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

import { changelogKeys } from './keys';

/** Stale time for changelog queries (30 seconds). */
const CHANGELOG_STALE_TIME = 30_000;

/**
 * A single changelog entry recording a record-level operation.
 */
type ChangelogEntry = components['schemas']['ChangelogGetEntryOutput'];

/**
 * Paginated response for changelog entry lists (by subject).
 */
type ChangelogListResponse = components['schemas']['ChangelogListEntriesOutput'];

/**
 * Paginated response for changelog entry lists (by collection).
 */
type ChangelogByCollectionResponse = components['schemas']['ChangelogListByCollectionOutput'];

/**
 * Filter parameters for collection-scoped changelog queries.
 */
interface ChangelogFilters {
  /** NSID of the collection to filter by. */
  collection: string;
  /** Pagination cursor. */
  cursor?: string;
  /** Maximum number of entries to return. */
  limit?: number;
  /** Index signature for compatibility with query key factories. */
  [key: string]: unknown;
}

/**
 * Fetches changelog entries filtered by collection type.
 */
async function fetchChangelogByCollection(
  filters: ChangelogFilters,
): Promise<ChangelogByCollectionResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.changelog.listByCollection', {
    params: { query: filters },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch changelog entries',
      undefined,
      '/xrpc/pub.layers.changelog.listByCollection',
    );
  }

  return data;
}

/**
 * Fetches changelog entries for a specific subject record.
 */
async function fetchChangelogBySubject(subjectUri: string): Promise<ChangelogListResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.changelog.listEntries', {
    params: { query: { subject: subjectUri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch changelog for subject: ${subjectUri}`,
      undefined,
      '/xrpc/pub.layers.changelog.listEntries',
    );
  }

  return data;
}

/**
 * Fetches paginated changelog entries filtered by collection type.
 *
 * @param filters - query parameters for filtering (collection, cursor, limit)
 * @returns query result containing changelog entries
 *
 * @example
 * ```tsx
 * function ActivityFeed() {
 *   const { data, isLoading } = useChangelog({
 *     collection: 'pub.layers.expression.expression',
 *     limit: 10,
 *   });
 *   if (isLoading) return <Spinner />;
 *   return (
 *     <ul>
 *       {data?.entries.map((entry) => (
 *         <li key={entry.uri}>{entry.value.summary}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
function useChangelog(filters: ChangelogFilters) {
  return useQuery({
    queryKey: changelogKeys.list(filters),
    queryFn: () => fetchChangelogByCollection(filters),
    staleTime: CHANGELOG_STALE_TIME,
  });
}

/**
 * Fetches changelog entries for a specific subject record.
 *
 * @param subjectUri - AT-URI of the record to get changelog for
 * @returns query result containing changelog entries for the subject
 */
function useChangelogBySubject(subjectUri: string) {
  return useQuery({
    queryKey: changelogKeys.detail(subjectUri),
    queryFn: () => fetchChangelogBySubject(subjectUri),
    enabled: Boolean(subjectUri),
    staleTime: CHANGELOG_STALE_TIME,
  });
}

export type { ChangelogEntry, ChangelogListResponse, ChangelogByCollectionResponse, ChangelogFilters };
export { useChangelog, useChangelogBySubject };
