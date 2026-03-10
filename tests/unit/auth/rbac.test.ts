/**
 * Unit tests for the RBAC module.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';

import {
  ROLE_HIERARCHY,
  satisfiesRole,
  deriveRoleFromScopes,
  hasPermission,
} from '../../../src/auth/authorization/rbac.js';

describe('ROLE_HIERARCHY', () => {
  it('defines six roles', () => {
    expect(Object.keys(ROLE_HIERARCHY)).toHaveLength(6);
  });

  it('assigns ascending levels', () => {
    expect(ROLE_HIERARCHY.viewer).toBe(0);
    expect(ROLE_HIERARCHY.annotator).toBe(1);
    expect(ROLE_HIERARCHY.adjudicator).toBe(2);
    expect(ROLE_HIERARCHY['corpus-manager']).toBe(3);
    expect(ROLE_HIERARCHY['ontology-editor']).toBe(3);
    expect(ROLE_HIERARCHY.admin).toBe(4);
  });

  it('places corpus-manager and ontology-editor at the same level', () => {
    expect(ROLE_HIERARCHY['corpus-manager']).toBe(ROLE_HIERARCHY['ontology-editor']);
  });
});

describe('satisfiesRole', () => {
  it('admin satisfies all roles', () => {
    expect(satisfiesRole('admin', 'viewer')).toBe(true);
    expect(satisfiesRole('admin', 'annotator')).toBe(true);
    expect(satisfiesRole('admin', 'adjudicator')).toBe(true);
    expect(satisfiesRole('admin', 'corpus-manager')).toBe(true);
    expect(satisfiesRole('admin', 'ontology-editor')).toBe(true);
    expect(satisfiesRole('admin', 'admin')).toBe(true);
  });

  it('viewer does not satisfy higher roles', () => {
    expect(satisfiesRole('viewer', 'annotator')).toBe(false);
    expect(satisfiesRole('viewer', 'admin')).toBe(false);
  });

  it('same role satisfies itself', () => {
    expect(satisfiesRole('annotator', 'annotator')).toBe(true);
  });

  it('corpus-manager satisfies ontology-editor (same level)', () => {
    expect(satisfiesRole('corpus-manager', 'ontology-editor')).toBe(true);
  });

  it('ontology-editor satisfies corpus-manager (same level)', () => {
    expect(satisfiesRole('ontology-editor', 'corpus-manager')).toBe(true);
  });

  it('unknown roles default to level 0', () => {
    expect(satisfiesRole('unknown', 'viewer')).toBe(true);
    expect(satisfiesRole('unknown', 'annotator')).toBe(false);
  });
});

describe('deriveRoleFromScopes', () => {
  it('returns viewer for read-only scopes', () => {
    expect(deriveRoleFromScopes(['read:records'])).toBe('viewer');
  });

  it('returns annotator for write:annotation scope', () => {
    expect(deriveRoleFromScopes(['read:records', 'write:annotation'])).toBe('annotator');
  });

  it('returns corpus-manager for write:corpus scope', () => {
    expect(deriveRoleFromScopes(['read:records', 'write:corpus'])).toBe('corpus-manager');
  });

  it('returns ontology-editor for write:ontology scope', () => {
    expect(deriveRoleFromScopes(['read:records', 'write:ontology'])).toBe('ontology-editor');
  });

  it('returns admin for admin scopes', () => {
    expect(deriveRoleFromScopes(['admin:dlq'])).toBe('admin');
    expect(deriveRoleFromScopes(['read:records', 'admin:plugins'])).toBe('admin');
  });

  it('returns viewer for empty scopes', () => {
    expect(deriveRoleFromScopes([])).toBe('viewer');
  });

  it('returns the highest role when multiple scopes are present', () => {
    expect(deriveRoleFromScopes(['read:records', 'write:annotation', 'write:corpus'])).toBe(
      'corpus-manager',
    );
  });

  it('ignores unknown scopes', () => {
    expect(deriveRoleFromScopes(['unknown:scope', 'read:records'])).toBe('viewer');
  });
});

describe('hasPermission', () => {
  it('admin has permission for all scopes', () => {
    expect(hasPermission('admin', 'read:records')).toBe(true);
    expect(hasPermission('admin', 'write:expression')).toBe(true);
    expect(hasPermission('admin', 'admin:dlq')).toBe(true);
  });

  it('viewer has permission for read:records only', () => {
    expect(hasPermission('viewer', 'read:records')).toBe(true);
    expect(hasPermission('viewer', 'write:expression')).toBe(false);
    expect(hasPermission('viewer', 'admin:dlq')).toBe(false);
  });

  it('annotator has permission for read and write scopes', () => {
    expect(hasPermission('annotator', 'read:records')).toBe(true);
    expect(hasPermission('annotator', 'write:expression')).toBe(true);
    expect(hasPermission('annotator', 'write:annotation')).toBe(true);
    expect(hasPermission('annotator', 'write:corpus')).toBe(false);
  });

  it('returns false for invalid scopes', () => {
    expect(hasPermission('admin', 'invalid:scope')).toBe(false);
    expect(hasPermission('admin', '')).toBe(false);
  });
});
