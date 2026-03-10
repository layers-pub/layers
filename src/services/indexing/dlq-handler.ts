/**
 * Dead letter queue handler for permanently failed firehose events.
 *
 * @module
 */

import type { Pool } from 'pg';

import type { ILogger } from '../../types/interfaces/logger.interface.js';
import { type Result, Ok, Err } from '../../types/result.js';
import { DatabaseError } from '../../types/errors.js';

/**
 * Dead letter queue entry for failed firehose events.
 */
interface DLQEntry {
  readonly id: string;
  readonly collection: string;
  readonly rkey: string;
  readonly did: string;
  readonly error: {
    readonly stage: 'lexicon' | 'zod';
    readonly message: string;
    readonly path?: string[];
    readonly expected?: string;
    readonly received?: string;
  };
  readonly rawRecord: unknown;
  readonly firehoseCursor: number;
  readonly timestamp: Date;
}

/**
 * Manages the dead letter queue for permanently failed firehose events.
 *
 * Failed events that cannot be retried (validation errors, malformed records)
 * are stored in PostgreSQL for later inspection and manual replay.
 */
class DLQHandler {
  private readonly pool: Pool;
  private readonly logger: ILogger;

  constructor(pool: Pool, logger: ILogger) {
    this.pool = pool;
    this.logger = logger;
  }

  /**
   * Creates the DLQ table if it does not exist.
   */
  async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS dlq_entries (
        id TEXT PRIMARY KEY,
        collection TEXT NOT NULL,
        rkey TEXT NOT NULL,
        did TEXT NOT NULL,
        error JSONB NOT NULL,
        raw_record JSONB,
        firehose_cursor BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  /**
   * Adds a failed event to the dead letter queue.
   */
  async addEntry(entry: DLQEntry): Promise<Result<void, DatabaseError>> {
    try {
      await this.pool.query(
        `INSERT INTO dlq_entries (id, collection, rkey, did, error, raw_record, firehose_cursor, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          entry.id,
          entry.collection,
          entry.rkey,
          entry.did,
          JSON.stringify(entry.error),
          JSON.stringify(entry.rawRecord),
          entry.firehoseCursor,
          entry.timestamp,
        ],
      );
      this.logger.info('Added entry to DLQ', {
        id: entry.id,
        collection: entry.collection,
      });
      return Ok(undefined);
    } catch (err) {
      return Err(new DatabaseError('Failed to add DLQ entry', err as Error));
    }
  }

  /**
   * Retrieves entries from the dead letter queue.
   */
  async getEntries(limit = 100): Promise<Result<DLQEntry[], DatabaseError>> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM dlq_entries ORDER BY created_at DESC LIMIT $1',
        [limit],
      );
      const entries: DLQEntry[] = result.rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        collection: row.collection as string,
        rkey: row.rkey as string,
        did: row.did as string,
        error: row.error as DLQEntry['error'],
        rawRecord: row.raw_record,
        firehoseCursor: Number(row.firehose_cursor),
        timestamp: row.created_at as Date,
      }));
      return Ok(entries);
    } catch (err) {
      return Err(new DatabaseError('Failed to read DLQ entries', err as Error));
    }
  }
}

export { DLQHandler };
export type { DLQEntry };
