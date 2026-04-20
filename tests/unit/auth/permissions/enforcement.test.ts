/**
 * Tests for runtime permission enforcement.
 *
 * The enforcer matches a structured access-check against the session's
 * granted permissions using the atproto matching semantics:
 *
 *   - Wildcards (*) grant access to all NSIDs / all DIDs
 *   - Repo actions default to all three if omitted
 *   - Account actions default to `read` if omitted; `manage` grants both
 *   - Blob accept patterns follow HTTP-style type/subtype wildcards
 *   - Identity `*` grants both handle and any future attr
 */

import { describe, expect, it, vi } from 'vitest';

import {
  PermissionSetResolver,
  buildSessionPermissions,
  SessionPermissions,
} from '../../../../src/auth/permissions/index.js';
import type { PermissionSetDocument } from '../../../../src/auth/permissions/permission-set-resolver.js';

function makeResolver(
  docs: Record<string, PermissionSetDocument> = {},
): PermissionSetResolver {
  return new PermissionSetResolver({
    fetcher: async (nsid) => {
      const doc = docs[nsid];
      if (!doc) throw new Error(`no fixture for ${nsid}`);
      return doc;
    },
  });
}

describe('SessionPermissions.check — repo', () => {
  it('grants matching collection + action', async () => {
    const sp = await buildSessionPermissions(
      'atproto repo:pub.layers.expression.expression',
      makeResolver(),
    );
    expect(sp.check({ kind: 'repo', collection: 'pub.layers.expression.expression', action: 'create' }))
      .toMatchObject({ allowed: true });
  });

  it('denies an unrelated collection', async () => {
    const sp = await buildSessionPermissions('atproto repo:pub.layers.persona.persona', makeResolver());
    expect(sp.check({ kind: 'repo', collection: 'pub.layers.corpus.corpus', action: 'create' }))
      .toMatchObject({ allowed: false });
  });

  it('respects action restrictions', async () => {
    const sp = await buildSessionPermissions(
      'atproto repo:pub.layers.persona.persona?action=create',
      makeResolver(),
    );
    expect(sp.check({ kind: 'repo', collection: 'pub.layers.persona.persona', action: 'create' }))
      .toMatchObject({ allowed: true });
    expect(sp.check({ kind: 'repo', collection: 'pub.layers.persona.persona', action: 'delete' }))
      .toMatchObject({ allowed: false });
  });

  it('treats `repo:*` as a total grant', async () => {
    const sp = await buildSessionPermissions('atproto repo:*', makeResolver());
    expect(sp.check({ kind: 'repo', collection: 'anything.anywhere', action: 'update' }))
      .toMatchObject({ allowed: true });
  });
});

describe('SessionPermissions.check — rpc', () => {
  it('matches exact lxm + aud', async () => {
    const sp = await buildSessionPermissions(
      'atproto rpc:pub.layers.persona.getPersona?aud=did%3Aweb%3Aappview.layers.pub%23svc',
      makeResolver(),
    );
    expect(sp.check({
      kind: 'rpc',
      lxm: 'pub.layers.persona.getPersona',
      aud: 'did:web:appview.layers.pub#svc',
    })).toMatchObject({ allowed: true });
  });

  it('honors aud=* wildcard', async () => {
    const sp = await buildSessionPermissions(
      'atproto rpc:app.bsky.moderation.createReport?aud=*',
      makeResolver(),
    );
    expect(sp.check({
      kind: 'rpc',
      lxm: 'app.bsky.moderation.createReport',
      aud: 'did:web:anywhere.example#svc',
    })).toMatchObject({ allowed: true });
  });

  it('denies mismatched aud', async () => {
    const sp = await buildSessionPermissions(
      'atproto rpc:pub.layers.persona.getPersona?aud=did%3Aweb%3Aa.example%23svc',
      makeResolver(),
    );
    expect(sp.check({
      kind: 'rpc',
      lxm: 'pub.layers.persona.getPersona',
      aud: 'did:web:b.example#svc',
    })).toMatchObject({ allowed: false });
  });
});

describe('SessionPermissions.check — blob', () => {
  it('accepts */* as wildcard', async () => {
    const sp = await buildSessionPermissions('atproto blob:*/*', makeResolver());
    expect(sp.check({ kind: 'blob', mimeType: 'video/mp4' })).toMatchObject({ allowed: true });
  });

  it('restricts by type prefix', async () => {
    const sp = await buildSessionPermissions('atproto blob:image/*', makeResolver());
    expect(sp.check({ kind: 'blob', mimeType: 'image/png' })).toMatchObject({ allowed: true });
    expect(sp.check({ kind: 'blob', mimeType: 'video/mp4' })).toMatchObject({ allowed: false });
  });

  it('supports multi-pattern accept', async () => {
    const sp = await buildSessionPermissions(
      'atproto blob?accept=video%2F*&accept=text%2Fhtml',
      makeResolver(),
    );
    expect(sp.check({ kind: 'blob', mimeType: 'text/html' })).toMatchObject({ allowed: true });
    expect(sp.check({ kind: 'blob', mimeType: 'image/png' })).toMatchObject({ allowed: false });
  });
});

describe('SessionPermissions.check — identity and account', () => {
  it('allows identity:* for any attr', async () => {
    const sp = await buildSessionPermissions('atproto identity:*', makeResolver());
    expect(sp.check({ kind: 'identity', attr: 'handle' })).toMatchObject({ allowed: true });
  });

  it('allows account:email (read) and denies manage', async () => {
    const sp = await buildSessionPermissions('atproto account:email', makeResolver());
    expect(sp.check({ kind: 'account', attr: 'email', action: 'read' }))
      .toMatchObject({ allowed: true });
    expect(sp.check({ kind: 'account', attr: 'email', action: 'manage' }))
      .toMatchObject({ allowed: false });
  });

  it('manage implies read', async () => {
    const sp = await buildSessionPermissions('atproto account:repo?action=manage', makeResolver());
    expect(sp.check({ kind: 'account', attr: 'repo', action: 'read' }))
      .toMatchObject({ allowed: true });
    expect(sp.check({ kind: 'account', attr: 'repo', action: 'manage' }))
      .toMatchObject({ allowed: true });
  });
});

describe('SessionPermissions from include: references', () => {
  const BASIC_SET: PermissionSetDocument = {
    lexicon: 1,
    id: 'pub.layers.authAnnotator',
    defs: {
      main: {
        type: 'permission-set',
        title: 'Annotator',
        detail: 'Annotate',
        permissions: [
          {
            type: 'permission',
            resource: 'repo',
            collection: ['pub.layers.annotation.annotationLayer'],
          },
          {
            type: 'permission',
            resource: 'rpc',
            inheritAud: true,
            lxm: ['pub.layers.persona.getPersona'],
          },
        ],
      },
    },
  };

  it('expands includes and binds inheritAud at resolve time', async () => {
    const resolver = makeResolver({ 'pub.layers.authAnnotator': BASIC_SET });
    const aud = 'did:web:appview.layers.pub#svc';
    const sp = await buildSessionPermissions(
      `atproto include:pub.layers.authAnnotator?aud=${encodeURIComponent(aud)}`,
      resolver,
    );
    expect(sp.check({
      kind: 'repo',
      collection: 'pub.layers.annotation.annotationLayer',
      action: 'create',
    })).toMatchObject({ allowed: true });
    expect(sp.check({
      kind: 'rpc',
      lxm: 'pub.layers.persona.getPersona',
      aud,
    })).toMatchObject({ allowed: true });
  });

  it('denies calls to endpoints not in the set', async () => {
    const resolver = makeResolver({ 'pub.layers.authAnnotator': BASIC_SET });
    const aud = 'did:web:appview.layers.pub#svc';
    const sp = await buildSessionPermissions(
      `atproto include:pub.layers.authAnnotator?aud=${encodeURIComponent(aud)}`,
      resolver,
    );
    expect(sp.check({
      kind: 'rpc',
      lxm: 'pub.layers.corpus.getCorpus',
      aud,
    })).toMatchObject({ allowed: false });
  });
});

describe('transition:generic handling', () => {
  it('is not honored as a substitute for granular scopes', async () => {
    const resolver = makeResolver();
    const sp = await buildSessionPermissions('atproto transition:generic', resolver);
    expect(sp.transitionGeneric).toBe(true);
    expect(sp.check({
      kind: 'repo',
      collection: 'pub.layers.expression.expression',
      action: 'create',
    })).toMatchObject({ allowed: false, reason: 'transition-scope-not-honored' });
  });
});

describe('SessionPermissions.writableCollections', () => {
  it('enumerates every collection covered by repo permissions', async () => {
    const sp = await buildSessionPermissions(
      'atproto repo:pub.layers.a repo?collection=pub.layers.b&collection=pub.layers.c',
      makeResolver(),
    );
    const cols = sp.writableCollections();
    expect(cols).toEqual(new Set(['pub.layers.a', 'pub.layers.b', 'pub.layers.c']));
  });
});

describe('buildSessionPermissions error handling', () => {
  it('propagates permission-set resolution errors', async () => {
    const resolver = new PermissionSetResolver({
      fetcher: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    await expect(
      buildSessionPermissions(
        'atproto include:pub.layers.auth.authFull?aud=did%3Aweb%3Aappview.layers.pub%23svc',
        resolver,
      ),
    ).rejects.toThrow(/could not resolve permission set/);
  });
});

describe('SessionPermissions direct instantiation', () => {
  it('accepts a pre-built permission list', () => {
    const sp = new SessionPermissions(
      [{ type: 'atproto' }],
      [{ type: 'permission', resource: 'blob', accept: ['*/*'] }],
    );
    expect(sp.check({ kind: 'blob', mimeType: 'image/webp' })).toMatchObject({ allowed: true });
  });
});
