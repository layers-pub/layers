/**
 * PostgreSQL storage adapter implementing {@link IStorageBackend}.
 *
 * @module
 */

import type { Pool } from 'pg';

import { createLogger } from '../../observability/logger.js';
import { DatabaseError } from '../../types/errors.js';
import type { IStorageBackend } from '../../types/interfaces/storage.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { pgPolicy } from '../../utils/resilience.js';

/**
 * Tables that may be targeted by dynamic queries.
 *
 * Validated before any query to prevent SQL injection through
 * table name interpolation.
 */
const ALLOWED_TABLES = new Set([
  'expressions',
  'ontologies',
  'corpora',
  'personas',
  'media_records',
  'eprints',
  'segmentations',
  'type_defs',
  'corpus_memberships',
  'resource_collections',
  'resource_entries',
  'graph_nodes',
  'changelogs',
  'annotation_layers',
  'cluster_sets',
  'collection_memberships',
  'templates',
  'graph_edges',
  'graph_edge_sets',
  'data_links',
  'alignments',
  'experiment_defs',
  'fillings',
  'template_compositions',
  'judgment_sets',
  'agreement_reports',
  'cross_references',
  'firehose_cursor',
  'dlq_entries',
]);

const logger = createLogger({ service: 'postgresql-adapter' });

/**
 * Validates that a table name is in the allowlist.
 *
 * @param table - the table name to validate
 * @returns true if the table is allowed
 * @throws {DatabaseError} if the table is not in the allowlist
 */
function assertAllowedTable(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new DatabaseError(`Table "${table}" is not in the allowlist`);
  }
}

/**
 * PostgreSQL adapter wrapping a pg Pool with cockatiel resilience.
 *
 * All public methods return {@link Result} and route through the
 * shared {@link pgPolicy} for retry, circuit breaking, bulkhead,
 * and timeout protection.
 */
export class PostgreSQLAdapter implements IStorageBackend {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Stores a record using INSERT ... ON CONFLICT (uri) DO UPDATE.
   *
   * Column names are derived from the data object keys. Values use
   * positional bind parameters to prevent injection.
   *
   * @param table - the target table (must be in {@link ALLOWED_TABLES})
   * @param data - key-value pairs representing the record columns
   */
  async storeRecord(
    table: string,
    data: Record<string, unknown>,
  ): Promise<Result<void, DatabaseError>> {
    try {
      assertAllowedTable(table);

      const keys = Object.keys(data);
      if (keys.length === 0) {
        return Err(new DatabaseError('Cannot store record with no fields'));
      }

      const columns = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${String(i + 1)}`).join(', ');
      const updateSet = keys
        .filter((k) => k !== 'uri')
        .map((k) => `${k} = EXCLUDED.${k}`)
        .join(', ');

      const sql = updateSet
        ? `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) ON CONFLICT (uri) DO UPDATE SET ${updateSet}`
        : `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) ON CONFLICT (uri) DO NOTHING`;

      const values = keys.map((k) => data[k]);

      await pgPolicy.execute(async () => {
        await this.pool.query(sql, values);
      });

      logger.debug('Record stored', { table });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        `Failed to store record in ${table}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('storeRecord failed', { table, error: error.message });
      return Err(error);
    }
  }

  /**
   * Retrieves a single record by its AT-URI.
   *
   * @param table - the table to query (must be in {@link ALLOWED_TABLES})
   * @param uri - the AT-URI to look up
   */
  async getByUri(
    table: string,
    uri: string,
  ): Promise<Result<Record<string, unknown> | null, DatabaseError>> {
    try {
      assertAllowedTable(table);

      const result = await pgPolicy.execute(async () => {
        return this.pool.query<Record<string, unknown>>(`SELECT * FROM ${table} WHERE uri = $1`, [
          uri,
        ]);
      });

      const row = result.rows[0];
      return Ok(row ?? null);
    } catch (err) {
      const error = new DatabaseError(
        `Failed to get record from ${table}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('getByUri failed', { table, uri, error: error.message });
      return Err(error);
    }
  }

  /**
   * Deletes a record by its AT-URI.
   *
   * @param table - the table to delete from (must be in {@link ALLOWED_TABLES})
   * @param uri - the AT-URI of the record to remove
   */
  async deleteByUri(table: string, uri: string): Promise<Result<void, DatabaseError>> {
    try {
      assertAllowedTable(table);

      await pgPolicy.execute(async () => {
        await this.pool.query(`DELETE FROM ${table} WHERE uri = $1`, [uri]);
      });

      logger.debug('Record deleted', { table, uri });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        `Failed to delete record from ${table}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('deleteByUri failed', { table, uri, error: error.message });
      return Err(error);
    }
  }

  /**
   * Executes an arbitrary parameterized SQL query.
   *
   * @param sql - the parameterized SQL string
   * @param params - optional positional bind parameters
   */
  async query(
    sql: string,
    params?: unknown[],
  ): Promise<Result<Record<string, unknown>[], DatabaseError>> {
    try {
      const result = await pgPolicy.execute(async () => {
        return this.pool.query<Record<string, unknown>>(sql, params);
      });

      return Ok(result.rows);
    } catch (err) {
      const error = new DatabaseError(
        'Query execution failed',
        err instanceof Error ? err : undefined,
      );
      logger.error('query failed', { error: error.message });
      return Err(error);
    }
  }

  /**
   * Verifies connectivity by executing `SELECT 1`.
   */
  async healthCheck(): Promise<Result<void, DatabaseError>> {
    try {
      await pgPolicy.execute(async () => {
        await this.pool.query('SELECT 1');
      });

      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        'PostgreSQL health check failed',
        err instanceof Error ? err : undefined,
      );
      return Err(error);
    }
  }
}
