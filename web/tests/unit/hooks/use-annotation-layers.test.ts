/**
 * Unit tests for annotation layer TanStack Query hooks.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { createWrapper } from '@/tests/test-utils';
import {
  useAnnotationLayer,
  useAnnotationLayersByExpression,
} from '@/lib/hooks/use-annotation-layers';

vi.mock('@/lib/api/client', () => ({
  api: {
    GET: vi.fn(),
  },
}));

import { api } from '@/lib/api/client';

const mockApi = vi.mocked(api);

const FIXTURE_ANNOTATION_LAYER = {
  uri: 'at://did:plc:testuser1/pub.layers.annotation.annotationLayer/layer1',
  cid: 'bafytest456',
  expressionRef: 'at://did:plc:testuser1/pub.layers.expression.expression/abc123',
  kind: 'morphological',
  subkind: 'pos',
  annotations: [],
  createdAt: '2026-01-15T12:00:00Z',
};

const FIXTURE_ANNOTATION_LAYER_LIST = {
  records: [FIXTURE_ANNOTATION_LAYER],
  cursor: 'next-cursor',
};

describe('useAnnotationLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns annotation layer data for a valid URI', async () => {
    mockApi.GET.mockResolvedValueOnce({
      data: FIXTURE_ANNOTATION_LAYER,
      error: undefined,
      response: new Response(),
    } as never);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useAnnotationLayer(FIXTURE_ANNOTATION_LAYER.uri),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(FIXTURE_ANNOTATION_LAYER);
    expect(mockApi.GET).toHaveBeenCalledWith(
      '/xrpc/pub.layers.annotation.getAnnotationLayer',
      { params: { query: { uri: FIXTURE_ANNOTATION_LAYER.uri } } },
    );
  });

  it('handles API errors', async () => {
    mockApi.GET.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'Internal error' },
      response: new Response(),
    } as never);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useAnnotationLayer('at://did:plc:testuser1/pub.layers.annotation.annotationLayer/missing'),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useAnnotationLayersByExpression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns annotation layers for a specific expression', async () => {
    mockApi.GET.mockResolvedValueOnce({
      data: FIXTURE_ANNOTATION_LAYER_LIST,
      error: undefined,
      response: new Response(),
    } as never);

    const expressionUri = 'at://did:plc:testuser1/pub.layers.expression.expression/abc123';
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useAnnotationLayersByExpression(expressionUri),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(FIXTURE_ANNOTATION_LAYER_LIST);
    expect(mockApi.GET).toHaveBeenCalledWith(
      '/xrpc/pub.layers.annotation.listAnnotationLayers',
      { params: { query: { expression: expressionUri } } },
    );
  });
});
