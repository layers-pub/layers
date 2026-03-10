/**
 * Abstract storage backend interface for PostgreSQL operations.
 *
 * @module
 */

import type { DatabaseError } from '../errors.js';
import type { Result } from '../result.js';

/**
 * Defines the contract for PostgreSQL storage operations.
 *
 * Implementations handle record persistence, retrieval, and deletion
 * across the indexed record tables. All methods return {@link Result}
 * to force explicit error handling at call sites.
 */
export interface IStorageBackend {
  /**
   * Stores a record in the specified table.
   *
   * @param table - the target table name
   * @param data - the record fields to persist
   * @returns void on success, or a {@link DatabaseError}
   */
  storeRecord(table: string, data: Record<string, unknown>): Promise<Result<void, DatabaseError>>;

  /**
   * Retrieves a record by its AT-URI.
   *
   * @param table - the table to query
   * @param uri - the AT-URI of the record
   * @returns the record if found, null if absent, or a {@link DatabaseError}
   */
  getByUri(
    table: string,
    uri: string,
  ): Promise<Result<Record<string, unknown> | null, DatabaseError>>;

  /**
   * Deletes a record by its AT-URI.
   *
   * @param table - the table to delete from
   * @param uri - the AT-URI of the record to remove
   * @returns void on success, or a {@link DatabaseError}
   */
  deleteByUri(table: string, uri: string): Promise<Result<void, DatabaseError>>;

  /**
   * Executes an arbitrary parameterized SQL query.
   *
   * Intended for custom queries such as cursor-based pagination that
   * do not fit the standard CRUD methods.
   *
   * @param sql - the parameterized SQL string
   * @param params - the positional bind parameters
   * @returns the result rows on success, or a {@link DatabaseError}
   */
  query(sql: string, params?: unknown[]): Promise<Result<Record<string, unknown>[], DatabaseError>>;

  /**
   * Checks whether the storage backend is reachable and operational.
   *
   * @returns void on success, or a {@link DatabaseError}
   */
  healthCheck(): Promise<Result<void, DatabaseError>>;
}
