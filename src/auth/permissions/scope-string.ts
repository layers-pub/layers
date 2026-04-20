/**
 * Parser and serializer for atproto OAuth scope strings.
 *
 * The grammar is specified in https://atproto.com/specs/permission#scope-string-syntax.
 *
 *   scope           := "atproto"
 *                    | "transition:" transition
 *                    | resource (":" positional)? ("?" params)?
 *                    | "include:" nsid ("?" params)?
 *   resource        := "repo" | "rpc" | "blob" | "account" | "identity"
 *   positional      := any run of non-"?" characters (percent-encoded allowed)
 *   params          := param ("&" param)*
 *   param           := name ("=" value)?
 *
 * The parser is strict about semantics: percent-encoded values are decoded,
 * positional parameters cannot coexist with their named equivalent, and
 * wildcards are rejected on resources that do not allow them.
 *
 * @module
 */

import {
  SET_EXCLUDED_RESOURCES,
  type AccountAction,
  type AccountAttr,
  type IdentityAttr,
  type IncludeReference,
  type Permission,
  type RepoAction,
  type Scope,
} from './types.js';

const REPO_ACTIONS: ReadonlySet<RepoAction> = new Set(['create', 'update', 'delete']);
const ACCOUNT_ACTIONS: ReadonlySet<AccountAction> = new Set(['read', 'manage']);
const ACCOUNT_ATTRS: ReadonlySet<AccountAttr> = new Set(['email', 'repo']);

export class ScopeParseError extends Error {
  constructor(
    message: string,
    readonly source: string,
  ) {
    super(`invalid scope '${source}': ${message}`);
    this.name = 'ScopeParseError';
  }
}

/**
 * Parses a single scope string. Use {@link parseScopeList} for a full OAuth
 * `scope` value.
 */
export function parseScopeString(input: string): Scope {
  if (input.length === 0) {
    throw new ScopeParseError('empty scope', input);
  }
  if (input === 'atproto') {
    return { type: 'atproto' };
  }
  if (input.startsWith('transition:')) {
    const variant = input.slice('transition:'.length);
    if (variant !== 'generic' && variant !== 'chat.bsky' && variant !== 'email') {
      throw new ScopeParseError(`unknown transition variant '${variant}'`, input);
    }
    return { type: 'transition', variant };
  }

  const qIndex = input.indexOf('?');
  const head = qIndex === -1 ? input : input.slice(0, qIndex);
  const query = qIndex === -1 ? '' : input.slice(qIndex + 1);

  const colonIndex = head.indexOf(':');
  const resource = colonIndex === -1 ? head : head.slice(0, colonIndex);
  const positionalRaw = colonIndex === -1 ? undefined : head.slice(colonIndex + 1);
  if (head.endsWith(':') || (qIndex !== -1 && head.endsWith(':') )) {
    throw new ScopeParseError('empty positional segment', input);
  }
  const params = parseParams(query, input);
  const positional = positionalRaw !== undefined ? decodeURIComponent(positionalRaw) : undefined;

  if (resource === 'include') {
    return buildInclude(positional, params, input);
  }

  if (!isPermissionResource(resource)) {
    throw new ScopeParseError(`unknown resource '${resource}'`, input);
  }

  return buildPermission(resource, positional, params, input, /* insideSet */ false);
}

/** Parses an OAuth `scope` value (space-separated). */
export function parseScopeList(input: string): Scope[] {
  const parts = input.split(/\s+/).filter((p) => p.length > 0);
  return parts.map((p) => parseScopeString(p));
}

/** Serializes a scope back to its canonical string form. */
export function formatScope(scope: Scope): string {
  switch (scope.type) {
    case 'atproto':
      return 'atproto';
    case 'transition':
      return `transition:${scope.variant}`;
    case 'include':
      return formatInclude(scope);
    case 'permission':
      return formatPermission(scope);
  }
}

/** Serializes an array of scopes to a space-separated OAuth `scope` value. */
export function formatScopeList(scopes: readonly Scope[]): string {
  return scopes.map(formatScope).join(' ');
}

// ---------------------------------------------------------------------------
// Parsing helpers.

function parseParams(query: string, source: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (query.length === 0) return out;
  for (const part of query.split('&')) {
    if (part.length === 0) continue;
    const eq = part.indexOf('=');
    const rawKey = eq === -1 ? part : part.slice(0, eq);
    const rawVal = eq === -1 ? '' : part.slice(eq + 1);
    if (rawKey.length === 0) {
      throw new ScopeParseError('empty parameter name', source);
    }
    let key: string;
    let value: string;
    try {
      key = decodeURIComponent(rawKey);
      value = decodeURIComponent(rawVal);
    } catch {
      throw new ScopeParseError('invalid percent-encoding', source);
    }
    const existing = out.get(key);
    if (existing) existing.push(value);
    else out.set(key, [value]);
  }
  return out;
}

function takeSingle(
  params: Map<string, string[]>,
  name: string,
  positional: string | undefined,
  source: string,
): string | undefined {
  const list = params.get(name);
  if (list && list.length > 0) {
    if (positional !== undefined) {
      throw new ScopeParseError(
        `positional and named '${name}' may not both be present`,
        source,
      );
    }
    if (list.length > 1) {
      throw new ScopeParseError(`duplicate '${name}' parameter`, source);
    }
    return list[0];
  }
  return positional;
}

function takeArray(
  params: Map<string, string[]>,
  name: string,
  positional: string | undefined,
  source: string,
): string[] | undefined {
  const named = params.get(name);
  if (named && named.length > 0) {
    if (positional !== undefined) {
      throw new ScopeParseError(
        `positional and named '${name}' may not both be present`,
        source,
      );
    }
    return [...named];
  }
  return positional !== undefined ? [positional] : undefined;
}

function isPermissionResource(name: string): name is Permission['resource'] {
  return (
    name === 'repo' || name === 'rpc' || name === 'blob' || name === 'account' || name === 'identity'
  );
}

function buildInclude(
  positional: string | undefined,
  params: Map<string, string[]>,
  source: string,
): IncludeReference {
  const nsid = takeSingle(params, 'nsid', positional, source);
  if (!nsid) throw new ScopeParseError('include requires an NSID', source);
  const audList = params.get('aud');
  if (audList && audList.length > 1) {
    throw new ScopeParseError('include accepts only one aud', source);
  }
  const ref: IncludeReference = audList && audList[0] !== undefined
    ? { type: 'include', nsid, aud: audList[0] }
    : { type: 'include', nsid };
  ensureNoExtra(params, ['aud', 'nsid'], source);
  return ref;
}

function buildPermission(
  resource: Permission['resource'],
  positional: string | undefined,
  params: Map<string, string[]>,
  source: string,
  insideSet: boolean,
): Permission {
  if (insideSet && SET_EXCLUDED_RESOURCES.has(resource)) {
    throw new ScopeParseError(
      `resource '${resource}' cannot appear inside a permission set`,
      source,
    );
  }

  switch (resource) {
    case 'repo': {
      const collection = takeArray(params, 'collection', positional, source);
      if (!collection || collection.length === 0) {
        throw new ScopeParseError('repo requires at least one collection', source);
      }
      const actionList = params.get('action');
      if (actionList) {
        for (const a of actionList) {
          if (!REPO_ACTIONS.has(a as RepoAction)) {
            throw new ScopeParseError(`invalid repo action '${a}'`, source);
          }
        }
      }
      if (insideSet && collection.some((c) => c.includes('*'))) {
        throw new ScopeParseError('wildcards not allowed inside permission set', source);
      }
      ensureNoExtra(params, ['collection', 'action'], source);
      if (actionList && actionList.length > 0) {
        return {
          type: 'permission',
          resource: 'repo',
          collection,
          action: [...(actionList as RepoAction[])],
        };
      }
      return { type: 'permission', resource: 'repo', collection };
    }
    case 'rpc': {
      const lxm = takeArray(params, 'lxm', positional, source);
      if (!lxm || lxm.length === 0) {
        throw new ScopeParseError('rpc requires at least one lxm', source);
      }
      const audList = params.get('aud');
      if (audList && audList.length > 1) {
        throw new ScopeParseError('rpc accepts only one aud', source);
      }
      const aud = audList ? audList[0] : undefined;
      const inheritAudList = params.get('inheritAud');
      const inheritAud = inheritAudList?.[0] === 'true';
      if (!insideSet) {
        if (!aud) {
          throw new ScopeParseError('rpc outside a set requires aud', source);
        }
        if (inheritAud) {
          throw new ScopeParseError('inheritAud is only valid inside a permission set', source);
        }
        if (aud === '*' && lxm.some((l) => l === '*')) {
          throw new ScopeParseError('rpc may not set both lxm=* and aud=*', source);
        }
      } else {
        if (insideSet && lxm.some((l) => l === '*')) {
          throw new ScopeParseError('wildcards not allowed inside permission set', source);
        }
        if (aud === '*') {
          // aud=* is valid inside a set per spec examples, but concrete DIDs are not.
        } else if (aud && aud.startsWith('did:')) {
          throw new ScopeParseError(
            'concrete DID aud is not permitted in permission set',
            source,
          );
        }
        if (inheritAud && aud) {
          throw new ScopeParseError('inheritAud and aud are mutually exclusive', source);
        }
        if (!inheritAud && !aud) {
          throw new ScopeParseError('rpc in a set needs either inheritAud or aud', source);
        }
      }
      ensureNoExtra(params, ['lxm', 'aud', 'inheritAud'], source);
      const base = { type: 'permission' as const, resource: 'rpc' as const, lxm };
      if (inheritAud) return { ...base, inheritAud: true };
      if (aud !== undefined) return { ...base, aud };
      return base;
    }
    case 'blob': {
      const accept = takeArray(params, 'accept', positional, source);
      if (!accept || accept.length === 0) {
        throw new ScopeParseError('blob requires at least one accept pattern', source);
      }
      for (const a of accept) {
        if (!/^([a-zA-Z0-9.+_-]+|\*)\/([a-zA-Z0-9.+_-]+|\*)$/.test(a)) {
          throw new ScopeParseError(`invalid MIME pattern '${a}'`, source);
        }
      }
      ensureNoExtra(params, ['accept'], source);
      return { type: 'permission', resource: 'blob', accept };
    }
    case 'identity': {
      const attr = takeSingle(params, 'attr', positional, source);
      if (!attr) throw new ScopeParseError('identity requires attr', source);
      if (attr !== 'handle' && attr !== '*') {
        throw new ScopeParseError(`unknown identity attr '${attr}'`, source);
      }
      ensureNoExtra(params, ['attr'], source);
      return { type: 'permission', resource: 'identity', attr: attr as IdentityAttr };
    }
    case 'account': {
      const attr = takeSingle(params, 'attr', positional, source);
      if (!attr) throw new ScopeParseError('account requires attr', source);
      if (!ACCOUNT_ATTRS.has(attr as AccountAttr)) {
        throw new ScopeParseError(`unknown account attr '${attr}'`, source);
      }
      const actionList = params.get('action');
      if (actionList && actionList.length > 1) {
        throw new ScopeParseError('account accepts only one action', source);
      }
      const action = actionList?.[0];
      if (action !== undefined && !ACCOUNT_ACTIONS.has(action as AccountAction)) {
        throw new ScopeParseError(`unknown account action '${action}'`, source);
      }
      ensureNoExtra(params, ['attr', 'action'], source);
      if (action) {
        return {
          type: 'permission',
          resource: 'account',
          attr: attr as AccountAttr,
          action: action as AccountAction,
        };
      }
      return { type: 'permission', resource: 'account', attr: attr as AccountAttr };
    }
  }
}

function ensureNoExtra(
  params: Map<string, string[]>,
  allowed: readonly string[],
  source: string,
): void {
  const allowedSet = new Set(allowed);
  for (const key of params.keys()) {
    if (!allowedSet.has(key)) {
      throw new ScopeParseError(`unknown parameter '${key}'`, source);
    }
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers.

function formatInclude(scope: IncludeReference): string {
  const base = `include:${scope.nsid}`;
  if (scope.aud) {
    return `${base}?aud=${encodeURIComponent(scope.aud)}`;
  }
  return base;
}

function formatPermission(perm: Permission): string {
  switch (perm.resource) {
    case 'repo': {
      const positional =
        perm.collection.length === 1 ? perm.collection[0] : undefined;
      const params = new URLSearchParams();
      if (!positional) {
        for (const c of perm.collection) params.append('collection', c);
      }
      if (perm.action && perm.action.length > 0) {
        for (const a of perm.action) params.append('action', a);
      }
      return joinScope('repo', positional, params);
    }
    case 'rpc': {
      const positional = perm.lxm.length === 1 ? perm.lxm[0] : undefined;
      const params = new URLSearchParams();
      if (!positional) {
        for (const l of perm.lxm) params.append('lxm', l);
      }
      if (perm.inheritAud) params.append('inheritAud', 'true');
      else if (perm.aud !== undefined) params.append('aud', perm.aud);
      return joinScope('rpc', positional, params);
    }
    case 'blob': {
      const positional = perm.accept.length === 1 ? perm.accept[0] : undefined;
      const params = new URLSearchParams();
      if (!positional) {
        for (const a of perm.accept) params.append('accept', a);
      }
      return joinScope('blob', positional, params);
    }
    case 'identity': {
      return joinScope('identity', perm.attr, new URLSearchParams());
    }
    case 'account': {
      const params = new URLSearchParams();
      if (perm.action) params.append('action', perm.action);
      return joinScope('account', perm.attr, params);
    }
  }
}

function joinScope(
  resource: string,
  positional: string | undefined,
  params: URLSearchParams,
): string {
  const head = positional !== undefined ? `${resource}:${positional}` : resource;
  const q = params.toString();
  return q.length > 0 ? `${head}?${q}` : head;
}

// ---------------------------------------------------------------------------
// Permission-set body parsing.

/**
 * Converts a permission-set Lexicon's `permissions` array (JSON) into typed
 * {@link Permission} values. Rejects entries the parser cannot validate;
 * Authorization Servers are instructed by the spec to **ignore** unknown
 * entries so we return the successfully-parsed subset and the rejections
 * separately.
 */
export function parsePermissionSetBody(
  nsid: string,
  permissions: readonly unknown[],
): { permissions: Permission[]; rejected: string[] } {
  const out: Permission[] = [];
  const rejected: string[] = [];
  const source = `permission-set:${nsid}`;
  for (const raw of permissions) {
    try {
      if (typeof raw !== 'object' || raw === null) {
        throw new Error('entry is not an object');
      }
      const obj = raw as Record<string, unknown>;
      if (obj.type !== 'permission') throw new Error(`unexpected type '${String(obj.type)}'`);
      const resource = obj.resource;
      if (
        resource !== 'repo' &&
        resource !== 'rpc' &&
        resource !== 'blob' &&
        resource !== 'account' &&
        resource !== 'identity'
      ) {
        throw new Error(`unknown resource '${String(resource)}'`);
      }
      if (SET_EXCLUDED_RESOURCES.has(resource)) {
        throw new Error(`resource '${resource}' cannot appear in a set`);
      }
      // After the exclusion filter the only remaining shapes are repo/rpc.
      const perm = buildPermissionFromObject(resource as 'repo' | 'rpc', obj, source);
      out.push(perm);
    } catch (err) {
      rejected.push(err instanceof Error ? err.message : String(err));
    }
  }
  return { permissions: out, rejected };
}

function buildPermissionFromObject(
  resource: 'repo' | 'rpc',
  obj: Record<string, unknown>,
  source: string,
): Permission {
  if (resource === 'repo') {
    const collection = obj.collection;
    if (!Array.isArray(collection) || collection.length === 0) {
      throw new Error('repo requires collection[]');
    }
    for (const c of collection) {
      if (typeof c !== 'string') throw new Error('collection entries must be strings');
      if (c.includes('*')) throw new Error('wildcards not allowed in set');
    }
    const action = obj.action;
    if (action !== undefined) {
      if (!Array.isArray(action)) throw new Error('action must be an array');
      for (const a of action) {
        if (typeof a !== 'string' || !REPO_ACTIONS.has(a as RepoAction)) {
          throw new Error(`invalid action '${String(a)}'`);
        }
      }
    }
    if (action && (action as RepoAction[]).length > 0) {
      return {
        type: 'permission',
        resource: 'repo',
        collection: collection as string[],
        action: action as RepoAction[],
      };
    }
    return {
      type: 'permission',
      resource: 'repo',
      collection: collection as string[],
    };
  }
  const lxm = obj.lxm;
  if (!Array.isArray(lxm) || lxm.length === 0) throw new Error('rpc requires lxm[]');
  for (const l of lxm) {
    if (typeof l !== 'string') throw new Error('lxm entries must be strings');
    if (l.includes('*')) throw new Error('wildcards not allowed in set');
  }
  const inheritAud = obj.inheritAud === true;
  const aud = typeof obj.aud === 'string' ? obj.aud : undefined;
  if (inheritAud && aud !== undefined) {
    throw new Error('inheritAud and aud are mutually exclusive');
  }
  if (!inheritAud && aud === undefined) {
    throw new Error('rpc in set requires inheritAud or aud');
  }
  if (aud !== undefined && aud !== '*' && aud.startsWith('did:')) {
    throw new Error('concrete DID aud not permitted in set');
  }
  void source;
  const base = { type: 'permission' as const, resource: 'rpc' as const, lxm: lxm as string[] };
  if (inheritAud) return { ...base, inheritAud: true };
  return { ...base, aud: aud as string };
}
