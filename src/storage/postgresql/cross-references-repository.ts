/**
 * Repository for cross-reference storage and lookup.
 *
 * Unlike other repositories, this does not extend BaseRepository because
 * cross-references are not a record type. It directly uses the pg Pool
 * and pgPolicy for resilience.
 *
 * @module
 */

import type { Pool } from 'pg';

import { createLogger } from '../../observability/logger.js';
import { DatabaseError } from '../../types/errors.js';
import type { CrossReference, CrossReferenceRow } from '../../types/cross-reference.js';
import { Err, Ok, type Result } from '../../types/result.js';
import { pgPolicy } from '../../utils/resilience.js';

const logger = createLogger({ service: 'cross-references-repository' });

/**
 * Paginated result from a cross-reference query.
 */
interface PaginatedCrossRefs {
  readonly rows: CrossReferenceRow[];
  readonly cursor: string | undefined;
}

/**
 * Encodes a keyset pagination cursor from a row ID.
 */
function encodeCursor(id: number | bigint): string {
  return Buffer.from(String(id)).toString('base64url');
}

/**
 * Decodes a keyset pagination cursor into a numeric ID.
 *
 * @returns the decoded ID, or null if the cursor is invalid
 */
function decodeCursor(cursor: string): number | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const id = Number(decoded);
    if (Number.isNaN(id) || !Number.isInteger(id)) return null;
    return id;
  } catch {
    return null;
  }
}

/**
 * Contract for cross-reference data access operations.
 */
interface ICrossReferencesRepository {
  storeRefs(sourceUri: string, refs: CrossReference[]): Promise<Result<void, DatabaseError>>;
  getForwardRefs(
    uri: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<PaginatedCrossRefs, DatabaseError>>;
  getReverseRefs(
    uri: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<PaginatedCrossRefs, DatabaseError>>;
  deleteBySource(uri: string): Promise<Result<void, DatabaseError>>;
}

/**
 * PostgreSQL repository for cross-reference CRUD operations.
 *
 * Stores forward references (source -> target) and supports queries
 * in both directions with keyset pagination. Uses transactional
 * semantics for atomic delete-then-insert during storeRefs.
 */
class CrossReferencesRepository implements ICrossReferencesRepository {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Replaces all cross-references for a source URI.
   *
   * Deletes existing references for the source URI, then batch-inserts
   * the new set. Both operations run in a single transaction.
   *
   * @param sourceUri - the AT-URI of the source record
   * @param refs - the new set of cross-references to store
   */
  async storeRefs(sourceUri: string, refs: CrossReference[]): Promise<Result<void, DatabaseError>> {
    try {
      await pgPolicy.execute(async () => {
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN');

          await client.query('DELETE FROM cross_references WHERE source_uri = $1', [sourceUri]);

          if (refs.length > 0) {
            const valueClauses: string[] = [];
            const params: unknown[] = [];
            let paramIndex = 1;

            for (const ref of refs) {
              valueClauses.push(
                `($${String(paramIndex)}, $${String(paramIndex + 1)}, $${String(paramIndex + 2)}, $${String(paramIndex + 3)})`,
              );
              params.push(ref.sourceUri, ref.targetUri, ref.refType, ref.sourceCollection);
              paramIndex += 4;
            }

            const sql = `INSERT INTO cross_references (source_uri, target_uri, ref_type, source_collection) VALUES ${valueClauses.join(', ')} ON CONFLICT (source_uri, target_uri, ref_type) DO NOTHING`;

            await client.query(sql, params);
          }

          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      });

      logger.debug('Cross-references stored', { sourceUri, count: refs.length });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        `Failed to store cross-references for ${sourceUri}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('storeRefs failed', { sourceUri, error: error.message });
      return Err(error);
    }
  }

  /**
   * Retrieves cross-references originating from a source URI with keyset pagination.
   *
   * @param uri - the AT-URI to look up as source
   * @param limit - maximum number of rows to return
   * @param cursor - optional pagination cursor from a previous response
   */
  async getForwardRefs(
    uri: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<PaginatedCrossRefs, DatabaseError>> {
    try {
      let sql: string;
      let params: unknown[];

      if (cursor) {
        const decodedId = decodeCursor(cursor);
        if (decodedId === null) {
          return Err(new DatabaseError('Invalid cursor'));
        }
        sql = `SELECT id, source_uri, target_uri, ref_type, source_collection, created_at FROM cross_references WHERE source_uri = $1 AND id > $2 ORDER BY id LIMIT $3`;
        params = [uri, decodedId, limit];
      } else {
        sql = `SELECT id, source_uri, target_uri, ref_type, source_collection, created_at FROM cross_references WHERE source_uri = $1 ORDER BY id LIMIT $2`;
        params = [uri, limit];
      }

      const result = await pgPolicy.execute(async () => {
        return this.pool.query<CrossReferenceRow & { id: number }>(sql, params);
      });

      const rows = result.rows;
      const lastRow = rows[rows.length - 1];
      const nextCursor = lastRow && rows.length === limit ? encodeCursor(lastRow.id) : undefined;

      return Ok({ rows, cursor: nextCursor });
    } catch (err) {
      const error = new DatabaseError(
        `Failed to get forward refs for ${uri}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('getForwardRefs failed', { uri, error: error.message });
      return Err(error);
    }
  }

  /**
   * Retrieves cross-references pointing to a target URI with keyset pagination.
   *
   * @param uri - the AT-URI to look up as target
   * @param limit - maximum number of rows to return
   * @param cursor - optional pagination cursor from a previous response
   */
  async getReverseRefs(
    uri: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<PaginatedCrossRefs, DatabaseError>> {
    try {
      let sql: string;
      let params: unknown[];

      if (cursor) {
        const decodedId = decodeCursor(cursor);
        if (decodedId === null) {
          return Err(new DatabaseError('Invalid cursor'));
        }
        sql = `SELECT id, source_uri, target_uri, ref_type, source_collection, created_at FROM cross_references WHERE target_uri = $1 AND id > $2 ORDER BY id LIMIT $3`;
        params = [uri, decodedId, limit];
      } else {
        sql = `SELECT id, source_uri, target_uri, ref_type, source_collection, created_at FROM cross_references WHERE target_uri = $1 ORDER BY id LIMIT $2`;
        params = [uri, limit];
      }

      const result = await pgPolicy.execute(async () => {
        return this.pool.query<CrossReferenceRow & { id: number }>(sql, params);
      });

      const rows = result.rows;
      const lastRow = rows[rows.length - 1];
      const nextCursor = lastRow && rows.length === limit ? encodeCursor(lastRow.id) : undefined;

      return Ok({ rows, cursor: nextCursor });
    } catch (err) {
      const error = new DatabaseError(
        `Failed to get reverse refs for ${uri}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('getReverseRefs failed', { uri, error: error.message });
      return Err(error);
    }
  }

  /**
   * Deletes all cross-references originating from a source URI.
   *
   * Called when a record is deleted to clean up its outgoing references.
   *
   * @param uri - the AT-URI whose outgoing references should be removed
   */
  async deleteBySource(uri: string): Promise<Result<void, DatabaseError>> {
    try {
      await pgPolicy.execute(async () => {
        await this.pool.query('DELETE FROM cross_references WHERE source_uri = $1', [uri]);
      });

      logger.debug('Cross-references deleted', { sourceUri: uri });
      return Ok(undefined);
    } catch (err) {
      const error = new DatabaseError(
        `Failed to delete cross-references for ${uri}`,
        err instanceof Error ? err : undefined,
      );
      logger.error('deleteBySource failed', { uri, error: error.message });
      return Err(error);
    }
  }
}

export { CrossReferencesRepository, decodeCursor, encodeCursor };
export type { ICrossReferencesRepository, PaginatedCrossRefs };
