/**
 * Runtime registry of lens specs.
 *
 * At startup the indexer reads every `layers/lenses/*.lens.json` file, parses
 * the `extensions.storage` block into a {@link LensStorageSpec}, and makes
 * the result available by NSID. The generic repository/service/mapper
 * factories consume the registry; no hand-written per-record storage code is
 * required.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { LensDocument, LensStorageSpec } from './lens-spec.js';

function locateLensDir(): string {
  const hereFile = fileURLToPath(import.meta.url);
  // This file sits at `src/services/indexing/lens-registry.ts` (dev) or the
  // compiled equivalent under `dist/...`. Walk up until we find a `lenses/`
  // directory alongside a `package.json`.
  let cur = dirname(hereFile);
  for (let i = 0; i < 8; i++) {
    try {
      const candidate = join(cur, 'lenses');
      readdirSync(candidate);
      return candidate;
    } catch {
      // keep walking
    }
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  throw new Error('Could not locate layers/lenses/ directory');
}

let cached: ReadonlyMap<string, LensStorageSpec> | null = null;

export function loadLensRegistry(): ReadonlyMap<string, LensStorageSpec> {
  if (cached) return cached;
  const dir = locateLensDir();
  const out = new Map<string, LensStorageSpec>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.lens.json')) continue;
    const lens = JSON.parse(readFileSync(join(dir, file), 'utf8')) as LensDocument;
    const storage = lens.extensions?.storage;
    if (!storage) continue;
    out.set(lens.source, storage);
  }
  cached = out;
  return out;
}

export function getLensSpec(nsid: string): LensStorageSpec | undefined {
  return loadLensRegistry().get(nsid);
}

/** Resets the cache — only used by tests. */
export function _resetLensRegistry(): void {
  cached = null;
}
