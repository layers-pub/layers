/**
 * DLQ admin REST handlers for inspecting and managing failed firehose events.
 *
 * All endpoints require admin authorization. The handlers query the
 * `dlq_entries` table in PostgreSQL and return Result types for
 * consistent error handling.
 *
 * @module
 */

import type { Context } from 'hono';
import type { Hono } from 'hono';
import type { Pool } from 'pg';

import { DatabaseError, NotFoundError, ValidationError } from '../../../../../types/errors.js';
import { type Result, Ok, Err } from '../../../../../types/result.js';

/**
 * Shape of a DLQ entry as returned by the admin API.
 */
interface DLQEntryView {
  readonly id: string;
  readonly collection: string;
  readonly rkey: string;
  readonly did: string;
  readonly error: unknown;
  readonly rawRecord: unknown;
  readonly firehoseCursor: number;
  readonly createdAt: string;
}

/**
 * Paginated list of DLQ entries.
 */
interface DLQListResponse {
  readonly entries: DLQEntryView[];
  readonly cursor: string | null;
  readonly total: number;
}

/**
 * Aggregated DLQ statistics.
 */
interface DLQStatsResponse {
  readonly total: number;
  readonly byCollection: Record<string, number>;
  readonly byErrorStage: Record<string, number>;
}

/**
 * Row shape returned by PostgreSQL for the dlq_entries table.
 */
interface DLQRow {
  id: string;
  collection: string;
  rkey: string;
  did: string;
  error: unknown;
  raw_record: unknown;
  firehose_cursor: string | bigint | number;
  created_at: Date;
}

/**
 * Row shape for count queries.
 */
interface CountRow {
  total: number;
}

/**
 * Row shape for collection aggregation queries.
 */
interface CollectionCountRow {
  collection: string;
  count: number;
}

/**
 * Row shape for error stage aggregation queries.
 */
interface StageCountRow {
  stage: string | null;
  count: number;
}

/**
 * Request body shape for the retry-all endpoint.
 */
interface RetryAllBody {
  collection?: string;
  did?: string;
}

/**
 * Maps a PostgreSQL row to a DLQ entry view object.
 */
function rowToView(row: DLQRow): DLQEntryView {
  return {
    id: row.id,
    collection: row.collection,
    rkey: row.rkey,
    did: row.did,
    error: row.error,
    rawRecord: row.raw_record,
    firehoseCursor: Number(row.firehose_cursor),
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Lists DLQ entries with cursor-based pagination.
 *
 * @param pool - PostgreSQL connection pool
 * @param limit - maximum number of entries to return (1-100)
 * @param cursor - opaque pagination cursor (the `id` of the last entry from the previous page)
 * @returns paginated list of DLQ entries
 */
async function listEntries(
  pool: Pool,
  limit: number,
  cursor?: string,
): Promise<Result<DLQListResponse, DatabaseError | ValidationError>> {
  if (limit < 1 || limit > 100) {
    return Err(new ValidationError('Limit must be between 1 and 100', 'limit', 'range'));
  }

  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM dlq_entries');
    const total = (countResult.rows[0] as CountRow).total;

    let query: string;
    let params: unknown[];

    if (cursor) {
      query = `SELECT * FROM dlq_entries WHERE id < $1 ORDER BY created_at DESC, id DESC LIMIT $2`;
      params = [cursor, limit];
    } else {
      query = `SELECT * FROM dlq_entries ORDER BY created_at DESC, id DESC LIMIT $1`;
      params = [limit];
    }

    const result = await pool.query(query, params);
    const entries = (result.rows as DLQRow[]).map((row) => rowToView(row));
    const lastEntry = entries[entries.length - 1];
    const nextCursor = entries.length === limit && lastEntry ? lastEntry.id : null;

    return Ok({ entries, cursor: nextCursor, total });
  } catch (err) {
    return Err(new DatabaseError('Failed to list DLQ entries', err as Error));
  }
}

/**
 * Retrieves a single DLQ entry by ID.
 *
 * @param pool - PostgreSQL connection pool
 * @param id - the DLQ entry ID
 * @returns the DLQ entry, or NotFoundError
 */
async function getEntry(
  pool: Pool,
  id: string,
): Promise<Result<DLQEntryView, DatabaseError | NotFoundError>> {
  try {
    const result = await pool.query('SELECT * FROM dlq_entries WHERE id = $1', [id]);
    const row = result.rows[0] as DLQRow | undefined;

    if (!row) {
      return Err(new NotFoundError('DLQEntry', id));
    }

    return Ok(rowToView(row));
  } catch (err) {
    return Err(new DatabaseError('Failed to fetch DLQ entry', err as Error));
  }
}

/**
 * Deletes a single DLQ entry by ID.
 *
 * @param pool - PostgreSQL connection pool
 * @param id - the DLQ entry ID to delete
 * @returns void on success, or NotFoundError if the entry does not exist
 */
async function deleteEntry(
  pool: Pool,
  id: string,
): Promise<Result<void, DatabaseError | NotFoundError>> {
  try {
    const result = await pool.query('DELETE FROM dlq_entries WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return Err(new NotFoundError('DLQEntry', id));
    }

    return Ok(undefined);
  } catch (err) {
    return Err(new DatabaseError('Failed to delete DLQ entry', err as Error));
  }
}

/**
 * Retries a single DLQ entry by returning its raw record for re-processing.
 *
 * The entry is removed from the DLQ upon successful retrieval. The caller
 * is responsible for re-enqueuing the record into the appropriate BullMQ queue.
 *
 * @param pool - PostgreSQL connection pool
 * @param id - the DLQ entry ID to retry
 * @returns the DLQ entry data for re-processing
 */
async function retryEntry(
  pool: Pool,
  id: string,
): Promise<Result<DLQEntryView, DatabaseError | NotFoundError>> {
  try {
    const result = await pool.query('DELETE FROM dlq_entries WHERE id = $1 RETURNING *', [id]);
    const row = result.rows[0] as DLQRow | undefined;

    if (!row) {
      return Err(new NotFoundError('DLQEntry', id));
    }

    return Ok(rowToView(row));
  } catch (err) {
    return Err(new DatabaseError('Failed to retry DLQ entry', err as Error));
  }
}

/**
 * Retries all DLQ entries matching optional filters.
 *
 * Matching entries are removed from the DLQ and returned for re-processing.
 *
 * @param pool - PostgreSQL connection pool
 * @param filters - optional filters to narrow which entries to retry
 * @returns the list of retried entries
 */
async function retryAll(
  pool: Pool,
  filters?: { collection?: string; did?: string },
): Promise<Result<DLQEntryView[], DatabaseError>> {
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.collection) {
      params.push(filters.collection);
      conditions.push(`collection = $${params.length}`);
    }

    if (filters?.did) {
      params.push(filters.did);
      conditions.push(`did = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `DELETE FROM dlq_entries ${whereClause} RETURNING *`;
    const result = await pool.query(query, params);
    const entries = (result.rows as DLQRow[]).map((row) => rowToView(row));

    return Ok(entries);
  } catch (err) {
    return Err(new DatabaseError('Failed to retry all DLQ entries', err as Error));
  }
}

/**
 * Returns aggregated statistics about the DLQ.
 *
 * @param pool - PostgreSQL connection pool
 * @returns total count, breakdown by collection, and breakdown by error stage
 */
async function getStats(pool: Pool): Promise<Result<DLQStatsResponse, DatabaseError>> {
  try {
    const [totalResult, collectionResult, stageResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM dlq_entries'),
      pool.query(
        `SELECT collection, COUNT(*)::int AS count FROM dlq_entries GROUP BY collection ORDER BY count DESC`,
      ),
      pool.query(
        `SELECT error->>'stage' AS stage, COUNT(*)::int AS count FROM dlq_entries GROUP BY error->>'stage' ORDER BY count DESC`,
      ),
    ]);

    const total = (totalResult.rows[0] as CountRow).total;

    const byCollection: Record<string, number> = {};
    for (const row of collectionResult.rows as CollectionCountRow[]) {
      byCollection[row.collection] = row.count;
    }

    const byErrorStage: Record<string, number> = {};
    for (const row of stageResult.rows as StageCountRow[]) {
      if (row.stage) {
        byErrorStage[row.stage] = row.count;
      }
    }

    return Ok({ total, byCollection, byErrorStage });
  } catch (err) {
    return Err(new DatabaseError('Failed to fetch DLQ stats', err as Error));
  }
}

/**
 * Maps a Result to a Hono JSON response, using the appropriate HTTP status
 * code based on the error type.
 */
function resultToResponse<T>(
  c: Context,
  result: Result<T, DatabaseError | NotFoundError | ValidationError>,
): Response {
  if (result.ok) {
    return c.json(result.value);
  }

  const error = result.error;

  if (error instanceof NotFoundError) {
    return c.json({ error: error.code, message: error.message }, 404);
  }

  if (error instanceof ValidationError) {
    return c.json({ error: error.code, message: error.message }, 400);
  }

  return c.json({ error: error.code, message: error.message }, 500);
}

/**
 * Registers DLQ admin routes on the given Hono app.
 *
 * All routes are prefixed with `/admin/v1/dlq` and require a `Pool`
 * dependency for database access.
 *
 * @param app - the Hono application instance
 * @param pool - PostgreSQL connection pool
 */
function dlqAdminRoutes(app: Hono, pool: Pool): void {
  app.get('/admin/v1/dlq/stats', async (c) => {
    const result = await getStats(pool);
    return resultToResponse(c, result);
  });

  app.get('/admin/v1/dlq/:id', async (c) => {
    const id = c.req.param('id');
    const result = await getEntry(pool, id);
    return resultToResponse(c, result);
  });

  app.get('/admin/v1/dlq', async (c) => {
    const limitParam = c.req.query('limit');
    const cursor = c.req.query('cursor');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (isNaN(limit)) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'limit must be a number' }, 400);
    }

    const result = await listEntries(pool, limit, cursor);
    return resultToResponse(c, result);
  });

  app.post('/admin/v1/dlq/:id/retry', async (c) => {
    const id = c.req.param('id');
    const result = await retryEntry(pool, id);
    return resultToResponse(c, result);
  });

  app.delete('/admin/v1/dlq/:id', async (c) => {
    const id = c.req.param('id');
    const result = await deleteEntry(pool, id);

    if (result.ok) {
      return c.json({ deleted: true });
    }

    return resultToResponse(c, result);
  });

  app.post('/admin/v1/dlq/retry-all', async (c) => {
    let filters: { collection?: string; did?: string } | undefined;

    try {
      const body: RetryAllBody = await c.req.json();
      if (body && typeof body === 'object') {
        filters = {};
        if (typeof body.collection === 'string') {
          filters.collection = body.collection;
        }
        if (typeof body.did === 'string') {
          filters.did = body.did;
        }
      }
    } catch {
      // No body or invalid JSON is acceptable; retry all entries
    }

    const result = await retryAll(pool, filters);
    return resultToResponse(c, result);
  });
}

export { dlqAdminRoutes, deleteEntry, getEntry, getStats, listEntries, retryAll, retryEntry };
export type { DLQEntryView, DLQListResponse, DLQStatsResponse };
