/**
 * Role-based access control module.
 *
 * Defines the Layers role hierarchy and provides utilities for checking
 * role satisfaction, deriving roles from scopes, and verifying permissions.
 *
 * @module
 */

import { isValidScope, roleForScope } from '../scopes/index.js';

/**
 * Role hierarchy with numeric levels. Higher numbers indicate more privilege.
 * Roles at the same level (e.g., corpus-manager and ontology-editor) are
 * considered equivalent in the hierarchy.
 */
const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  annotator: 1,
  adjudicator: 2,
  'corpus-manager': 3,
  'ontology-editor': 3,
  admin: 4,
} as const;

/**
 * Union type of all recognized Layers role names.
 */
type LayersRole = keyof typeof ROLE_HIERARCHY;

/**
 * Checks whether the current role satisfies (meets or exceeds) the
 * required role in the hierarchy.
 *
 * Unknown roles default to level 0 (viewer equivalent).
 *
 * @param currentRole - the user's current role
 * @param requiredRole - the role required for the operation
 * @returns true if the current role is at or above the required role
 */
function satisfiesRole(currentRole: string, requiredRole: string): boolean {
  const currentLevel = ROLE_HIERARCHY[currentRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return currentLevel >= requiredLevel;
}

/**
 * Derives the highest applicable role from a set of scopes.
 *
 * Examines each scope, determines its minimum role, and returns
 * the highest role found. Defaults to "viewer" if no scopes match.
 *
 * @param scopes - the scopes granted to the session
 * @returns the derived role name
 */
function deriveRoleFromScopes(scopes: readonly string[]): LayersRole {
  let maxLevel = 0;
  let maxRole: LayersRole = 'viewer';

  for (const scope of scopes) {
    if (!isValidScope(scope)) continue;

    const role = roleForScope(scope);
    const level = ROLE_HIERARCHY[role] ?? 0;
    if (level > maxLevel) {
      maxLevel = level;
      maxRole = role;
    }
  }

  return maxRole;
}

/**
 * Checks whether a role has permission to use a given scope.
 *
 * Verifies that the scope is valid, then checks whether the role
 * satisfies the minimum role required for that scope.
 *
 * @param role - the user's role
 * @param requiredScope - the scope to check
 * @returns true if the role has permission to use the scope
 */
function hasPermission(role: string, requiredScope: string): boolean {
  if (!isValidScope(requiredScope)) return false;
  const minRole = roleForScope(requiredScope);
  return satisfiesRole(role, minRole);
}

export { deriveRoleFromScopes, hasPermission, ROLE_HIERARCHY, satisfiesRole };
export type { LayersRole };
