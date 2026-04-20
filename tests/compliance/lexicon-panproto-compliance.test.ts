/**
 * ATProto compliance gate driven by panproto.
 *
 * Every `pub.layers.*` lexicon must parse cleanly through panproto's ATProto
 * protocol (the same pipeline the appview uses at runtime to validate records
 * coming off Tap). A failure here means the lexicon violates ATProto's shape
 * rules and would never index.
 *
 * The gate also verifies every record lexicon has a matching lens spec with
 * the storage envelope the generic indexer depends on.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { Panproto } from '@panproto/core';
import { beforeAll, describe, expect, it } from 'vitest';

import { loadLensRegistry } from '../../src/services/indexing/lens-registry.js';
import { parsePermissionSetDocument } from '../../src/auth/permissions/index.js';

const ROOT = join(__dirname, '..', '..');
const LEX_DIR = join(ROOT, 'lexicons', 'pub', 'layers');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.json')) out.push(p);
  }
  return out;
}

let panproto: Panproto;
const lexicons: { id: string; raw: unknown }[] = [];

beforeAll(async () => {
  panproto = await Panproto.init();
  for (const file of walk(LEX_DIR)) {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    lexicons.push({ id: raw.id, raw });
  }
});

function isPermissionSet(raw: unknown): raw is {
  id: string;
  defs: { main: { type: 'permission-set' } };
} {
  const r = raw as { defs?: { main?: { type?: string } } };
  return r?.defs?.main?.type === 'permission-set';
}

describe('ATProto lexicon compliance (via panproto)', () => {
  it('parses every record/query/procedure lexicon through panproto without error', () => {
    for (const { id, raw } of lexicons) {
      if (isPermissionSet(raw)) continue;
      expect(() => panproto.parseLexicon(raw as Record<string, unknown>), id).not.toThrow();
    }
  });

  it('parses every permission-set lexicon through the permissions module', () => {
    for (const { id, raw } of lexicons) {
      if (!isPermissionSet(raw)) continue;
      expect(
        () =>
          parsePermissionSetDocument(
            raw as unknown as Parameters<typeof parsePermissionSetDocument>[0],
            id,
          ),
        id,
      ).not.toThrow();
    }
  });

  it('every record lexicon is registered in the runtime lens registry', () => {
    const registry = loadLensRegistry();
    const records = lexicons.filter(
      (l) => (l.raw as { defs?: { main?: { type?: string } } }).defs?.main?.type === 'record',
    );
    for (const { id } of records) {
      expect(registry.has(id), `lens registry missing ${id}`).toBe(true);
    }
  });

  it('permission-set lexicons are not routed through the record registry', () => {
    const registry = loadLensRegistry();
    for (const { id, raw } of lexicons) {
      if (!isPermissionSet(raw)) continue;
      expect(registry.has(id), `permission set ${id} unexpectedly in lens registry`).toBe(false);
    }
  });

  it('every lens spec has a non-empty storage envelope', () => {
    const registry = loadLensRegistry();
    for (const [id, spec] of registry) {
      expect(spec.table, `${id} table`).toBeTruthy();
      expect(spec.esIndex, `${id} esIndex`).toBeTruthy();
      expect(spec.neo4jLabel, `${id} neo4jLabel`).toBeTruthy();
      expect(spec.resourceName, `${id} resourceName`).toBeTruthy();
      expect(
        Object.keys(spec.columns).length,
        `${id} columns`,
      ).toBeGreaterThan(0);
    }
  });
});
