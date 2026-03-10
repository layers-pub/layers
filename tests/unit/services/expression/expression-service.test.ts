/**
 * Unit tests for ExpressionService.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExpressionService } from '@/services/expression/expression-service.js';
import { RedisKeys, RedisTTL } from '@/storage/redis/structures.js';
import { NotFoundError, ValidationError } from '@/types/errors.js';
import type { ExpressionRecord, ExpressionRow, ExpressionView } from '@/types/expression.js';
import { Ok } from '@/types/result.js';
import type { ExpressionsRepository } from '@/storage/postgresql/expressions-repository.js';
import {
  createMockLogger,
  createMockRedis,
  createMockRepository,
} from '../../../helpers/record-type-test-helpers.js';

/**
 * Builds a valid ExpressionRow fixture with optional overrides.
 */
function buildExpressionRow(overrides?: Partial<ExpressionRow>): ExpressionRow {
  return {
    uri: 'at://did:plc:testuser1/pub.layers.expression.expression/abc123',
    did: 'did:plc:testuser1',
    rkey: 'abc123',
    text: 'The cat sat on the mat.',
    kind: 'sentence',
    language: 'en',
    source_url: null,
    source_ref: null,
    eprint_ref: null,
    parent_ref: null,
    indexed_at: new Date('2026-01-15T12:00:00Z'),
    record: {
      id: 'expr-001',
      text: 'The cat sat on the mat.',
      kind: 'sentence',
      language: 'en',
      createdAt: '2026-01-15T12:00:00Z',
    },
    ...overrides,
  };
}

/**
 * Builds a valid ExpressionRecord fixture.
 */
function buildExpressionRecord(overrides?: Partial<ExpressionRecord>): ExpressionRecord {
  return {
    id: 'expr-001',
    text: 'The cat sat on the mat.',
    kind: 'sentence',
    language: 'en',
    createdAt: '2026-01-15T12:00:00Z',
    ...overrides,
  };
}

describe('ExpressionService', () => {
  let service: ExpressionService;
  let repository: ReturnType<typeof createMockRepository>;
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    repository = createMockRepository({
      searchExpressions: vi.fn(),
    });
    redis = createMockRedis();
    const logger = createMockLogger();

    service = new ExpressionService({
      repository: repository as unknown as ExpressionsRepository,
      redis: redis as never,
      logger,
    });
  });

  describe('getByUri', () => {
    const testUri = 'at://did:plc:testuser1/pub.layers.expression.expression/abc123';

    it('returns cached result from Redis when available', async () => {
      const cachedView: ExpressionView = {
        uri: testUri,
        did: 'did:plc:testuser1',
        rkey: 'abc123',
        text: 'The cat sat on the mat.',
        kind: 'sentence',
        language: 'en',
        sourceUrl: null,
        sourceRef: null,
        eprintRef: null,
        parentRef: null,
        indexedAt: '2026-01-15T12:00:00.000Z',
        record: buildExpressionRecord(),
      };

      redis.get.mockResolvedValueOnce(JSON.stringify(cachedView));

      const result = await service.getByUri(testUri);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(cachedView);
      }
      expect(redis.get).toHaveBeenCalledWith(RedisKeys.RECORD_CACHE(testUri));
      expect(repository.getByUri).not.toHaveBeenCalled();
    });

    it('fetches from repository and caches on miss', async () => {
      const row = buildExpressionRow();
      redis.get.mockResolvedValueOnce(null);
      repository.getByUri.mockResolvedValueOnce(Ok(row));
      redis.setex.mockResolvedValueOnce('OK');

      const result = await service.getByUri(testUri);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.uri).toBe(testUri);
        expect(result.value.text).toBe('The cat sat on the mat.');
        expect(result.value.indexedAt).toBe('2026-01-15T12:00:00.000Z');
      }
      expect(repository.getByUri).toHaveBeenCalledWith(testUri);
      expect(redis.setex).toHaveBeenCalledWith(
        RedisKeys.RECORD_CACHE(testUri),
        RedisTTL.RECORD_CACHE,
        expect.any(String),
      );
    });

    it('returns NotFoundError for missing records', async () => {
      redis.get.mockResolvedValueOnce(null);
      repository.getByUri.mockResolvedValueOnce(Ok(null));

      const result = await service.getByUri(testUri);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toContain('Expression');
      }
    });

    it('works when Redis read fails (falls back to PG)', async () => {
      const row = buildExpressionRow();
      redis.get.mockRejectedValueOnce(new Error('Connection refused'));
      repository.getByUri.mockResolvedValueOnce(Ok(row));
      redis.setex.mockResolvedValueOnce('OK');

      const result = await service.getByUri(testUri);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.uri).toBe(testUri);
      }
      expect(repository.getByUri).toHaveBeenCalledWith(testUri);
    });
  });

  describe('indexRecord', () => {
    it('validates valid records and delegates to repository', async () => {
      const record = buildExpressionRecord();
      repository.indexRecord.mockResolvedValueOnce(Ok(undefined));

      const result = await service.indexRecord('did:plc:testuser1', 'abc123', record);

      expect(result.ok).toBe(true);
      expect(repository.indexRecord).toHaveBeenCalledWith(
        'did:plc:testuser1',
        'abc123',
        expect.objectContaining({ id: 'expr-001', createdAt: '2026-01-15T12:00:00Z' }),
      );
    });

    it('returns ValidationError for invalid records (missing required fields)', async () => {
      const invalidRecord = { text: 'no id or createdAt' };

      const result = await service.indexRecord('did:plc:testuser1', 'abc123', invalidRecord);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Invalid expression record');
      }
      expect(repository.indexRecord).not.toHaveBeenCalled();
    });
  });

  describe('deleteRecord', () => {
    it('deletes from repository and invalidates Redis cache', async () => {
      const testUri = 'at://did:plc:testuser1/pub.layers.expression.expression/abc123';
      repository.deleteRecord.mockResolvedValueOnce(Ok(undefined));
      redis.del.mockResolvedValueOnce(1);

      const result = await service.deleteRecord(testUri);

      expect(result.ok).toBe(true);
      expect(repository.deleteRecord).toHaveBeenCalledWith(testUri);
      expect(redis.del).toHaveBeenCalledWith(RedisKeys.RECORD_CACHE(testUri));
    });
  });

  describe('listByRepo', () => {
    it('delegates to repository and transforms results', async () => {
      const rows = [
        buildExpressionRow(),
        buildExpressionRow({
          rkey: 'def456',
          uri: 'at://did:plc:testuser1/pub.layers.expression.expression/def456',
        }),
      ];
      repository.listByDid.mockResolvedValueOnce(Ok({ rows, cursor: 'next-cursor-token' }));

      const result = await service.listByRepo('did:plc:testuser1', 20);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.records).toHaveLength(2);
        expect(result.value.records[0]?.sourceUrl).toBeNull();
        expect(result.value.cursor).toBe('next-cursor-token');
      }
      expect(repository.listByDid).toHaveBeenCalledWith('did:plc:testuser1', 20, undefined);
    });
  });

  describe('searchExpressions', () => {
    it('delegates to repository and transforms results', async () => {
      const rows = [buildExpressionRow()];
      repository.searchExpressions!.mockResolvedValueOnce(
        Ok({ rows, total: 1, cursor: undefined }),
      );

      const result = await service.searchExpressions('cat', { language: 'en' }, 20);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.records).toHaveLength(1);
        expect(result.value.total).toBe(1);
        expect(result.value.records[0]?.text).toBe('The cat sat on the mat.');
      }
      expect(repository.searchExpressions).toHaveBeenCalledWith(
        'cat',
        { language: 'en' },
        20,
        undefined,
      );
    });
  });
});
