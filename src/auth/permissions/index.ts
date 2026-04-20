/**
 * atproto OAuth permission scopes + permission sets.
 *
 * See:
 *   - https://atproto.com/specs/permission
 *   - https://atproto.com/guides/permission-sets
 *   - https://atproto.com/guides/oauth-patterns
 *
 * @module
 */

export * from './types.js';
export {
  ScopeParseError,
  formatScope,
  formatScopeList,
  parsePermissionSetBody,
  parseScopeList,
  parseScopeString,
} from './scope-string.js';
export {
  InMemoryPermissionSetCache,
  PermissionSetResolutionError,
  PermissionSetResolver,
  enforceNamespaceAuthority,
  expandPermissionSet,
  isUnderNamespace,
  namespaceOwner,
  parsePermissionSetDocument,
} from './permission-set-resolver.js';
export type {
  LexiconFetcher,
  PermissionSetCache,
  PermissionSetCacheEntry,
  PermissionSetDocument,
  ResolverDeps,
} from './permission-set-resolver.js';
export {
  SessionPermissions,
  buildSessionPermissions,
} from './enforcement.js';
export type {
  AccessCheck,
  AccessCheckAccount,
  AccessCheckBlob,
  AccessCheckIdentity,
  AccessCheckRepo,
  AccessCheckRpc,
  AccessDecision,
  AccessDenialReason,
} from './enforcement.js';
export {
  LAYERS_MAXIMUM_SCOPE,
  LAYERS_PERMISSION_SETS,
  LAYERS_SCOPE_PROFILES,
  buildLayersScopeString,
  validateScopeString,
} from './layers-scopes.js';
export type {
  AppviewAudience,
  LayersPermissionSet,
  LayersScopeProfile,
} from './layers-scopes.js';
