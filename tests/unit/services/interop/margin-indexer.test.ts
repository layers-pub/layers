/**
 * Unit tests for the MarginIndexer service.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILogger } from '../../../../src/types/interfaces/logger.interface.js';
import type { MarginAnnotationRecord } from '../../../../src/services/interop/margin-adapter.js';
import {
  MarginIndexer,
  MARGIN_CACHE_TTL_SECONDS,
} from '../../../../src/services/interop/margin-indexer.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockLogger(): ILogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

interface MockQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

function createMockPool(): {
  query: ReturnType<typeof vi.fn<(...args: unknown[]) => Promise<MockQueryResult>>>;
} {
  return {
    query: vi.fn<(...args: unknown[]) => Promise<MockQueryResult>>().mockResolvedValue({
      rows: [],
      rowCount: 0,
    }),
  };
}

function createMockRedis(): {
  get: ReturnType<typeof vi.fn>;
  setex: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  };
}

function createTestRecord(overrides?: Partial<MarginAnnotationRecord>): MarginAnnotationRecord {
  return {
    $type: 'at.margin.annotation',
    target: { source: 'https://example.com/article' },
    body: { type: 'TextualBody', value: 'This is a comment' },
    motivation: 'commenting',
    creator: 'did:plc:creator1',
    created: '2026-01-15T12:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MarginIndexer', () => {
  let indexer: MarginIndexer;
  let mockPool: ReturnType<typeof createMockPool>;
  let mockRedis: ReturnType<typeof createMockRedis>;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockPool = createMockPool();
    mockRedis = createMockRedis();
    mockLogger = createMockLogger();

    indexer = new MarginIndexer({
      pool: mockPool as unknown as import('pg').Pool,
      redis: mockRedis as unknown as import('ioredis').Redis,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // isMarginCollection
  // -----------------------------------------------------------------------

  describe('isMarginCollection', () => {
    it('returns true for at.margin.annotation', () => {
      expect(indexer.isMarginCollection('at.margin.annotation')).toBe(true);
    });

    it('returns false for unrelated collections', () => {
      expect(indexer.isMarginCollection('pub.layers.expression.expression')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // handleMarginRecord
  // -----------------------------------------------------------------------

  describe('handleMarginRecord', () => {
    it('stores a valid record in PostgreSQL', async () => {
      const record = createTestRecord();
      const result = await indexer.handleMarginRecord('did:plc:user1', 'rkey1', record);

      expect(result.ok).toBe(true);
      expect(mockPool.query).toHaveBeenCalledOnce();
      const callArgs = mockPool.query.mock.calls[0];
      expect(callArgs).toBeDefined();
      // The SQL should contain INSERT INTO margin_annotations
      expect(String(callArgs![0])).toContain('INSERT INTO margin_annotations');
    });

    it('invalidates Redis cache on successful insert', async () => {
      const record = createTestRecord();
      await indexer.handleMarginRecord('did:plc:user1', 'rkey1', record);

      expect(mockRedis.del).toHaveBeenCalledWith('margin:url:https://example.com/article');
    });

    it('performs upsert on duplicate record', async () => {
      const record = createTestRecord();
      await indexer.handleMarginRecord('did:plc:user1', 'rkey1', record);

      const sql = String(mockPool.query.mock.calls[0]![0]);
      expect(sql).toContain('ON CONFLICT');
      expect(sql).toContain('DO UPDATE');
    });

    it('returns error when database insertion fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('connection refused'));
      const record = createTestRecord();
      const result = await indexer.handleMarginRecord('did:plc:user1', 'rkey1', record);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to store');
      }
    });

    it('returns error when adapter rejects the record', async () => {
      // MarginAdapter rejects records with empty/missing target.source
      const badRecord = {
        $type: 'at.margin.annotation',
        target: {} as MarginAnnotationRecord['target'],
        body: { type: 'TextualBody', value: 'comment' },
        motivation: 'commenting' as const,
        creator: 'did:plc:user1',
        created: '2026-01-15T12:00:00Z',
      };

      const result = await indexer.handleMarginRecord('did:plc:user1', 'rkey1', badRecord);
      expect(result.ok).toBe(false);
    });

    it('does not fail when Redis cache invalidation fails', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Redis down'));
      const record = createTestRecord();
      const result = await indexer.handleMarginRecord('did:plc:user1', 'rkey1', record);

      // Should still succeed since cache invalidation is non-critical
      expect(result.ok).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // handleMarginDelete
  // -----------------------------------------------------------------------

  describe('handleMarginDelete', () => {
    it('deletes a record from PostgreSQL', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ target_url: 'https://example.com/article' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await indexer.handleMarginDelete('did:plc:user1', 'rkey1');
      expect(result.ok).toBe(true);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('invalidates cache for the deleted record URL', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ target_url: 'https://example.com/article' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await indexer.handleMarginDelete('did:plc:user1', 'rkey1');
      expect(mockRedis.del).toHaveBeenCalledWith('margin:url:https://example.com/article');
    });

    it('skips cache invalidation when record was not found', async () => {
      // No existing record found
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await indexer.handleMarginDelete('did:plc:user1', 'rkey-missing');
      expect(result.ok).toBe(true);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('returns error when database fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('timeout'));
      const result = await indexer.handleMarginDelete('did:plc:user1', 'rkey1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to delete');
      }
    });
  });

  // -----------------------------------------------------------------------
  // getAnnotationsForUrl
  // -----------------------------------------------------------------------

  describe('getAnnotationsForUrl', () => {
    const sampleDbRows = [
      {
        uri: 'at://did:plc:user1/at.margin.annotation/rkey1',
        did: 'did:plc:user1',
        rkey: 'rkey1',
        target_url: 'https://example.com/article',
        motivation: 'commenting',
        body_text: 'Great article',
        body_format: 'text/plain',
        creator_did: 'did:plc:user1',
        selector: null,
        created_at: new Date('2026-01-15T12:00:00Z'),
        record: { $type: 'at.margin.annotation' },
      },
    ];

    it('returns annotations from database', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: sampleDbRows, rowCount: 1 });

      const result = await indexer.getAnnotationsForUrl('https://example.com/article');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]!.id).toBe('margin.at:did:plc:user1:rkey1');
        expect(result.value[0]!.source).toBe('margin.at');
        expect(result.value[0]!.text).toBe('Great article');
        expect(result.value[0]!.kind).toBe('commenting');
      }
    });

    it('returns cached results from Redis when available', async () => {
      const cached = [{ id: 'margin.at:did:plc:user1:rkey1', source: 'margin.at', text: 'cached' }];
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await indexer.getAnnotationsForUrl('https://example.com/article');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]!.text).toBe('cached');
      }
      // Should not have queried the database
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('caches results in Redis after database query', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: sampleDbRows, rowCount: 1 });

      await indexer.getAnnotationsForUrl('https://example.com/article');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'margin:url:https://example.com/article',
        MARGIN_CACHE_TTL_SECONDS,
        expect.any(String),
      );
    });

    it('respects limit parameter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await indexer.getAnnotationsForUrl('https://example.com/article', 10);

      const queryArgs = mockPool.query.mock.calls[0];
      expect(queryArgs).toBeDefined();
      // The second parameter should be [url, limit]
      const params = queryArgs![1] as unknown[];
      expect(params[1]).toBe(10);
    });

    it('uses default limit of 50', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await indexer.getAnnotationsForUrl('https://example.com/article');

      const queryArgs = mockPool.query.mock.calls[0];
      const params = queryArgs![1] as unknown[];
      expect(params[1]).toBe(50);
    });

    it('returns empty array when no annotations exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await indexer.getAnnotationsForUrl('https://example.com/empty');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('returns error when database query fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('connection lost'));

      const result = await indexer.getAnnotationsForUrl('https://example.com/article');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to query');
      }
    });

    it('falls through to database when Redis read fails', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis unavailable'));
      mockPool.query.mockResolvedValueOnce({ rows: sampleDbRows, rowCount: 1 });

      const result = await indexer.getAnnotationsForUrl('https://example.com/article');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
      }
    });

    it('does not fail when Redis cache write fails', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: sampleDbRows, rowCount: 1 });
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis write failed'));

      const result = await indexer.getAnnotationsForUrl('https://example.com/article');
      expect(result.ok).toBe(true);
    });
  });
});
