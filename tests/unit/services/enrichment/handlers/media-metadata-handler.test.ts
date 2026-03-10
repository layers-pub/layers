/**
 * Unit tests for the media metadata enrichment handler.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  extractMediaMetadata,
  MediaMetadataHandler,
} from '@/services/enrichment/handlers/media-metadata-handler.js';
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
    type: 'mediaMetadata',
    uri: 'at://did:plc:test/pub.layers.media.media/abc123',
    collection: 'pub.layers.media.media',
    data: {
      mimeType: 'audio/wav',
      sizeBytes: 44100,
      width: 1920,
      height: 1080,
      durationMs: 5000,
      codec: 'pcm_s16le',
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

// -- extractMediaMetadata unit tests -----------------------------------------

describe('extractMediaMetadata', () => {
  it('extracts all known fields from valid data', () => {
    const result = extractMediaMetadata({
      mimeType: 'video/mp4',
      sizeBytes: 1024,
      width: 1920,
      height: 1080,
      durationMs: 60000,
      codec: 'h264',
    });

    expect(result).toEqual({
      mimeType: 'video/mp4',
      sizeBytes: 1024,
      width: 1920,
      height: 1080,
      durationMs: 60000,
      codec: 'h264',
    });
  });

  it('returns an empty object for undefined data', () => {
    const result = extractMediaMetadata(undefined);
    expect(result).toEqual({});
  });

  it('returns an empty object for an empty data record', () => {
    const result = extractMediaMetadata({});
    expect(result).toEqual({
      mimeType: undefined,
      sizeBytes: undefined,
      width: undefined,
      height: undefined,
      durationMs: undefined,
      codec: undefined,
    });
  });

  it('ignores fields with non-matching types', () => {
    const result = extractMediaMetadata({
      mimeType: 42,
      sizeBytes: 'not-a-number',
      width: true,
      height: null,
      durationMs: [],
      codec: { nested: true },
    });

    expect(result.mimeType).toBeUndefined();
    expect(result.sizeBytes).toBeUndefined();
    expect(result.width).toBeUndefined();
    expect(result.height).toBeUndefined();
    expect(result.durationMs).toBeUndefined();
    expect(result.codec).toBeUndefined();
  });

  it('extracts only the valid fields from mixed data', () => {
    const result = extractMediaMetadata({
      mimeType: 'image/png',
      sizeBytes: 'wrong',
      width: 800,
      height: null,
      extraField: 'ignored',
    });

    expect(result.mimeType).toBe('image/png');
    expect(result.sizeBytes).toBeUndefined();
    expect(result.width).toBe(800);
    expect(result.height).toBeUndefined();
  });
});

// -- MediaMetadataHandler unit tests -----------------------------------------

describe('MediaMetadataHandler', () => {
  let mockPool: MockPool;
  let handler: MediaMetadataHandler;

  beforeEach(() => {
    mockPool = createMockPool();
    handler = new MediaMetadataHandler({
      pgPool: mockPool as unknown as import('pg').Pool,
      logger: createMockLogger(),
    });
  });

  it('has type "mediaMetadata"', () => {
    expect(handler.type).toBe('mediaMetadata');
  });

  it('updates PG on success and returns Ok', async () => {
    const job = createTestJob();
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.type).toBe('mediaMetadata');
      expect(result.value.uri).toBe(job.uri);
      expect(result.value.success).toBe(true);
      expect(result.value.metadata).toEqual({ mimeType: 'audio/wav' });
    }

    expect(mockPool.query).toHaveBeenCalledOnce();
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE media_records'), [
      expect.any(String),
      job.uri,
    ]);
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

  it('handles missing data gracefully', async () => {
    const job = createTestJob({ data: {} });
    const result = await handler.handle(job);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.metadata).toEqual({ mimeType: 'unknown' });
    }
  });

  it('serializes extracted metadata as JSON in the PG query', async () => {
    const job = createTestJob({
      data: { mimeType: 'video/mp4', width: 640, height: 480 },
    });
    await handler.handle(job);

    const queryArgs = mockPool.query.mock.calls[0]?.[1] as unknown[];
    expect(queryArgs).toBeDefined();
    const serialized = JSON.parse(queryArgs[0] as string) as Record<string, unknown>;
    expect(serialized.mimeType).toBe('video/mp4');
    expect(serialized.width).toBe(640);
    expect(serialized.height).toBe(480);
  });
});
