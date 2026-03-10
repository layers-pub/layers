/**
 * Unit tests for the annotation statistics enrichment handler.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  AnnotationStatisticsHandler,
  computeLabelDistribution,
} from '@/services/enrichment/handlers/annotation-statistics-handler.js';
import type { EnrichmentJob } from '@/types/interfaces/enrichment.interface.js';
import { isErr, isOk } from '@/types/result.js';
import { createMockLogger } from '@tests/helpers/record-type-test-helpers.js';

// -- Mock factories ----------------------------------------------------------

interface MockPool {
  query: ReturnType<typeof vi.fn>;
}

function createMockPool(): MockPool {
  return { query: vi.fn().mockResolvedValue({ rowCount: 1 }) };
}

function createTestJob(overrides?: Partial<EnrichmentJob>): EnrichmentJob {
  return {
    type: 'annotationStatistics',
    uri: 'at://did:plc:test/pub.layers.annotation.annotationLayer/abc123',
    collection: 'pub.layers.annotation.annotationLayer',
    data: {
      annotationCount: 5,
      labels: ['NP', 'VP', 'NP', 'PP', 'NP'],
    },
    ...overrides,
  };
}

// -- Mock resilience policy to avoid real retry/circuit breaker logic ---------

vi.mock('@/utils/resilience.js', () => ({
  pgPolicy: {
    execute: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  },
}));

// -- computeLabelDistribution unit tests -------------------------------------

describe('computeLabelDistribution', () => {
  it('produces correct frequency counts', () => {
    const result = computeLabelDistribution(['NP', 'VP', 'NP', 'PP', 'NP']);
    expect(result).toEqual({ NP: 3, VP: 1, PP: 1 });
  });

  it('handles an empty array', () => {
    const result = computeLabelDistribution([]);
    expect(result).toEqual({});
  });

  it('handles a single element', () => {
    const result = computeLabelDistribution(['VERB']);
    expect(result).toEqual({ VERB: 1 });
  });

  it('counts all unique labels', () => {
    const result = computeLabelDistribution(['A', 'B', 'C', 'D']);
    expect(Object.keys(result)).toHaveLength(4);
    expect(result.A).toBe(1);
    expect(result.B).toBe(1);
    expect(result.C).toBe(1);
    expect(result.D).toBe(1);
  });
});

// -- AnnotationStatisticsHandler unit tests ----------------------------------

describe('AnnotationStatisticsHandler', () => {
  let mockPool: MockPool;
  let handler: AnnotationStatisticsHandler;

  beforeEach(() => {
    mockPool = createMockPool();
    handler = new AnnotationStatisticsHandler({
      pgPool: mockPool as unknown as import('pg').Pool,
      logger: createMockLogger(),
    });
  });

  it('has type "annotationStatistics"', () => {
    expect(handler.type).toBe('annotationStatistics');
  });

  it('stores stats in PG and returns Ok', async () => {
    const job = createTestJob();
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.type).toBe('annotationStatistics');
      expect(result.value.uri).toBe(job.uri);
      expect(result.value.success).toBe(true);
      expect(result.value.metadata).toEqual({
        totalAnnotations: 5,
        uniqueLabels: 3,
      });
    }

    expect(mockPool.query).toHaveBeenCalledOnce();
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE annotation_layers'),
      [expect.any(String), job.uri],
    );
  });

  it('returns Err when PG update fails', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('connection refused'));

    const job = createTestJob();
    const result = await handler.handle(job);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('DATABASE_ERROR');
      expect(result.error.message).toContain(job.uri);
    }
  });

  it('handles non-array labels gracefully', async () => {
    const job = createTestJob({ data: { labels: 'not-an-array' } });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({
        totalAnnotations: 0,
        uniqueLabels: 0,
      });
    }
  });

  it('handles missing labels key gracefully', async () => {
    const job = createTestJob({ data: {} });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({
        totalAnnotations: 0,
        uniqueLabels: 0,
      });
    }
  });

  it('filters non-string values from labels array', async () => {
    const job = createTestJob({
      data: { labels: ['NP', 42, null, 'VP', true] },
    });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({
        totalAnnotations: 2,
        uniqueLabels: 2,
      });
    }
  });

  it('uses provided annotationCount when available', async () => {
    const job = createTestJob({
      data: { annotationCount: 100, labels: ['NP', 'VP'] },
    });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({
        totalAnnotations: 100,
        uniqueLabels: 2,
      });
    }
  });

  it('falls back to labels.length when annotationCount is missing', async () => {
    const job = createTestJob({
      data: { labels: ['A', 'B', 'C'] },
    });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({
        totalAnnotations: 3,
        uniqueLabels: 3,
      });
    }
  });

  it('serializes stats correctly as JSON in the PG query', async () => {
    const job = createTestJob();
    await handler.handle(job);

    const queryArgs = mockPool.query.mock.calls[0]?.[1] as unknown[];
    expect(queryArgs).toBeDefined();
    const serialized = JSON.parse(queryArgs[0] as string) as Record<string, unknown>;
    expect(serialized.totalAnnotations).toBe(5);
    expect(serialized.uniqueLabels).toBe(3);
    expect(serialized.labelDistribution).toEqual({ NP: 3, VP: 1, PP: 1 });
  });
});
