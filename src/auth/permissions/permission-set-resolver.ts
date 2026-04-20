/**
 * Resolver and cache for permission-set Lexicons.
 *
 * An authorization server fetches a permission-set Lexicon by NSID, validates
 * the namespace-authority rule (a set may only address resources under the
 * same NSID hierarchy as itself), parses each entry via
 * {@link parsePermissionSetBody}, and caches the result with the spec's
 * recommended cache policy:
 *
 *   - stale     — refresh after 24h; on failure, keep serving the stale value.
 *   - expires   — treat entries older than 90d as unusable for **new**
 *                 sessions. Existing sessions bound to an older snapshot are
 *                 not invalidated.
 *
 * The resolver is store-agnostic: the caller supplies a {@link LexiconFetcher}
 * that reads a Lexicon document by NSID. In production this is an ATProto
 * Lexicon resolver with cryptographic verification; in tests it is a map.
 *
 * @module
 */

import { parsePermissionSetBody } from './scope-string.js';
import type { Permission, ResolvedPermissionSet } from './types.js';

/** Recommended cache policy from https://atproto.com/specs/permission */
const STALE_MS = 24 * 60 * 60 * 1000;
const EXPIRES_MS = 90 * 24 * 60 * 60 * 1000;

/** Shape of a permission-set Lexicon document. */
export interface PermissionSetDocument {
  readonly lexicon: 1;
  readonly id: string;
  readonly defs: {
    readonly main: {
      readonly type: 'permission-set';
      readonly title?: string;
      readonly detail?: string;
      readonly 'title:lang'?: Readonly<Record<string, string>>;
      readonly 'detail:lang'?: Readonly<Record<string, string>>;
      readonly permissions: readonly unknown[];
    };
  };
}

export type LexiconFetcher = (nsid: string) => Promise<PermissionSetDocument>;

export interface PermissionSetCacheEntry {
  readonly resolved: ResolvedPermissionSet;
  readonly fetchedAt: number;
}

export interface PermissionSetCache {
  get(nsid: string): Promise<PermissionSetCacheEntry | undefined>;
  set(nsid: string, entry: PermissionSetCacheEntry): Promise<void>;
}

export class PermissionSetResolutionError extends Error {
  constructor(
    readonly nsid: string,
    message: string,
  ) {
    super(`could not resolve permission set '${nsid}': ${message}`);
    this.name = 'PermissionSetResolutionError';
  }
}

export class InMemoryPermissionSetCache implements PermissionSetCache {
  private readonly store = new Map<string, PermissionSetCacheEntry>();
  async get(nsid: string): Promise<PermissionSetCacheEntry | undefined> {
    return this.store.get(nsid);
  }
  async set(nsid: string, entry: PermissionSetCacheEntry): Promise<void> {
    this.store.set(nsid, entry);
  }
}

export interface ResolverDeps {
  readonly fetcher: LexiconFetcher;
  readonly cache?: PermissionSetCache;
  readonly now?: () => number;
}

/**
 * Reads a permission-set Lexicon, caches the parsed result, and enforces the
 * namespace-authority rule. Returns a resolved set with concrete permissions
 * (before any `inheritAud` substitution — substitution happens at the call
 * site, which knows the enclosing `include:`'s `aud`).
 */
export class PermissionSetResolver {
  private readonly fetcher: LexiconFetcher;
  private readonly cache: PermissionSetCache;
  private readonly now: () => number;

  constructor(deps: ResolverDeps) {
    this.fetcher = deps.fetcher;
    this.cache = deps.cache ?? new InMemoryPermissionSetCache();
    this.now = deps.now ?? Date.now;
  }

  async resolve(nsid: string): Promise<ResolvedPermissionSet> {
    const cached = await this.cache.get(nsid);
    const now = this.now();
    if (cached && now - cached.fetchedAt < STALE_MS) {
      return cached.resolved;
    }

    let doc: PermissionSetDocument;
    try {
      doc = await this.fetcher(nsid);
    } catch (err) {
      if (cached) {
        // Keep serving the stale value on transient fetch failures.
        if (now - cached.fetchedAt < EXPIRES_MS) return cached.resolved;
      }
      throw new PermissionSetResolutionError(
        nsid,
        err instanceof Error ? err.message : String(err),
      );
    }

    const resolved = parsePermissionSetDocument(doc, nsid);
    await this.cache.set(nsid, { resolved, fetchedAt: now });
    return resolved;
  }
}

/**
 * Validates a document, enforces namespace authority, and parses every
 * permission entry. Exported for unit tests and for callers that want to
 * validate a locally-authored Lexicon without a fetcher.
 */
export function parsePermissionSetDocument(
  doc: PermissionSetDocument,
  expectedNsid: string,
): ResolvedPermissionSet {
  if (doc.lexicon !== 1) {
    throw new PermissionSetResolutionError(expectedNsid, 'unsupported lexicon version');
  }
  if (doc.id !== expectedNsid) {
    throw new PermissionSetResolutionError(
      expectedNsid,
      `document id '${doc.id}' does not match requested NSID`,
    );
  }
  const main = doc.defs?.main;
  if (!main || main.type !== 'permission-set') {
    throw new PermissionSetResolutionError(expectedNsid, 'defs.main must be permission-set');
  }
  const { permissions, rejected } = parsePermissionSetBody(expectedNsid, main.permissions);
  for (const p of permissions) enforceNamespaceAuthority(expectedNsid, p);

  if (rejected.length > 0 && permissions.length === 0) {
    throw new PermissionSetResolutionError(
      expectedNsid,
      `every permission entry rejected: ${rejected.join('; ')}`,
    );
  }

  const out: ResolvedPermissionSet = {
    nsid: expectedNsid,
    title: main.title ?? expectedNsid,
    detail: main.detail ?? '',
    ...(main['title:lang'] !== undefined ? { titleByLang: main['title:lang'] } : {}),
    ...(main['detail:lang'] !== undefined ? { detailByLang: main['detail:lang'] } : {}),
    permissions,
  };
  return out;
}

/**
 * Enforces namespace authority: a permission in a set may only reference a
 * resource under the same NSID hierarchy as the set's own NSID (children or
 * self, never siblings or parents). See
 * https://atproto.com/specs/permission#namespace-authority.
 */
export function enforceNamespaceAuthority(setNsid: string, perm: Permission): void {
  const owner = namespaceOwner(setNsid);
  const check = (targetNsid: string): void => {
    if (!isUnderNamespace(owner, targetNsid)) {
      throw new PermissionSetResolutionError(
        setNsid,
        `permission references '${targetNsid}' which is outside the set's namespace`,
      );
    }
  };
  if (perm.resource === 'repo') {
    for (const c of perm.collection) check(c);
  } else if (perm.resource === 'rpc') {
    for (const l of perm.lxm) check(l);
  }
}

/**
 * Returns the NSID "owner" (all segments except the final leaf). The
 * namespace-authority rule is that a set at `pkg.name.authFoo` owns the
 * `pkg.name.*` subtree; children `pkg.name.foo.bar` also belong to it.
 */
export function namespaceOwner(nsid: string): string {
  const dot = nsid.lastIndexOf('.');
  return dot === -1 ? nsid : nsid.slice(0, dot);
}

export function isUnderNamespace(owner: string, candidate: string): boolean {
  return candidate === owner || candidate.startsWith(`${owner}.`);
}

/**
 * Substitutes `inheritAud` permissions in a set with a concrete `aud` from
 * the invoking `include:`. Returns the expanded permission list. Throws if a
 * permission requires inheritAud but the caller did not supply an `aud`.
 */
export function expandPermissionSet(
  resolved: ResolvedPermissionSet,
  includeAud: string | undefined,
): Permission[] {
  const out: Permission[] = [];
  for (const perm of resolved.permissions) {
    if (perm.resource === 'rpc' && perm.inheritAud) {
      if (!includeAud) {
        // Spec: ignore the permission if inheritAud is true but no aud is supplied.
        continue;
      }
      const expanded: Permission = {
        type: 'permission',
        resource: 'rpc',
        lxm: perm.lxm,
        aud: includeAud,
      };
      out.push(expanded);
    } else {
      out.push(perm);
    }
  }
  return out;
}
