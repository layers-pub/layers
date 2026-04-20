/**
 * Generic XRPC method map.
 *
 * One function produces every `pub.layers.*` list + get + (optional) search
 * endpoint by reading the generated backend registry. Every endpoint is
 * wrapped so the request must either be anonymous (we still allow anonymous
 * reads while the permission model rolls out) OR carry an rpc permission
 * whose `lxm` matches the endpoint NSID and whose `aud` matches the
 * configured appview audience.
 *
 * @module
 */

import type { Context } from 'hono';
import { z, type ZodType } from 'zod';

import { backendRecordKinds, type BackendParamMeta } from '../../../generated/record-registry.js';
import { denyResponse, requireRpc } from '../../middleware/require-scope.js';
import type { XRPCMethod, XRPCMethodMap } from '../../xrpc/types.js';
import { createGetHandler, createListHandler, createSearchHandler } from './handler-factories.js';

/**
 * Builds a zod schema for a list endpoint from its lexicon-declared params.
 */
function listParamsSchema(params: readonly BackendParamMeta[]): ZodType {
  const shape: Record<string, ZodType> = {};
  for (const p of params) {
    if (p.name === 'limit') {
      shape.limit = z.coerce.number().int().min(1).max(100).default(50);
      continue;
    }
    if (p.name === 'cursor') {
      shape.cursor = z.string().optional();
      continue;
    }
    const base = p.type === 'number' ? z.coerce.number() : z.string().min(1);
    shape[p.name] = p.required ? base : base.optional();
  }
  return z.object(shape);
}

const getParamsSchema = z.object({ uri: z.string().min(1) });

/**
 * Maps a record slug to the DI container key used by the service layer.
 * Generated services register under `${PascalKind}Service`.
 */
function serviceKeyForSlug(slug: string): string {
  const pascal = slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return `${pascal}Service`;
}

/**
 * Wraps a handler so authenticated requests must carry an rpc scope whose
 * `lxm` matches the endpoint NSID; anonymous requests pass through
 * unchanged. This is the spec-compliant behaviour for GET endpoints: public
 * reads are allowed, but an authenticated call that claims only
 * `atproto` (and no rpc scope for the endpoint) is a 403.
 */
function withScope(
  nsid: string,
  inner: (c: Context) => Promise<Response>,
): (c: Context) => Promise<Response> {
  return async (c) => {
    const auth = c.get('auth') as { readonly authenticated: boolean } | undefined;
    if (auth?.authenticated) {
      const decision = requireRpc(c, nsid);
      if (!decision.allowed) {
        return denyResponse(c, { kind: 'rpc', lxm: nsid, aud: '' }, decision);
      }
    }
    return inner(c);
  };
}

/**
 * Returns an XRPC method map covering every list + get endpoint declared by
 * the lexicons. Callers compose this with any bespoke-endpoint maps (search,
 * admin, etc.) into the final app registration.
 */
export function genericRecordMethods(): XRPCMethodMap {
  const methods: XRPCMethodMap = {};

  for (const kind of backendRecordKinds) {
    const serviceKey = serviceKeyForSlug(kind.slug);

    if (kind.getEndpoint) {
      const nsid = kind.getEndpoint;
      const method: XRPCMethod = {
        handler: withScope(nsid, createGetHandler(serviceKey, getParamsSchema)),
        auth: 'optional',
      };
      methods[nsid] = method;
    }

    if (kind.listEndpoint) {
      const nsid = kind.listEndpoint;
      const method: XRPCMethod = {
        handler: withScope(nsid, createListHandler(serviceKey, listParamsSchema(kind.listParams))),
        auth: 'optional',
      };
      methods[nsid] = method;
    }
  }

  return methods;
}

/**
 * Builds an XRPC method map for every `searchXxx` endpoint declared in the
 * lexicon corpus.
 */
export function genericSearchMethods(searchEndpoints: ReadonlyMap<string, string>): XRPCMethodMap {
  const methods: XRPCMethodMap = {};
  for (const [nsid, methodName] of searchEndpoints) {
    const schema = z.object({
      q: z.string().min(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    });
    const parts = nsid.split('.');
    const domain = parts[parts.length - 2] ?? '';
    const serviceKey = `${domain.charAt(0).toUpperCase()}${domain.slice(1)}Service`;
    methods[nsid] = {
      handler: withScope(nsid, createSearchHandler(serviceKey, schema, methodName)),
      auth: 'optional',
    };
  }
  return methods;
}
