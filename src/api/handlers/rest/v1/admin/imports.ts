/**
 * Import history admin endpoint.
 *
 * Returns a paginated list of past format import operations. The data
 * is read from the `import_history` table in PostgreSQL. If the table
 * does not exist, the endpoint returns an empty list (the migration
 * should be added when full import tracking is implemented).
 *
 * @module
 */

import type { Hono } from 'hono';
import type { Pool } from 'pg';

/**
 * Dependencies required by the import history endpoint.
 */
interface ImportsAdminDependencies {
  readonly pgPool: Pool;
}

/**
 * A single import history entry.
 */
interface ImportEntry {
  readonly id: string;
  readonly format: string;
  readonly fileName: string;
  readonly importedBy: string;
  readonly importedAt: string;
  readonly counts: {
    readonly expressions: number;
    readonly segmentations: number;
    readonly layers: number;
  };
  readonly status: 'completed' | 'failed' | 'partial';
}

/**
 * Response shape for GET /admin/v1/imports.
 */
interface ImportsListResponse {
  readonly imports: ImportEntry[];
  readonly cursor?: string | undefined;
}

/**
 * Row shape from the import_history PostgreSQL table.
 */
interface ImportHistoryRow {
  id: string;
  format: string;
  file_name: string;
  imported_by: string;
  imported_at: Date;
  expression_count: number;
  segmentation_count: number;
  layer_count: number;
  status: string;
}

/**
 * Registers import history admin routes on the given Hono app.
 *
 * @param app - the Hono application instance
 * @param deps - PostgreSQL pool for querying import history
 */
function importsAdminRoutes(app: Hono, deps: ImportsAdminDependencies): void {
  app.get('/admin/v1/imports', async (c) => {
    const limitParam = c.req.query('limit');
    const cursor = c.req.query('cursor');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'limit must be between 1 and 100' }, 400);
    }

    try {
      // Check if the import_history table exists before querying.
      const tableCheck = await deps.pgPool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'import_history'
        ) AS exists`,
      );

      const tableExists = (tableCheck.rows[0] as { exists: boolean }).exists;

      if (!tableExists) {
        // Table not yet created; return empty results
        return c.json({ imports: [] } satisfies ImportsListResponse);
      }

      let query: string;
      let params: unknown[];

      if (cursor) {
        query = `SELECT * FROM import_history WHERE id < $1 ORDER BY imported_at DESC, id DESC LIMIT $2`;
        params = [cursor, limit];
      } else {
        query = `SELECT * FROM import_history ORDER BY imported_at DESC, id DESC LIMIT $1`;
        params = [limit];
      }

      const result = await deps.pgPool.query(query, params);
      const rows = result.rows as ImportHistoryRow[];

      const imports: ImportEntry[] = rows.map((row) => ({
        id: row.id,
        format: row.format,
        fileName: row.file_name,
        importedBy: row.imported_by,
        importedAt: row.imported_at.toISOString(),
        counts: {
          expressions: row.expression_count,
          segmentations: row.segmentation_count,
          layers: row.layer_count,
        },
        status: row.status as ImportEntry['status'],
      }));

      const lastEntry = imports[imports.length - 1];
      const nextCursor = imports.length === limit && lastEntry ? lastEntry.id : undefined;

      const response: ImportsListResponse = { imports, cursor: nextCursor };
      return c.json(response);
    } catch (err) {
      return c.json(
        {
          error: 'DATABASE_ERROR',
          message: `Failed to fetch import history: ${(err as Error).message}`,
        },
        500,
      );
    }
  });
}

export { importsAdminRoutes };
export type { ImportsAdminDependencies, ImportEntry, ImportsListResponse };
