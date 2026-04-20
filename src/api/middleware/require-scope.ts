/**
 * Middleware and helpers for enforcing atproto permission scopes on XRPC
 * endpoints.
 *
 * Place {@link scopeEnforcer} once after `authenticate()` at router
 * construction time, supplying the appview's DID + service fragment (the
 * value that every Layers-emitted `include:` uses for `aud`). Individual
 * handlers then call {@link requireRpc}, {@link requireRepo}, or
 * {@link requireBlob} at the top of their body to assert the session holds
 * the matching permission.
 *
 * The enforcer memoises each session's resolved {@link SessionPermissions}
 * per request so each protected handler pays only one parser/resolver
 * invocation per request, and the resolver itself caches permission-set
 * Lexicons for 24h per the spec.
 *
 * @module
 */

import type { Context, MiddlewareHandler } from 'hono';

import {
  buildSessionPermissions,
  type AccessCheck,
  type AccessDecision,
  type PermissionSetResolver,
  SessionPermissions,
} from '../../auth/permissions/index.js';
import { createLogger } from '../../observability/logger.js';

const logger = createLogger({ service: 'scope-enforcer' });

interface EnforcerConfig {
  /** The appview audience — used to fill `aud=*` matches for rpc permissions. */
  readonly appviewAudience: string;
  readonly resolver: PermissionSetResolver;
}

type RequireFn = (c: Context, check: AccessCheck) => AccessDecision;

const REQUIRE_KEY = 'scopeRequire';

/**
 * Installs the scope-enforcer on a Hono app. Every handler downstream can
 * call `c.get('scopeRequire')(check)` to assert the current session has the
 * permission. Unauthenticated requests receive a decision with
 * `allowed: false` and `reason: 'no-matching-scope'`.
 */
export function scopeEnforcer(config: EnforcerConfig): MiddlewareHandler {
  return async (c, next) => {
    const cache = new Map<string, Promise<SessionPermissions>>();
    const require: RequireFn = (ctx, check) => {
      const auth = ctx.get('auth') as
        | { readonly authenticated: boolean; readonly scopes: readonly string[]; readonly did: string | null }
        | undefined;
      if (!auth?.authenticated || auth.scopes.length === 0) {
        return { allowed: false, reason: 'no-matching-scope' };
      }
      const raw = auth.scopes.join(' ');
      let promise = cache.get(raw);
      if (!promise) {
        promise = buildSessionPermissions(raw, config.resolver);
        cache.set(raw, promise);
      }
      // We require handlers to await the permissions explicitly — but the
      // common case is that the cached promise is already settled, so we
      // expose a synchronous decision path by pre-resolving in the middleware.
      // Use the sentinel attached below in `preloadPermissions`.
      const preloaded = ctx.get(PRELOADED_KEY) as Map<string, SessionPermissions> | undefined;
      const sp = preloaded?.get(raw);
      if (!sp) {
        logger.warn('scopeRequire called before permissions preload completed', {
          did: auth.did,
        });
        return { allowed: false, reason: 'no-matching-scope' };
      }
      return sp.check(check);
    };
    c.set(REQUIRE_KEY, require);
    c.set(ENFORCER_CONFIG_KEY, config);

    // Preload the session permissions so require() can be synchronous.
    const auth = c.get('auth') as
      | { readonly authenticated: boolean; readonly scopes: readonly string[] }
      | undefined;
    if (auth?.authenticated && auth.scopes.length > 0) {
      const raw = auth.scopes.join(' ');
      try {
        const sp = await buildSessionPermissions(raw, config.resolver);
        const map = new Map<string, SessionPermissions>();
        map.set(raw, sp);
        c.set(PRELOADED_KEY, map);
      } catch (err) {
        logger.error('Failed to resolve permission sets for session', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    await next();
  };
}

const PRELOADED_KEY = 'scopePreloaded';
const ENFORCER_CONFIG_KEY = 'scopeEnforcerConfig';

function require(c: Context, check: AccessCheck): AccessDecision {
  const fn = c.get(REQUIRE_KEY) as RequireFn | undefined;
  if (!fn) {
    logger.error('scopeEnforcer middleware missing from this route');
    return { allowed: false, reason: 'no-matching-scope' };
  }
  return fn(c, check);
}

/** Denies the request with a structured 403 response. */
export function denyResponse(c: Context, check: AccessCheck, decision: AccessDecision): Response {
  return c.json(
    {
      error: 'InsufficientScope',
      message: describe(check),
      reason: decision.reason ?? 'no-matching-scope',
    },
    403,
  );
}

/**
 * Assert the session holds a matching `rpc` permission.
 *
 * `lxm` is the NSID of the endpoint being invoked; the middleware infers
 * `aud` from the configured appview audience.
 */
export function requireRpc(c: Context, lxm: string): AccessDecision {
  const cfg = c.get(ENFORCER_CONFIG_KEY) as EnforcerConfig | undefined;
  if (!cfg) return { allowed: false, reason: 'no-matching-scope' };
  return require(c, { kind: 'rpc', lxm, aud: cfg.appviewAudience });
}

export function requireRepo(
  c: Context,
  collection: string,
  action: 'create' | 'update' | 'delete',
): AccessDecision {
  return require(c, { kind: 'repo', collection, action });
}

export function requireBlob(c: Context, mimeType: string): AccessDecision {
  return require(c, { kind: 'blob', mimeType });
}

export function requireAccount(
  c: Context,
  attr: 'email' | 'repo',
  action: 'read' | 'manage',
): AccessDecision {
  return require(c, { kind: 'account', attr, action });
}

export function requireIdentity(c: Context, attr: 'handle' | '*'): AccessDecision {
  return require(c, { kind: 'identity', attr });
}

function describe(check: AccessCheck): string {
  switch (check.kind) {
    case 'rpc':
      return `Missing scope for rpc call ${check.lxm} (aud=${check.aud})`;
    case 'repo':
      return `Missing scope for ${check.action} on ${check.collection}`;
    case 'blob':
      return `Missing scope for blob upload of type ${check.mimeType}`;
    case 'account':
      return `Missing scope for account.${check.attr} action=${check.action}`;
    case 'identity':
      return `Missing scope for identity.${check.attr}`;
  }
}
