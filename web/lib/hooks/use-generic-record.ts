/**
 * TanStack Query hooks for the generic record browser/detail pages.
 *
 * One pair of hooks serves all 26 record kinds via the generated registry.
 */

import { useQuery } from '@tanstack/react-query';

import {
  getRecordForKind,
  listRecordsForKind,
  type GenericListResponse,
  type GenericRecord,
} from '@/lib/api/generic-record-client';

const DEFAULT_STALE_TIME = 60_000;

export function useRecordList(
  slug: string,
  params: Record<string, unknown> = {},
  enabled = true,
) {
  return useQuery<GenericListResponse>({
    queryKey: ['generic', slug, 'list', params],
    queryFn: () => listRecordsForKind(slug, params),
    enabled: Boolean(slug) && enabled,
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useRecord(slug: string, uri: string) {
  return useQuery<GenericRecord>({
    queryKey: ['generic', slug, 'detail', uri],
    queryFn: () => getRecordForKind(slug, uri),
    enabled: Boolean(slug && uri),
    staleTime: DEFAULT_STALE_TIME,
  });
}
