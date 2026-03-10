/**
 * User and role management admin endpoints.
 *
 * Provides search, detail view, and role assignment/removal for
 * users known to the appview. User records are sourced from the
 * `users` table in PostgreSQL, which is populated as DIDs are
 * encountered during firehose indexing and OAuth sessions.
 *
 * @module
 */

import type { Hono } from 'hono';
import type { Pool } from 'pg';

import { NotFoundError, ValidationError } from '../../../../../types/errors.js';

/**
 * Dependencies required by user admin endpoints.
 */
interface UsersAdminDependencies {
  readonly pgPool: Pool;
}

/**
 * User summary returned by list and detail endpoints.
 */
interface UserView {
  readonly did: string;
  readonly handle: string | null;
  readonly roles: string[];
  readonly lastSeenAt: string | null;
  readonly createdAt: string;
}

/**
 * Row shape from the users PostgreSQL table.
 */
interface UserRow {
  did: string;
  handle: string | null;
  roles: string[];
  last_seen_at: Date | null;
  created_at: Date;
}

/**
 * Valid role names for assignment.
 */
const VALID_ROLES = new Set([
  'viewer',
  'annotator',
  'adjudicator',
  'corpus-manager',
  'ontology-editor',
  'admin',
]);

/**
 * Maps a PostgreSQL row to a user view object.
 */
function rowToView(row: UserRow): UserView {
  return {
    did: row.did,
    handle: row.handle ?? null,
    roles: row.roles ?? [],
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Registers user and role management admin routes on the given Hono app.
 *
 * If the `users` table does not exist, endpoints return empty results
 * or 404 as appropriate.
 *
 * @param app - the Hono application instance
 * @param deps - PostgreSQL pool for user queries
 */
function usersAdminRoutes(app: Hono, deps: UsersAdminDependencies): void {
  /**
   * Search users by handle or DID substring.
   *
   * GET /admin/v1/users?q=searchTerm&limit=20
   */
  app.get('/admin/v1/users', async (c) => {
    const q = c.req.query('q') ?? '';
    const limitParam = c.req.query('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'limit must be between 1 and 100' }, 400);
    }

    try {
      const tableCheck = await deps.pgPool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'users'
        ) AS exists`,
      );

      if (!(tableCheck.rows[0] as { exists: boolean }).exists) {
        return c.json({ users: [], total: 0 });
      }

      let query: string;
      let params: unknown[];

      if (q.length > 0) {
        query = `SELECT * FROM users WHERE did ILIKE $1 OR handle ILIKE $1 ORDER BY created_at DESC LIMIT $2`;
        params = [`%${q}%`, limit];
      } else {
        query = `SELECT * FROM users ORDER BY created_at DESC LIMIT $1`;
        params = [limit];
      }

      const result = await deps.pgPool.query(query, params);
      const users = (result.rows as UserRow[]).map(rowToView);

      return c.json({ users, total: users.length });
    } catch (err) {
      return c.json(
        { error: 'DATABASE_ERROR', message: `Failed to search users: ${(err as Error).message}` },
        500,
      );
    }
  });

  /**
   * Get a single user by DID.
   *
   * GET /admin/v1/users/:did
   */
  app.get('/admin/v1/users/:did', async (c) => {
    const did = c.req.param('did');

    try {
      const tableCheck = await deps.pgPool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'users'
        ) AS exists`,
      );

      if (!(tableCheck.rows[0] as { exists: boolean }).exists) {
        const err = new NotFoundError('User', did);
        return c.json({ error: err.code, message: err.message }, 404);
      }

      const result = await deps.pgPool.query('SELECT * FROM users WHERE did = $1', [did]);
      const row = result.rows[0] as UserRow | undefined;

      if (!row) {
        const err = new NotFoundError('User', did);
        return c.json({ error: err.code, message: err.message }, 404);
      }

      return c.json(rowToView(row));
    } catch (err) {
      return c.json(
        { error: 'DATABASE_ERROR', message: `Failed to fetch user: ${(err as Error).message}` },
        500,
      );
    }
  });

  /**
   * Add a role to a user.
   *
   * POST /admin/v1/users/:did/roles
   * Body: { "role": "annotator" }
   */
  app.post('/admin/v1/users/:did/roles', async (c) => {
    const did = c.req.param('did');

    let body: { role?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' }, 400);
    }

    const role = body.role;
    if (!role || typeof role !== 'string') {
      const err = new ValidationError('role is required', 'role', 'required');
      return c.json({ error: err.code, message: err.message }, 400);
    }

    if (!VALID_ROLES.has(role)) {
      const err = new ValidationError(
        `Invalid role: ${role}. Valid roles: ${[...VALID_ROLES].join(', ')}`,
        'role',
        'enum',
      );
      return c.json({ error: err.code, message: err.message }, 400);
    }

    try {
      const tableCheck = await deps.pgPool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'users'
        ) AS exists`,
      );

      if (!(tableCheck.rows[0] as { exists: boolean }).exists) {
        const err = new NotFoundError('User', did);
        return c.json({ error: err.code, message: err.message }, 404);
      }

      // Add the role if not already present using array_append + array check
      const result = await deps.pgPool.query(
        `UPDATE users SET roles = array_append(roles, $2)
         WHERE did = $1 AND NOT ($2 = ANY(roles))
         RETURNING *`,
        [did, role],
      );

      if (result.rowCount === 0) {
        // Either the user does not exist or already has the role
        const existsResult = await deps.pgPool.query('SELECT did FROM users WHERE did = $1', [did]);
        if (existsResult.rowCount === 0) {
          const err = new NotFoundError('User', did);
          return c.json({ error: err.code, message: err.message }, 404);
        }
        // User exists but already has the role; return success
        const userResult = await deps.pgPool.query('SELECT * FROM users WHERE did = $1', [did]);
        return c.json(rowToView(userResult.rows[0] as UserRow));
      }

      return c.json(rowToView(result.rows[0] as UserRow));
    } catch (err) {
      return c.json(
        { error: 'DATABASE_ERROR', message: `Failed to add role: ${(err as Error).message}` },
        500,
      );
    }
  });

  /**
   * Remove a role from a user.
   *
   * DELETE /admin/v1/users/:did/roles/:role
   */
  app.delete('/admin/v1/users/:did/roles/:role', async (c) => {
    const did = c.req.param('did');
    const role = c.req.param('role');

    if (!VALID_ROLES.has(role)) {
      const err = new ValidationError(
        `Invalid role: ${role}. Valid roles: ${[...VALID_ROLES].join(', ')}`,
        'role',
        'enum',
      );
      return c.json({ error: err.code, message: err.message }, 400);
    }

    try {
      const tableCheck = await deps.pgPool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'users'
        ) AS exists`,
      );

      if (!(tableCheck.rows[0] as { exists: boolean }).exists) {
        const err = new NotFoundError('User', did);
        return c.json({ error: err.code, message: err.message }, 404);
      }

      const result = await deps.pgPool.query(
        `UPDATE users SET roles = array_remove(roles, $2)
         WHERE did = $1
         RETURNING *`,
        [did, role],
      );

      if (result.rowCount === 0) {
        const err = new NotFoundError('User', did);
        return c.json({ error: err.code, message: err.message }, 404);
      }

      return c.json(rowToView(result.rows[0] as UserRow));
    } catch (err) {
      return c.json(
        { error: 'DATABASE_ERROR', message: `Failed to remove role: ${(err as Error).message}` },
        500,
      );
    }
  });
}

export { usersAdminRoutes };
export type { UsersAdminDependencies, UserView };
