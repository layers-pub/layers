/**
 * Runtime enforcement of atproto permissions.
 *
 * After OAuth, a session carries a list of {@link Scope}s granted by the
 * authorization server. Every protected operation (record write, XRPC call,
 * blob upload, account/identity change) consults this module to decide
 * whether the session is allowed to proceed.
 *
 * The enforcer expands `include:` references using a
 * {@link PermissionSetResolver} at session-start time, caching the expanded
 * permissions on the session. Subsequent checks run against the expanded
 * list and are O(scope-count) — no re-fetching.
 *
 * @module
 */

import {
  expandPermissionSet,
  type PermissionSetResolver,
} from './permission-set-resolver.js';
import { parseScopeList } from './scope-string.js';
import type {
  AccountAction,
  AccountAttr,
  IdentityAttr,
  Permission,
  RepoAction,
  Scope,
} from './types.js';

export interface AccessCheckRepo {
  readonly kind: 'repo';
  readonly collection: string;
  readonly action: RepoAction;
}

export interface AccessCheckRpc {
  readonly kind: 'rpc';
  readonly lxm: string;
  readonly aud: string;
}

export interface AccessCheckBlob {
  readonly kind: 'blob';
  readonly mimeType: string;
}

export interface AccessCheckIdentity {
  readonly kind: 'identity';
  readonly attr: IdentityAttr;
}

export interface AccessCheckAccount {
  readonly kind: 'account';
  readonly attr: AccountAttr;
  readonly action: AccountAction;
}

export type AccessCheck =
  | AccessCheckRepo
  | AccessCheckRpc
  | AccessCheckBlob
  | AccessCheckIdentity
  | AccessCheckAccount;

export type AccessDenialReason =
  | 'no-matching-scope'
  | 'wildcard-aud-not-allowed-for-check'
  | 'transition-scope-not-honored';

export interface AccessDecision {
  readonly allowed: boolean;
  readonly reason?: AccessDenialReason;
  /** The permission that authorized the request, if allowed. */
  readonly matched?: Permission;
}

/**
 * Granted permissions for a live session. Produced once at session start from
 * the raw OAuth `scope` string plus a {@link PermissionSetResolver}.
 */
export class SessionPermissions {
  readonly atprotoLogin: boolean;
  readonly transitionGeneric: boolean;
  readonly permissions: readonly Permission[];

  constructor(scopes: readonly Scope[], expandedPermissions: readonly Permission[]) {
    this.atprotoLogin = scopes.some((s) => s.type === 'atproto');
    this.transitionGeneric = scopes.some(
      (s) => s.type === 'transition' && s.variant === 'generic',
    );
    this.permissions = expandedPermissions;
  }

  check(req: AccessCheck): AccessDecision {
    // Transition-generic grants broad access but is deliberately NOT honored
    // by Layers' enforcement path: clients must request granular scopes to
    // interact with `pub.layers.*` resources.
    if (this.transitionGeneric && !this.permissions.length) {
      return { allowed: false, reason: 'transition-scope-not-honored' };
    }

    for (const perm of this.permissions) {
      if (matches(perm, req)) {
        return { allowed: true, matched: perm };
      }
    }
    return { allowed: false, reason: 'no-matching-scope' };
  }

  /** Convenience: list every collection the session can write to. */
  writableCollections(): Set<string> {
    const out = new Set<string>();
    for (const p of this.permissions) {
      if (p.resource !== 'repo') continue;
      for (const c of p.collection) out.add(c);
    }
    return out;
  }
}

/**
 * Parses a raw OAuth scope string, resolves every `include:` reference, and
 * returns a {@link SessionPermissions} ready for runtime checks.
 */
export async function buildSessionPermissions(
  rawScope: string,
  resolver: PermissionSetResolver,
): Promise<SessionPermissions> {
  const scopes = parseScopeList(rawScope);
  const expanded: Permission[] = [];
  for (const scope of scopes) {
    if (scope.type === 'permission') {
      expanded.push(scope);
    } else if (scope.type === 'include') {
      const resolved = await resolver.resolve(scope.nsid);
      expanded.push(...expandPermissionSet(resolved, scope.aud));
    }
  }
  return new SessionPermissions(scopes, expanded);
}

// ---------------------------------------------------------------------------
// Matcher.

function matches(perm: Permission, req: AccessCheck): boolean {
  switch (req.kind) {
    case 'repo':
      return (
        perm.resource === 'repo' &&
        nsidMatches(perm.collection, req.collection) &&
        actionMatches(perm.action, req.action)
      );
    case 'rpc':
      return (
        perm.resource === 'rpc' &&
        nsidMatches(perm.lxm, req.lxm) &&
        audMatches(perm.aud, req.aud)
      );
    case 'blob':
      return perm.resource === 'blob' && mimeMatchesAny(perm.accept, req.mimeType);
    case 'identity':
      return (
        perm.resource === 'identity' &&
        (perm.attr === '*' || perm.attr === req.attr)
      );
    case 'account':
      return (
        perm.resource === 'account' &&
        perm.attr === req.attr &&
        accountActionMatches(perm.action, req.action)
      );
  }
}

function nsidMatches(patterns: readonly string[], candidate: string): boolean {
  for (const p of patterns) {
    if (p === '*' || p === candidate) return true;
  }
  return false;
}

function actionMatches(
  allowed: readonly RepoAction[] | undefined,
  requested: RepoAction,
): boolean {
  if (!allowed) return true;
  return allowed.includes(requested);
}

function accountActionMatches(
  allowed: AccountAction | undefined,
  requested: AccountAction,
): boolean {
  if (!allowed) {
    // Default per spec: when omitted the permission grants only `read`.
    return requested === 'read';
  }
  if (allowed === 'manage') return true;
  return requested === 'read';
}

function audMatches(permAud: string | undefined, requested: string): boolean {
  if (permAud === '*') return true;
  return permAud === requested;
}

function mimeMatchesAny(patterns: readonly string[], mime: string): boolean {
  for (const pattern of patterns) {
    if (mimeMatchesOne(pattern, mime)) return true;
  }
  return false;
}

function mimeMatchesOne(pattern: string, mime: string): boolean {
  const [pt, ps] = pattern.split('/');
  const [mt, ms] = mime.split('/');
  if (!pt || !ps || !mt || !ms) return false;
  const typeMatches = pt === '*' || pt === mt;
  const subtypeMatches = ps === '*' || ps === ms;
  return typeMatches && subtypeMatches;
}
