/**
 * Factory functions for generating XRPC handlers from Zod schemas.
 *
 * Eliminates per-endpoint boilerplate. Each factory returns a handler
 * that resolves a service from the DI container, validates query params,
 * and calls the appropriate service method.
 *
 * @module
 */

import type { Context } from 'hono';
import type { DependencyContainer } from 'tsyringe';
import type { ZodType } from 'zod';

/**
 * Creates an XRPC handler for fetching a single record by URI.
 *
 * The resolved service must have a `getByUri(uri: string)` method
 * returning `Result<TView, LayersError>`.
 *
 * @param serviceKey - the DI container key for the service
 * @param paramsSchema - Zod schema with a `uri` field
 */
function createGetHandler(
  serviceKey: string,
  paramsSchema: ZodType,
): (c: Context) => Promise<Response> {
  return async (c: Context): Promise<Response> => {
    const container = c.get('container') as DependencyContainer;
    const service = container.resolve<{
      getByUri(
        uri: string,
      ): Promise<{ ok: boolean; value?: unknown; error?: { code: string; message: string } }>;
    }>(serviceKey);

    const parsed = paramsSchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ error: 'InvalidRequest', message: 'Missing or invalid uri parameter' }, 400);
    }

    const { uri } = parsed.data as { uri: string };
    const result = await service.getByUri(uri);
    if (!result.ok) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      return c.json({ error: result.error?.code, message: result.error?.message }, status);
    }

    return c.json(result.value);
  };
}

/**
 * Creates an XRPC handler for listing records by repo DID.
 *
 * The resolved service must have a `listByRepo(repo, limit, cursor?)` method
 * returning `Result<{ records, cursor? }, LayersError>`.
 *
 * @param serviceKey - the DI container key for the service
 * @param paramsSchema - Zod schema with `repo`, `limit`, and optional `cursor` fields
 */
function createListHandler(
  serviceKey: string,
  paramsSchema: ZodType,
): (c: Context) => Promise<Response> {
  return async (c: Context): Promise<Response> => {
    const container = c.get('container') as DependencyContainer;
    const service = container.resolve<{
      listByRepo(
        repo: string,
        limit: number,
        cursor?: string,
      ): Promise<{ ok: boolean; value?: unknown; error?: { code: string; message: string } }>;
      listAll(
        limit: number,
        cursor?: string,
      ): Promise<{ ok: boolean; value?: unknown; error?: { code: string; message: string } }>;
    }>(serviceKey);

    const parsed = paramsSchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ error: 'InvalidRequest', message: 'Missing or invalid parameters' }, 400);
    }

    const { repo, limit, cursor } = parsed.data as {
      repo?: string;
      limit: number;
      cursor?: string;
    };

    const result = repo
      ? await service.listByRepo(repo, limit, cursor)
      : await service.listAll(limit, cursor);

    if (!result.ok) {
      return c.json({ error: result.error?.code, message: result.error?.message }, 500);
    }

    return c.json(result.value);
  };
}

/**
 * Creates an XRPC handler for searching records.
 *
 * The resolved service must have a method named by `searchMethod` accepting
 * `(query, filters, limit, cursor?)` and returning
 * `Result<{ records, total, cursor? }, LayersError>`.
 *
 * @param serviceKey - the DI container key for the service
 * @param paramsSchema - Zod schema with `q`, optional filter fields, `limit`, and optional `cursor`
 * @param searchMethod - the name of the search method on the service
 */
function createSearchHandler(
  serviceKey: string,
  paramsSchema: ZodType,
  searchMethod: string,
): (c: Context) => Promise<Response> {
  return async (c: Context): Promise<Response> => {
    const container = c.get('container') as DependencyContainer;
    const service = container.resolve<Record<string, unknown>>(serviceKey);

    const parsed = paramsSchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ error: 'InvalidRequest', message: 'Missing or invalid parameters' }, 400);
    }

    const { q, limit, cursor, ...filters } = parsed.data as {
      q: string;
      limit: number;
      cursor?: string;
      [key: string]: unknown;
    };

    const method = service[searchMethod] as (
      query: string,
      filters: Record<string, unknown>,
      limit: number,
      cursor?: string,
    ) => Promise<{ ok: boolean; value?: unknown; error?: { code: string; message: string } }>;

    const result = await method.call(service, q, filters, limit, cursor);
    if (!result.ok) {
      return c.json({ error: result.error?.code, message: result.error?.message }, 500);
    }

    return c.json(result.value);
  };
}

export { createGetHandler, createListHandler, createSearchHandler };
