/**
 * Unit tests for the centralized scope registry.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';

import {
  LAYERS_SCOPES,
  isValidScope,
  scopesForRole,
  roleForScope,
} from '../../../src/auth/scopes/index.js';
// LayersScope type used implicitly via the generic functions

describe('LAYERS_SCOPES', () => {
  it('defines all nine scopes', () => {
    expect(Object.keys(LAYERS_SCOPES)).toHaveLength(9);
  });

  it('includes read:records scope', () => {
    expect(LAYERS_SCOPES['read:records']).toBeDefined();
    expect(LAYERS_SCOPES['read:records'].role).toBe('viewer');
  });

  it('includes all admin scopes', () => {
    expect(LAYERS_SCOPES['admin:dlq'].role).toBe('admin');
    expect(LAYERS_SCOPES['admin:plugins'].role).toBe('admin');
    expect(LAYERS_SCOPES['admin:reconciliation'].role).toBe('admin');
  });

  it('includes all write scopes', () => {
    expect(LAYERS_SCOPES['write:expression'].role).toBe('annotator');
    expect(LAYERS_SCOPES['write:annotation'].role).toBe('annotator');
    expect(LAYERS_SCOPES['write:corpus'].role).toBe('corpus-manager');
    expect(LAYERS_SCOPES['write:ontology'].role).toBe('ontology-editor');
    expect(LAYERS_SCOPES['write:resource'].role).toBe('corpus-manager');
  });
});

describe('isValidScope', () => {
  it('returns true for valid scopes', () => {
    expect(isValidScope('read:records')).toBe(true);
    expect(isValidScope('write:expression')).toBe(true);
    expect(isValidScope('admin:dlq')).toBe(true);
  });

  it('returns false for invalid scopes', () => {
    expect(isValidScope('invalid:scope')).toBe(false);
    expect(isValidScope('')).toBe(false);
    expect(isValidScope('admin:users')).toBe(false);
    expect(isValidScope('admin:*')).toBe(false);
  });
});

describe('scopesForRole', () => {
  it('returns only read:records for viewer', () => {
    const scopes = scopesForRole('viewer');
    expect(scopes).toEqual(['read:records']);
  });

  it('returns read and write scopes for annotator', () => {
    const scopes = scopesForRole('annotator');
    expect(scopes).toContain('read:records');
    expect(scopes).toContain('write:expression');
    expect(scopes).toContain('write:annotation');
    expect(scopes).not.toContain('write:corpus');
    expect(scopes).not.toContain('admin:dlq');
  });

  it('returns all scopes for admin', () => {
    const scopes = scopesForRole('admin');
    expect(scopes).toHaveLength(9);
  });

  it('returns corpus-manager scopes including write:corpus and write:resource', () => {
    const scopes = scopesForRole('corpus-manager');
    expect(scopes).toContain('write:corpus');
    expect(scopes).toContain('write:resource');
    expect(scopes).toContain('read:records');
    expect(scopes).toContain('write:expression');
    expect(scopes).toContain('write:annotation');
  });

  it('returns ontology-editor scopes including write:ontology', () => {
    const scopes = scopesForRole('ontology-editor');
    expect(scopes).toContain('write:ontology');
    expect(scopes).toContain('read:records');
  });

  it('returns empty array for unknown role', () => {
    const scopes = scopesForRole('nonexistent');
    expect(scopes).toEqual([]);
  });
});

describe('roleForScope', () => {
  it('returns viewer for read:records', () => {
    expect(roleForScope('read:records')).toBe('viewer');
  });

  it('returns annotator for write:expression', () => {
    expect(roleForScope('write:expression')).toBe('annotator');
  });

  it('returns corpus-manager for write:corpus', () => {
    expect(roleForScope('write:corpus')).toBe('corpus-manager');
  });

  it('returns ontology-editor for write:ontology', () => {
    expect(roleForScope('write:ontology')).toBe('ontology-editor');
  });

  it('returns admin for admin scopes', () => {
    expect(roleForScope('admin:dlq')).toBe('admin');
    expect(roleForScope('admin:plugins')).toBe('admin');
    expect(roleForScope('admin:reconciliation')).toBe('admin');
  });
});
