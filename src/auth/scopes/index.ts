/**
 * Centralized scope registry for Layers RBAC.
 *
 * Defines all Layers-specific scopes, their descriptions, and their
 * minimum required roles. Provides utilities for scope validation
 * and role-scope mapping.
 *
 * @module
 */

/**
 * Scope definition including a human-readable description and
 * the minimum role required to hold this scope.
 */
interface ScopeDefinition {
  readonly description: string;
  readonly role: string;
}

/**
 * All Layers-specific scopes with their descriptions and minimum roles.
 */
const LAYERS_SCOPES = {
  'read:records': { description: 'Read any indexed record', role: 'viewer' },
  'write:expression': { description: 'Create/update expressions', role: 'annotator' },
  'write:annotation': { description: 'Create/update annotations', role: 'annotator' },
  'write:corpus': { description: 'Create/update corpora', role: 'corpus-manager' },
  'write:ontology': { description: 'Create/update ontologies', role: 'ontology-editor' },
  'write:resource': { description: 'Create/update resource entries', role: 'corpus-manager' },
  'admin:dlq': { description: 'Access DLQ admin endpoints', role: 'admin' },
  'admin:plugins': { description: 'Manage plugin configuration', role: 'admin' },
  'admin:reconciliation': { description: 'Trigger reconciliation jobs', role: 'admin' },
} as const;

/**
 * Union type of all valid Layers scope names.
 */
type LayersScope = keyof typeof LAYERS_SCOPES;

/** Set of valid scope names for O(1) lookup. */
const VALID_SCOPES = new Set<string>(Object.keys(LAYERS_SCOPES));

/**
 * Type guard that checks whether a string is a valid Layers scope.
 *
 * @param scope - the string to validate
 * @returns true if the string is a recognized Layers scope
 */
function isValidScope(scope: string): scope is LayersScope {
  return VALID_SCOPES.has(scope);
}

/**
 * Returns all scopes accessible to a given role.
 *
 * A role can access any scope whose minimum role requirement is at or
 * below the given role in the hierarchy. This function imports the
 * role hierarchy dynamically to avoid circular dependencies.
 *
 * @param role - the role name to look up
 * @returns an array of scopes the role can access
 */
function scopesForRole(role: string): LayersScope[] {
  // Inline role hierarchy levels to avoid circular dependency with rbac module
  const roleLevels: Record<string, number> = {
    viewer: 0,
    annotator: 1,
    adjudicator: 2,
    'corpus-manager': 3,
    'ontology-editor': 3,
    admin: 4,
  };

  const roleLevel = roleLevels[role] ?? -1;
  const result: LayersScope[] = [];

  for (const [scope, def] of Object.entries(LAYERS_SCOPES)) {
    const requiredLevel = roleLevels[def.role] ?? 0;
    if (roleLevel >= requiredLevel) {
      result.push(scope as LayersScope);
    }
  }

  return result;
}

/**
 * Returns the minimum role required to hold a given scope.
 *
 * @param scope - a valid Layers scope
 * @returns the role name
 */
function roleForScope(scope: LayersScope): string {
  return LAYERS_SCOPES[scope].role;
}

export { LAYERS_SCOPES, isValidScope, roleForScope, scopesForRole };
export type { LayersScope, ScopeDefinition };
