/**
 * Typed permission model for atproto OAuth scopes.
 *
 * Mirrors the resource/parameter taxonomy from the permission specification
 * (https://atproto.com/specs/permission) exactly:
 *
 * - `repo`      — write access to records, attenuated by collection + action.
 * - `rpc`       — authenticated API calls, attenuated by lxm + aud (+ inheritAud in sets).
 * - `blob`      — media uploads, attenuated by MIME accept patterns.
 * - `identity`  — DID document and handle, attenuated by attr.
 * - `account`   — PDS hosting attributes, attenuated by attr + action.
 * - `include`   — reference to a permission set (NSID + optional aud).
 *
 * `blob`, `identity`, and `account` cannot be bundled inside permission sets.
 * The parser rejects such placement; the resolver rejects them at resolution
 * time as a second line of defence.
 *
 * @module
 */

export type RepoAction = 'create' | 'update' | 'delete';
export type AccountAction = 'read' | 'manage';
export type AccountAttr = 'email' | 'repo';
export type IdentityAttr = 'handle' | '*';

export interface RepoPermission {
  readonly type: 'permission';
  readonly resource: 'repo';
  /** NSID(s); `['*']` is the full-wildcard form allowed only outside sets. */
  readonly collection: readonly string[];
  readonly action?: readonly RepoAction[];
}

export interface RpcPermission {
  readonly type: 'permission';
  readonly resource: 'rpc';
  /** NSID(s); `['*']` is allowed only when `aud` is concrete. */
  readonly lxm: readonly string[];
  /**
   * DID service reference (`did:web:api.example.com#service`). Required in
   * scope-string form; optional in sets when `inheritAud` is true.
   */
  readonly aud?: string;
  /** Set-only: inherit `aud` from the enclosing `include:`. */
  readonly inheritAud?: boolean;
}

export interface BlobPermission {
  readonly type: 'permission';
  readonly resource: 'blob';
  readonly accept: readonly string[];
}

export interface IdentityPermission {
  readonly type: 'permission';
  readonly resource: 'identity';
  readonly attr: IdentityAttr;
}

export interface AccountPermission {
  readonly type: 'permission';
  readonly resource: 'account';
  readonly attr: AccountAttr;
  readonly action?: AccountAction;
}

export type Permission =
  | RepoPermission
  | RpcPermission
  | BlobPermission
  | IdentityPermission
  | AccountPermission;

/** A reference to a permission set, usable only as a top-level scope string. */
export interface IncludeReference {
  readonly type: 'include';
  /** NSID of the permission-set Lexicon. */
  readonly nsid: string;
  /** Audience to pass down to `rpc` permissions whose `inheritAud` is true. */
  readonly aud?: string;
}

/** The `atproto` sentinel requested by every client (identity-only login). */
export interface AtprotoScope {
  readonly type: 'atproto';
}

/**
 * Legacy transitional scopes. Still accepted by authorization servers but
 * deliberately excluded from Layers' client metadata.
 */
export interface TransitionScope {
  readonly type: 'transition';
  readonly variant: 'generic' | 'chat.bsky' | 'email';
}

/** Any top-level element of an OAuth `scope` string. */
export type Scope = Permission | IncludeReference | AtprotoScope | TransitionScope;

/** Permissions that are not allowed inside permission-set declarations. */
export const SET_EXCLUDED_RESOURCES = new Set<Permission['resource']>([
  'blob',
  'identity',
  'account',
]);

/**
 * Resolved permission set: the Lexicon-declared metadata plus the expanded
 * list of concrete permissions after `inheritAud` substitution.
 */
export interface ResolvedPermissionSet {
  readonly nsid: string;
  readonly title: string;
  readonly detail: string;
  readonly titleByLang?: Readonly<Record<string, string>>;
  readonly detailByLang?: Readonly<Record<string, string>>;
  readonly permissions: readonly Permission[];
}
