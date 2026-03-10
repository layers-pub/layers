/**
 * Unit tests for segmentation TanStack Query hooks.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { createWrapper } from '@/tests/test-utils';
import { useSegmentation, useSegmentationsByExpression } from '@/lib/hooks/use-segmentations';

vi.mock('@/lib/api/client', () => ({
  api: {
    GET: vi.fn(),
  },
}));

import { api } from '@/lib/api/client';

const mockApi = vi.mocked(api);

const FIXTURE_SEGMENTATION = {
  uri: 'at://did:plc:testuser1/pub.layers.segmentation.segmentation/seg1',
  cid: 'bafytest789',
  expressionRef: 'at://did:plc:testuser1/pub.layers.expression.expression/abc123',
  segments: [
    { start: 0, end: 3, text: 'The' },
    { start: 4, end: 7, text: 'cat' },
  ],
  createdAt: '2026-01-15T12:00:00Z',
};

const FIXTURE_SEGMENTATION_LIST = {
  records: [FIXTURE_SEGMENTATION],
  cursor: null,
};

describe('useSegmentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns segmentation data for a valid URI', async () => {
    mockApi.GET.mockResolvedValueOnce({
      data: FIXTURE_SEGMENTATION,
      error: undefined,
      response: new Response(),
    } as never);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSegmentation(FIXTURE_SEGMENTATION.uri), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(FIXTURE_SEGMENTATION);
    expect(mockApi.GET).toHaveBeenCalledWith('/xrpc/pub.layers.segmentation.getSegmentation', {
      params: { query: { uri: FIXTURE_SEGMENTATION.uri } },
    });
  });

  it('handles API errors', async () => {
    mockApi.GET.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'Not found' },
      response: new Response(),
    } as never);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSegmentation('at://did:plc:testuser1/pub.layers.segmentation.segmentation/missing'),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useSegmentationsByExpression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns segmentations for a specific expression', async () => {
    mockApi.GET.mockResolvedValueOnce({
      data: FIXTURE_SEGMENTATION_LIST,
      error: undefined,
      response: new Response(),
    } as never);

    const expressionUri = 'at://did:plc:testuser1/pub.layers.expression.expression/abc123';
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSegmentationsByExpression(expressionUri), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(FIXTURE_SEGMENTATION_LIST);
    expect(mockApi.GET).toHaveBeenCalledWith('/xrpc/pub.layers.segmentation.listSegmentations', {
      params: { query: { expression: expressionUri } },
    });
  });
});
