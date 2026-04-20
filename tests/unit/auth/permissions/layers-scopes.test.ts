/**
 * Tests for Layers-specific scope profiles + client-metadata declarations.
 *
 * Also asserts the committed Lexicon files under
 * `lexicons/pub/layers/auth/` are valid permission-set documents and respect
 * the namespace-authority rule.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LAYERS_MAXIMUM_SCOPE,
  LAYERS_PERMISSION_SETS,
  buildLayersScopeString,
  parseScopeList,
  parsePermissionSetDocument,
  validateScopeString,
} from '../../../../src/auth/permissions/index.js';

const APPVIEW_AUD = {
  did: 'did:web:appview.layers.pub',
  serviceFragment: 'layers_appview',
};

describe('buildLayersScopeString', () => {
  it('login-only requests only the identity sentinel', () => {
    expect(buildLayersScopeString('login-only', APPVIEW_AUD)).toBe('atproto');
  });

  it('read-only requests the authReadOnly set', () => {
    const out = buildLayersScopeString('read-only', APPVIEW_AUD);
    expect(out).toContain('atproto');
    expect(out).toContain('include:pub.layers.authReadOnly');
  });

  it('annotator bundles authAnnotator + blob:*/*', () => {
    const out = buildLayersScopeString('annotator', APPVIEW_AUD);
    expect(out).toContain('include:pub.layers.authAnnotator');
    expect(out).toContain('blob:*/*');
  });

  it('every profile parses as a valid scope list', () => {
    for (const profile of [
      'login-only',
      'read-only',
      'annotator',
      'corpus-manager',
      'ontology-editor',
      'experimenter',
      'full',
    ] as const) {
      const raw = buildLayersScopeString(profile, APPVIEW_AUD);
      expect(() => parseScopeList(raw)).not.toThrow();
    }
  });
});

describe('LAYERS_MAXIMUM_SCOPE', () => {
  it('parses as a valid scope list', () => {
    expect(() => validateScopeString(LAYERS_MAXIMUM_SCOPE)).not.toThrow();
  });

  it('contains every declared permission set', () => {
    for (const nsid of Object.values(LAYERS_PERMISSION_SETS)) {
      expect(LAYERS_MAXIMUM_SCOPE).toContain(`include:${nsid}`);
    }
  });

  it('declares the blob wildcard', () => {
    expect(LAYERS_MAXIMUM_SCOPE).toContain('blob:*/*');
  });
});

describe('committed permission-set Lexicons', () => {
  const lexDir = join(__dirname, '..', '..', '..', '..', 'lexicons', 'pub', 'layers');

  it('registry references match committed files', () => {
    const files = readdirSync(lexDir)
      .filter((f) => f.endsWith('.json') && f.startsWith('auth'));
    const idsOnDisk = new Set(
      files.map((f) => JSON.parse(readFileSync(join(lexDir, f), 'utf8')).id as string),
    );
    for (const nsid of Object.values(LAYERS_PERMISSION_SETS)) {
      expect(idsOnDisk.has(nsid), `missing ${nsid}`).toBe(true);
    }
  });

  it.each(Object.values(LAYERS_PERMISSION_SETS))(
    'parses %s with namespace-authority enforcement',
    (nsid) => {
      const files = readdirSync(lexDir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith('.json'))
        .map((e) => e.name);
      const file = files.find((f) => {
        const doc = JSON.parse(readFileSync(join(lexDir, f), 'utf8'));
        return doc.id === nsid;
      });
      expect(file, `no file for ${nsid}`).toBeDefined();
      const doc = JSON.parse(readFileSync(join(lexDir, file!), 'utf8'));
      const resolved = parsePermissionSetDocument(doc, nsid);
      expect(resolved.permissions.length).toBeGreaterThan(0);
      expect(resolved.title.length).toBeGreaterThan(0);
    },
  );
});
