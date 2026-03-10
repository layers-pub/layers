/**
 * Unit tests for DLQ admin REST handlers.
 *
 * @module
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  dlqAdminRoutes,
  deleteEntry,
  getEntry,
  getStats,
  listEntries,
  retryAll,
  retryEntry,
} from '@/api/handlers/rest/v1/admin/dlq.js';
import type {
  DLQEntryView,
  DLQListResponse,
  DLQStatsResponse,
} from '@/api/handlers/rest/v1/admin/dlq.js';

/**
 * Builds a mock PostgreSQL Pool with a stubbed `query` method.
 */
function createMockPool(): { query: ReturnType<typeof vi.fn> } {
  return {
    query: vi.fn(),
  };
}

type MockPool = ReturnType<typeof createMockPool>;

/**
 * Builds a DLQ row fixture as returned by PostgreSQL.
 */
function buildDlqRow(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'dlq-001',
    collection: 'pub.layers.expression.expression',
    rkey: 'abc123',
    did: 'did:plc:testuser1',
    error: { stage: 'zod', message: 'Invalid field' },
    raw_record: { text: 'test' },
    firehose_cursor: 42000n,
    created_at: new Date('2026-01-15T12:00:00Z'),
    ...overrides,
  };
}

describe('DLQ Admin Service Functions', () => {
  let pool: MockPool;

  beforeEach(() => {
    pool = createMockPool();
  });

  describe('listEntries', () => {
    it('returns paginated entries without cursor', async () => {
      const rows = [buildDlqRow(), buildDlqRow({ id: 'dlq-002', rkey: 'def456' })];
      pool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] }).mockResolvedValueOnce({ rows });

      const result = await listEntries(pool as never, 20);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.entries).toHaveLength(2);
        expect(result.value.total).toBe(5);
        expect(result.value.entries[0]?.id).toBe('dlq-001');
        expect(result.value.entries[0]?.createdAt).toBe('2026-01-15T12:00:00.000Z');
      }
    });

    it('returns paginated entries with cursor', async () => {
      const rows = [buildDlqRow({ id: 'dlq-003' })];
      pool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] }).mockResolvedValueOnce({ rows });

      const result = await listEntries(pool as never, 20, 'dlq-002');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.entries).toHaveLength(1);
        expect(result.value.entries[0]?.id).toBe('dlq-003');
      }

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id < $1'), [
        'dlq-002',
        20,
      ]);
    });

    it('returns null cursor when fewer entries than limit', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [buildDlqRow()] });

      const result = await listEntries(pool as never, 20);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.cursor).toBeNull();
      }
    });

    it('returns next cursor when entries equal limit', async () => {
      const rows = [buildDlqRow({ id: 'dlq-001' }), buildDlqRow({ id: 'dlq-002' })];
      pool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] }).mockResolvedValueOnce({ rows });

      const result = await listEntries(pool as never, 2);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.cursor).toBe('dlq-002');
      }
    });

    it('returns ValidationError for limit out of range', async () => {
      const result = await listEntries(pool as never, 0);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns DatabaseError on query failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await listEntries(pool as never, 20);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('getEntry', () => {
    it('returns the entry when found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [buildDlqRow()] });

      const result = await getEntry(pool as never, 'dlq-001');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('dlq-001');
        expect(result.value.collection).toBe('pub.layers.expression.expression');
        expect(result.value.did).toBe('did:plc:testuser1');
      }
    });

    it('returns NotFoundError when entry does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await getEntry(pool as never, 'nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
        expect(result.error.message).toContain('nonexistent');
      }
    });

    it('returns DatabaseError on query failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('Timeout'));

      const result = await getEntry(pool as never, 'dlq-001');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('deleteEntry', () => {
    it('deletes the entry and returns success', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await deleteEntry(pool as never, 'dlq-001');

      expect(result.ok).toBe(true);
      expect(pool.query).toHaveBeenCalledWith('DELETE FROM dlq_entries WHERE id = $1', ['dlq-001']);
    });

    it('returns NotFoundError when entry does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await deleteEntry(pool as never, 'nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('returns DatabaseError on query failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('Constraint violation'));

      const result = await deleteEntry(pool as never, 'dlq-001');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('retryEntry', () => {
    it('removes the entry and returns it for re-processing', async () => {
      pool.query.mockResolvedValueOnce({ rows: [buildDlqRow()] });

      const result = await retryEntry(pool as never, 'dlq-001');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('dlq-001');
        expect(result.value.rawRecord).toEqual({ text: 'test' });
      }
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dlq_entries WHERE id = $1 RETURNING'),
        ['dlq-001'],
      );
    });

    it('returns NotFoundError when entry does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await retryEntry(pool as never, 'nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('returns DatabaseError on query failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('Deadlock'));

      const result = await retryEntry(pool as never, 'dlq-001');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('retryAll', () => {
    it('retries all entries when no filters provided', async () => {
      const rows = [buildDlqRow(), buildDlqRow({ id: 'dlq-002' })];
      pool.query.mockResolvedValueOnce({ rows });

      const result = await retryAll(pool as never);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dlq_entries'),
        [],
      );
    });

    it('filters by collection when provided', async () => {
      pool.query.mockResolvedValueOnce({ rows: [buildDlqRow()] });

      const result = await retryAll(pool as never, {
        collection: 'pub.layers.expression.expression',
      });

      expect(result.ok).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE collection = $1'), [
        'pub.layers.expression.expression',
      ]);
    });

    it('filters by both collection and did', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await retryAll(pool as never, {
        collection: 'pub.layers.expression.expression',
        did: 'did:plc:testuser1',
      });

      expect(result.ok).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('collection = $1 AND did = $2'),
        ['pub.layers.expression.expression', 'did:plc:testuser1'],
      );
    });

    it('returns DatabaseError on query failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('Connection reset'));

      const result = await retryAll(pool as never);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('getStats', () => {
    it('returns aggregated statistics', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 15 }] })
        .mockResolvedValueOnce({
          rows: [
            { collection: 'pub.layers.expression.expression', count: 10 },
            { collection: 'pub.layers.annotation.annotationLayer', count: 5 },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { stage: 'zod', count: 12 },
            { stage: 'lexicon', count: 3 },
          ],
        });

      const result = await getStats(pool as never);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.total).toBe(15);
        const exprKey = 'pub.layers.expression.expression';
        const annoKey = 'pub.layers.annotation.annotationLayer';
        expect(result.value.byCollection[exprKey]).toBe(10);
        expect(result.value.byCollection[annoKey]).toBe(5);
        expect(result.value.byErrorStage.zod).toBe(12);
        expect(result.value.byErrorStage.lexicon).toBe(3);
      }
    });

    it('handles empty DLQ', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getStats(pool as never);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.total).toBe(0);
        expect(Object.keys(result.value.byCollection)).toHaveLength(0);
        expect(Object.keys(result.value.byErrorStage)).toHaveLength(0);
      }
    });

    it('returns DatabaseError on query failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('Disk full'));

      const result = await getStats(pool as never);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DATABASE_ERROR');
      }
    });
  });
});

describe('DLQ Admin Routes (HTTP)', () => {
  let app: Hono;
  let pool: MockPool;

  beforeEach(() => {
    app = new Hono();
    pool = createMockPool();
    dlqAdminRoutes(app, pool as never);
  });

  describe('GET /admin/v1/dlq', () => {
    it('returns 200 with entries', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [buildDlqRow()] });

      const res = await app.request('/admin/v1/dlq');

      expect(res.status).toBe(200);
      const body = (await res.json()) as DLQListResponse;
      expect(body.entries).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it('returns 400 for invalid limit', async () => {
      const res = await app.request('/admin/v1/dlq?limit=abc');

      expect(res.status).toBe(400);
    });

    it('passes cursor query parameter', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 5 }] })
        .mockResolvedValueOnce({ rows: [buildDlqRow({ id: 'dlq-003' })] });

      const res = await app.request('/admin/v1/dlq?cursor=dlq-002&limit=1');

      expect(res.status).toBe(200);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id < $1'), [
        'dlq-002',
        1,
      ]);
    });
  });

  describe('GET /admin/v1/dlq/stats', () => {
    it('returns 200 with statistics', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 3 }] })
        .mockResolvedValueOnce({
          rows: [{ collection: 'pub.layers.expression.expression', count: 3 }],
        })
        .mockResolvedValueOnce({ rows: [{ stage: 'zod', count: 3 }] });

      const res = await app.request('/admin/v1/dlq/stats');

      expect(res.status).toBe(200);
      const body = (await res.json()) as DLQStatsResponse;
      expect(body.total).toBe(3);
    });
  });

  describe('GET /admin/v1/dlq/:id', () => {
    it('returns 200 for existing entry', async () => {
      pool.query.mockResolvedValueOnce({ rows: [buildDlqRow()] });

      const res = await app.request('/admin/v1/dlq/dlq-001');

      expect(res.status).toBe(200);
      const body = (await res.json()) as DLQEntryView;
      expect(body.id).toBe('dlq-001');
    });

    it('returns 404 for missing entry', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await app.request('/admin/v1/dlq/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /admin/v1/dlq/:id/retry', () => {
    it('returns 200 with the retried entry', async () => {
      pool.query.mockResolvedValueOnce({ rows: [buildDlqRow()] });

      const res = await app.request('/admin/v1/dlq/dlq-001/retry', { method: 'POST' });

      expect(res.status).toBe(200);
      const body = (await res.json()) as DLQEntryView;
      expect(body.id).toBe('dlq-001');
    });

    it('returns 404 for missing entry', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await app.request('/admin/v1/dlq/nonexistent/retry', { method: 'POST' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /admin/v1/dlq/:id', () => {
    it('returns 200 with deleted confirmation', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      const res = await app.request('/admin/v1/dlq/dlq-001', { method: 'DELETE' });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { deleted: boolean };
      expect(body.deleted).toBe(true);
    });

    it('returns 404 for missing entry', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 });

      const res = await app.request('/admin/v1/dlq/nonexistent', { method: 'DELETE' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /admin/v1/dlq/retry-all', () => {
    it('returns 200 with retried entries', async () => {
      const rows = [buildDlqRow(), buildDlqRow({ id: 'dlq-002' })];
      pool.query.mockResolvedValueOnce({ rows });

      const res = await app.request('/admin/v1/dlq/retry-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as DLQEntryView[];
      expect(body).toHaveLength(2);
    });

    it('accepts collection filter in body', async () => {
      pool.query.mockResolvedValueOnce({ rows: [buildDlqRow()] });

      const res = await app.request('/admin/v1/dlq/retry-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: 'pub.layers.expression.expression' }),
      });

      expect(res.status).toBe(200);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE collection = $1'), [
        'pub.layers.expression.expression',
      ]);
    });

    it('works without a body (retries all)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await app.request('/admin/v1/dlq/retry-all', { method: 'POST' });

      expect(res.status).toBe(200);
    });
  });
});
