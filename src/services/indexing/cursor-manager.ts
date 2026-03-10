/**
 * Firehose cursor persistence with batch flushing.
 *
 * @module
 */

import type { Pool } from 'pg';

import { createLogger } from '../../observability/logger.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

/**
 * Manages firehose cursor persistence with batch flushing.
 *
 * The cursor is updated in memory on every event but only flushed to
 * PostgreSQL every `batchSize` events or `flushIntervalMs` milliseconds,
 * whichever comes first. This reduces write load while ensuring at most
 * a few seconds of events are reprocessed on unclean shutdown.
 */
class CursorManager {
  private readonly pool: Pool;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly logger: ILogger;

  private pendingCursor: number | null = null;
  private eventsSinceFlush = 0;
  private lastFlushTime = Date.now();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(pool: Pool, options?: { batchSize?: number; flushIntervalMs?: number }) {
    this.pool = pool;
    this.batchSize = options?.batchSize ?? 1_000;
    this.flushIntervalMs = options?.flushIntervalMs ?? 5_000;
    this.logger = createLogger({ service: 'cursor-manager' });
  }

  /**
   * Creates the firehose_cursor table if it does not exist.
   */
  async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS firehose_cursor (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        cursor BIGINT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  /**
   * Updates the in-memory cursor and flushes if the batch threshold is reached.
   */
  update(cursor: number): void {
    this.pendingCursor = cursor;
    this.eventsSinceFlush++;

    if (this.eventsSinceFlush >= this.batchSize) {
      void this.flush();
    }
  }

  /**
   * Flushes the pending cursor to PostgreSQL.
   */
  async flush(): Promise<void> {
    if (this.pendingCursor === null) {
      return;
    }

    const cursor = this.pendingCursor;
    this.eventsSinceFlush = 0;
    this.lastFlushTime = Date.now();

    try {
      await this.pool.query(
        `INSERT INTO firehose_cursor (id, cursor, updated_at)
         VALUES (1, $1, NOW())
         ON CONFLICT (id) DO UPDATE SET cursor = $1, updated_at = NOW()`,
        [cursor],
      );
      this.logger.debug('Flushed cursor', { cursor });
    } catch (err) {
      this.logger.error('Failed to flush cursor', {
        error: (err as Error).message,
        cursor,
      });
    }
  }

  /**
   * Retrieves the last persisted cursor value.
   *
   * Returns null if no cursor has been persisted (first run).
   */
  async getCursor(): Promise<number | null> {
    const result = await this.pool.query('SELECT cursor FROM firehose_cursor WHERE id = 1');
    const row = result.rows[0] as { cursor: string } | undefined;
    return row ? Number(row.cursor) : null;
  }

  /**
   * Starts the periodic flush interval.
   */
  startFlushInterval(): void {
    this.flushTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastFlushTime;
      if (elapsed >= this.flushIntervalMs && this.pendingCursor !== null) {
        void this.flush();
      }
    }, this.flushIntervalMs);
  }

  /**
   * Stops the flush interval and performs a final flush.
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

export { CursorManager };
