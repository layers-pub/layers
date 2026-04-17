import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getRecordForKind,
  listRecordsForKind,
} from '@/lib/api/generic-record-client';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function mockJson(payload: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    }) as unknown as Response,
  );
}

describe('listRecordsForKind', () => {
  it('builds the correct XRPC URL for a persona list call', async () => {
    mockJson({ records: [], cursor: undefined });
    await listRecordsForKind('persona', { repo: 'did:plc:abc', limit: 50 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toMatch(/\/xrpc\/pub\.layers\.persona\.listPersonas/);
    expect(url).toContain('repo=did%3Aplc%3Aabc');
    expect(url).toContain('limit=50');
  });

  it('omits undefined, null, and empty-string params', async () => {
    mockJson({ records: [] });
    await listRecordsForKind('persona', { repo: 'did:plc:abc', language: '', domain: undefined });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain('language=');
    expect(url).not.toContain('domain=');
  });

  it('throws APIError with status + truncated body on non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('nope', { status: 500 }) as unknown as Response,
    );
    await expect(
      listRecordsForKind('persona', { repo: 'did:plc:abc' }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('500'),
    });
  });

  it('throws when the kind slug is unknown', async () => {
    await expect(listRecordsForKind('nope', {})).rejects.toThrow(/No list endpoint/);
  });
});

describe('getRecordForKind', () => {
  it('routes to the discovered get endpoint and passes uri', async () => {
    mockJson({
      uri: 'at://did:plc:abc/pub.layers.corpus.corpus/rk1',
      cid: 'bafyaa',
      indexedAt: '2026-04-17T00:00:00Z',
      name: 'UD',
    });
    const r = await getRecordForKind(
      'corpus',
      'at://did:plc:abc/pub.layers.corpus.corpus/rk1',
    );
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/xrpc/pub.layers.corpus.getCorpus');
    expect(r.uri).toBe('at://did:plc:abc/pub.layers.corpus.corpus/rk1');
  });
});
