/**
 * Unit tests for expression TanStack Query hooks.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { createWrapper } from '@/tests/test-utils';
import { useExpression, useExpressions } from '@/lib/hooks/use-expressions';
import { expressionKeys } from '@/lib/hooks/keys';

vi.mock('@/lib/api/client', () => ({
  api: {
    GET: vi.fn(),
  },
}));

import { api } from '@/lib/api/client';

const mockApi = vi.mocked(api);

const FIXTURE_EXPRESSION = {
  uri: 'at://did:plc:testuser1/pub.layers.expression.expression/abc123',
  cid: 'bafytest123',
  text: 'The cat sat on the mat.',
  language: 'en',
  kind: 'sentence',
  createdAt: '2026-01-15T12:00:00Z',
};

const FIXTURE_EXPRESSION_LIST = {
  records: [FIXTURE_EXPRESSION],
  cursor: 'next-cursor',
};

describe('useExpression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns expression data for a valid URI', async () => {
    mockApi.GET.mockResolvedValueOnce({
      data: FIXTURE_EXPRESSION,
      error: undefined,
      response: new Response(),
    } as never);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useExpression(FIXTURE_EXPRESSION.uri), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(FIXTURE_EXPRESSION);
    expect(mockApi.GET).toHaveBeenCalledWith('/xrpc/pub.layers.expression.getExpression', {
      params: { query: { uri: FIXTURE_EXPRESSION.uri } },
    });
  });

  it('sets error when API fails', async () => {
    mockApi.GET.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'Not found' },
      response: new Response(),
    } as never);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useExpression('at://did:plc:testuser1/pub.layers.expression.expression/missing'),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useExpressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated list of expressions', async () => {
    mockApi.GET.mockResolvedValueOnce({
      data: FIXTURE_EXPRESSION_LIST,
      error: undefined,
      response: new Response(),
    } as never);

    const filters = { limit: 25 };
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useExpressions(filters), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(FIXTURE_EXPRESSION_LIST);
    expect(result.current.data?.records).toHaveLength(1);
    expect(result.current.data?.cursor).toBe('next-cursor');
  });

  it('uses correct query key based on filters', () => {
    const filters = { repo: 'did:plc:testuser1', limit: 10 };
    const key = expressionKeys.list(filters);

    expect(key).toEqual(['expressions', 'list', filters]);
  });
});
