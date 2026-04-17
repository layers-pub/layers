/**
 * Generic XRPC method map.
 *
 * One function produces every `pub.layers.*` list + get + (optional) search
 * endpoint by reading the generated backend registry. Per-record handler
 * files (`persona/index.ts`, `corpus/index.ts`, ...) are no longer required:
 * the registry tells us which services exist, which params they accept, and
 * which search filters are valid.
 *
 * @module
 */

import { z, type ZodType } from 'zod';

import { backendRecordKinds, type BackendParamMeta } from '../../../generated/record-registry.js';
import type { XRPCMethodMap } from '../../xrpc/types.js';
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
 * Returns an XRPC method map covering every list + get endpoint declared by
 * the lexicons. Callers compose this with any bespoke-endpoint maps (search,
 * admin, etc.) into the final app registration.
 */
export function genericRecordMethods(): XRPCMethodMap {
  const methods: XRPCMethodMap = {};

  for (const kind of backendRecordKinds) {
    const serviceKey = serviceKeyForSlug(kind.slug);

    if (kind.getEndpoint) {
      methods[kind.getEndpoint] = {
        handler: createGetHandler(serviceKey, getParamsSchema),
        auth: 'none',
      };
    }

    if (kind.listEndpoint) {
      methods[kind.listEndpoint] = {
        handler: createListHandler(serviceKey, listParamsSchema(kind.listParams)),
        auth: 'none',
      };
    }
  }

  return methods;
}

/**
 * Builds an XRPC method map for every `searchXxx` endpoint declared in the
 * lexicon corpus. Unlike list/get which are present for every record kind,
 * search endpoints only exist for a subset; this scans the registry for
 * matching endpoints at callsite.
 *
 * The search method on the service follows the naming convention
 * `search${SlugPascalPlural}`.
 */
export function genericSearchMethods(searchEndpoints: ReadonlyMap<string, string>): XRPCMethodMap {
  const methods: XRPCMethodMap = {};
  for (const [nsid, methodName] of searchEndpoints) {
    // Reuse the generic search schema: `q` + `limit` + `cursor` + any
    // extra params (kept as optional strings) will pass through as filters.
    const schema = z.object({
      q: z.string().min(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    });
    // Derive the service key from the NSID's penultimate segment. E.g.
    // `pub.layers.persona.searchPersonas` → PersonaService.
    const parts = nsid.split('.');
    const domain = parts[parts.length - 2] ?? '';
    const serviceKey = `${domain.charAt(0).toUpperCase()}${domain.slice(1)}Service`;
    methods[nsid] = {
      handler: createSearchHandler(serviceKey, schema, methodName),
      auth: 'none',
    };
  }
  return methods;
}
