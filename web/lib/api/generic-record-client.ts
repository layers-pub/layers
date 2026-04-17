/**
 * Generic record fetcher driven by the panproto-generated registry.
 *
 * Bypasses openapi-fetch's literal-path typing so one helper can call any
 * of the 26 list/get endpoints by their generated NSID paths. Filter params
 * are defined by each endpoint's lexicon and flow through here unchanged.
 */

import { getBaseUrl } from '@/lib/api/client';
import { APIError } from '@/lib/errors';
import { getRecordKindBySlug } from '@/lib/generated/record-registry';

export interface GenericRecord {
  uri: string;
  cid: string;
  indexedAt: string;
  [field: string]: unknown;
}

export interface GenericListResponse {
  records: readonly GenericRecord[];
  cursor?: string;
}

async function xrpcGet<T>(nsid: string, query: Record<string, unknown>): Promise<T> {
  const base = getBaseUrl();
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const url = `${base}/xrpc/${nsid}${params.size ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.text();
      detail = body ? `: ${body.slice(0, 200)}` : '';
    } catch {
      /* ignore */
    }
    throw new APIError(`XRPC ${nsid} failed: ${res.status}${detail}`, res.status, `/xrpc/${nsid}`);
  }
  return (await res.json()) as T;
}

export async function listRecordsForKind(
  slug: string,
  params: Record<string, unknown> = {},
): Promise<GenericListResponse> {
  const kind = getRecordKindBySlug(slug);
  if (!kind?.listEndpoint) {
    throw new APIError(`No list endpoint for kind: ${slug}`, 404, `/xrpc/${slug}`);
  }
  return xrpcGet<GenericListResponse>(kind.listEndpoint, params);
}

export async function getRecordForKind(slug: string, uri: string): Promise<GenericRecord> {
  const kind = getRecordKindBySlug(slug);
  if (!kind?.getEndpoint) {
    throw new APIError(`No get endpoint for kind: ${slug}`, 404, `/xrpc/${slug}`);
  }
  return xrpcGet<GenericRecord>(kind.getEndpoint, { uri });
}
