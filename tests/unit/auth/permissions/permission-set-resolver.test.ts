/**
 * Tests for permission-set resolution, namespace-authority enforcement,
 * caching, and `inheritAud` expansion.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  InMemoryPermissionSetCache,
  PermissionSetResolutionError,
  PermissionSetResolver,
  enforceNamespaceAuthority,
  expandPermissionSet,
  isUnderNamespace,
  namespaceOwner,
  parsePermissionSetDocument,
  type PermissionSetDocument,
} from '../../../../src/auth/permissions/permission-set-resolver.js';
import type { Permission } from '../../../../src/auth/permissions/types.js';

const BASIC_DOC: PermissionSetDocument = {
  lexicon: 1,
  id: 'com.example.authBasic',
  defs: {
    main: {
      type: 'permission-set',
      title: 'Basic',
      detail: 'Basic access',
      permissions: [
        { type: 'permission', resource: 'repo', collection: ['com.example.post'] },
        {
          type: 'permission',
          resource: 'rpc',
          inheritAud: true,
          lxm: ['com.example.getProfile'],
        },
      ],
    },
  },
};

describe('namespaceOwner / isUnderNamespace', () => {
  it('extracts the owner of a set NSID', () => {
    expect(namespaceOwner('com.example.authBasic')).toBe('com.example');
    expect(namespaceOwner('pub.layers.auth.authFull')).toBe('pub.layers.auth');
  });

  it('permits children and self, rejects siblings and parents', () => {
    const owner = 'pub.layers.auth';
    expect(isUnderNamespace(owner, 'pub.layers.auth')).toBe(true);
    expect(isUnderNamespace(owner, 'pub.layers.auth.extra')).toBe(true);
    expect(isUnderNamespace(owner, 'pub.layers.corpus.corpus')).toBe(false);
    expect(isUnderNamespace(owner, 'pub.layers')).toBe(false);
  });
});

describe('enforceNamespaceAuthority', () => {
  it('accepts repo permissions under the set namespace', () => {
    expect(() =>
      enforceNamespaceAuthority('pub.layers.auth.authFull', {
        type: 'permission',
        resource: 'repo',
        collection: ['pub.layers.auth.somethingElse'],
      }),
    ).not.toThrow();
  });

  it('rejects permissions outside the set namespace', () => {
    expect(() =>
      enforceNamespaceAuthority('pub.layers.auth.authFull', {
        type: 'permission',
        resource: 'repo',
        collection: ['app.bsky.feed.post'],
      }),
    ).toThrow(PermissionSetResolutionError);
  });
});

describe('parsePermissionSetDocument', () => {
  it('parses a valid document', () => {
    const resolved = parsePermissionSetDocument(BASIC_DOC, 'com.example.authBasic');
    expect(resolved.nsid).toBe('com.example.authBasic');
    expect(resolved.title).toBe('Basic');
    expect(resolved.permissions).toHaveLength(2);
  });

  it('rejects a document whose id does not match', () => {
    expect(() => parsePermissionSetDocument(BASIC_DOC, 'com.other.authBasic')).toThrow(
      PermissionSetResolutionError,
    );
  });

  it('rejects a non-permission-set document', () => {
    const doc = {
      ...BASIC_DOC,
      defs: { main: { type: 'record' } as never },
    } as unknown as PermissionSetDocument;
    expect(() => parsePermissionSetDocument(doc, BASIC_DOC.id)).toThrow(
      PermissionSetResolutionError,
    );
  });

  it('propagates i18n title/detail maps', () => {
    const doc: PermissionSetDocument = {
      ...BASIC_DOC,
      defs: {
        main: {
          ...BASIC_DOC.defs.main,
          'title:lang': { ja: '基本' },
          'detail:lang': { ja: '基本アクセス' },
        },
      },
    };
    const resolved = parsePermissionSetDocument(doc, BASIC_DOC.id);
    expect(resolved.titleByLang?.ja).toBe('基本');
    expect(resolved.detailByLang?.ja).toBe('基本アクセス');
  });
});

describe('PermissionSetResolver caching', () => {
  it('returns cached value within the stale window', async () => {
    const fetcher = vi.fn(async () => BASIC_DOC);
    const cache = new InMemoryPermissionSetCache();
    const resolver = new PermissionSetResolver({ fetcher, cache });
    await resolver.resolve('com.example.authBasic');
    await resolver.resolve('com.example.authBasic');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after the stale window', async () => {
    const fetcher = vi.fn(async () => BASIC_DOC);
    let now = 0;
    const resolver = new PermissionSetResolver({ fetcher, now: () => now });
    await resolver.resolve('com.example.authBasic');
    now += 25 * 60 * 60 * 1000; // 25 hours later
    await resolver.resolve('com.example.authBasic');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('serves stale-on-error', async () => {
    let calls = 0;
    let now = 0;
    const fetcher = vi.fn(async () => {
      calls++;
      if (calls === 1) return BASIC_DOC;
      throw new Error('network down');
    });
    const resolver = new PermissionSetResolver({ fetcher, now: () => now });
    await resolver.resolve('com.example.authBasic');
    now += 25 * 60 * 60 * 1000;
    const result = await resolver.resolve('com.example.authBasic');
    expect(result.nsid).toBe('com.example.authBasic');
  });

  it('throws after expiration when fetch fails', async () => {
    let calls = 0;
    let now = 0;
    const fetcher = vi.fn(async () => {
      calls++;
      if (calls === 1) return BASIC_DOC;
      throw new Error('network down');
    });
    const resolver = new PermissionSetResolver({ fetcher, now: () => now });
    await resolver.resolve('com.example.authBasic');
    now += 91 * 24 * 60 * 60 * 1000;
    await expect(resolver.resolve('com.example.authBasic')).rejects.toThrow(
      PermissionSetResolutionError,
    );
  });
});

describe('expandPermissionSet', () => {
  it('substitutes inheritAud with the include-level aud', () => {
    const resolved = parsePermissionSetDocument(BASIC_DOC, 'com.example.authBasic');
    const expanded = expandPermissionSet(resolved, 'did:web:api.example.com#svc');
    const rpc = expanded.find((p) => p.resource === 'rpc') as Permission & { resource: 'rpc' };
    expect(rpc).toMatchObject({ aud: 'did:web:api.example.com#svc' });
    expect('inheritAud' in rpc).toBe(false);
  });

  it('drops inheritAud permissions when no aud is supplied', () => {
    const resolved = parsePermissionSetDocument(BASIC_DOC, 'com.example.authBasic');
    const expanded = expandPermissionSet(resolved, undefined);
    expect(expanded).toHaveLength(1); // repo survives, inherit-aud rpc is ignored
    expect(expanded[0]!.resource).toBe('repo');
  });
});
