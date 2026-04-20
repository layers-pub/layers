/**
 * Tests for the atproto OAuth scope string parser.
 *
 * Every fixture below maps to a concrete example in
 * https://atproto.com/specs/permission — the grammar spec is the test
 * oracle. Each example from the spec parses, round-trips, and rejects its
 * documented counter-examples.
 */

import { describe, expect, it } from 'vitest';

import {
  formatScope,
  formatScopeList,
  parsePermissionSetBody,
  parseScopeList,
  parseScopeString,
  ScopeParseError,
} from '../../../../src/auth/permissions/scope-string.js';

describe('parseScopeString — identity/transition sentinels', () => {
  it('parses `atproto` as the identity-only sentinel', () => {
    expect(parseScopeString('atproto')).toEqual({ type: 'atproto' });
  });

  it.each(['generic', 'chat.bsky', 'email'] as const)(
    'parses `transition:%s` variants',
    (variant) => {
      expect(parseScopeString(`transition:${variant}`)).toEqual({
        type: 'transition',
        variant,
      });
    },
  );

  it('rejects unknown transition variants', () => {
    expect(() => parseScopeString('transition:whatever')).toThrow(ScopeParseError);
  });

  it('rejects an empty scope string', () => {
    expect(() => parseScopeString('')).toThrow(ScopeParseError);
  });
});

describe('parseScopeString — repo', () => {
  it('accepts a positional collection with implicit all-actions', () => {
    expect(parseScopeString('repo:app.example.profile')).toEqual({
      type: 'permission',
      resource: 'repo',
      collection: ['app.example.profile'],
    });
  });

  it('accepts explicit actions', () => {
    expect(
      parseScopeString('repo:app.example.profile?action=create&action=update&action=delete'),
    ).toEqual({
      type: 'permission',
      resource: 'repo',
      collection: ['app.example.profile'],
      action: ['create', 'update', 'delete'],
    });
  });

  it('accepts multiple named collections', () => {
    expect(
      parseScopeString('repo?collection=app.example.profile&collection=app.example.post'),
    ).toEqual({
      type: 'permission',
      resource: 'repo',
      collection: ['app.example.profile', 'app.example.post'],
    });
  });

  it('accepts full-wildcard repo', () => {
    expect(parseScopeString('repo:*')).toEqual({
      type: 'permission',
      resource: 'repo',
      collection: ['*'],
    });
  });

  it('accepts delete-only wildcard repo', () => {
    expect(parseScopeString('repo:*?action=delete')).toEqual({
      type: 'permission',
      resource: 'repo',
      collection: ['*'],
      action: ['delete'],
    });
  });

  it('rejects a repo permission with no collection', () => {
    expect(() => parseScopeString('repo')).toThrow(ScopeParseError);
  });

  it('rejects unknown repo actions', () => {
    expect(() => parseScopeString('repo:app.example.post?action=write')).toThrow(
      ScopeParseError,
    );
  });

  it('rejects positional and named collection together', () => {
    expect(() =>
      parseScopeString('repo:app.example.post?collection=app.example.other'),
    ).toThrow(ScopeParseError);
  });
});

describe('parseScopeString — rpc', () => {
  it('accepts lxm + aud', () => {
    expect(
      parseScopeString('rpc:app.example.moderation.createReport?aud=*'),
    ).toEqual({
      type: 'permission',
      resource: 'rpc',
      lxm: ['app.example.moderation.createReport'],
      aud: '*',
    });
  });

  it('accepts lxm=* + concrete aud', () => {
    expect(
      parseScopeString('rpc?lxm=*&aud=did:web:api.example.com%23svc_appview'),
    ).toEqual({
      type: 'permission',
      resource: 'rpc',
      lxm: ['*'],
      aud: 'did:web:api.example.com#svc_appview',
    });
  });

  it('rejects rpc without aud (outside a set)', () => {
    expect(() => parseScopeString('rpc:app.example.getProfile')).toThrow(
      ScopeParseError,
    );
  });

  it('rejects lxm=* and aud=* together', () => {
    expect(() => parseScopeString('rpc?lxm=*&aud=*')).toThrow(ScopeParseError);
  });

  it('rejects inheritAud outside a permission set', () => {
    expect(() => parseScopeString('rpc:foo.bar?inheritAud=true')).toThrow(
      ScopeParseError,
    );
  });
});

describe('parseScopeString — blob', () => {
  it('accepts the canonical */* pattern', () => {
    expect(parseScopeString('blob:*/*')).toEqual({
      type: 'permission',
      resource: 'blob',
      accept: ['*/*'],
    });
  });

  it('accepts multiple named accept patterns', () => {
    expect(parseScopeString('blob?accept=video/*&accept=text/html')).toEqual({
      type: 'permission',
      resource: 'blob',
      accept: ['video/*', 'text/html'],
    });
  });

  it('rejects a malformed MIME pattern', () => {
    expect(() => parseScopeString('blob:plainstring')).toThrow(ScopeParseError);
  });
});

describe('parseScopeString — identity and account', () => {
  it('parses `identity:handle`', () => {
    expect(parseScopeString('identity:handle')).toEqual({
      type: 'permission',
      resource: 'identity',
      attr: 'handle',
    });
  });

  it('parses `identity:*`', () => {
    expect(parseScopeString('identity:*')).toEqual({
      type: 'permission',
      resource: 'identity',
      attr: '*',
    });
  });

  it('parses `account:email` as read-by-default', () => {
    expect(parseScopeString('account:email')).toEqual({
      type: 'permission',
      resource: 'account',
      attr: 'email',
    });
  });

  it('parses `account:repo?action=manage`', () => {
    expect(parseScopeString('account:repo?action=manage')).toEqual({
      type: 'permission',
      resource: 'account',
      attr: 'repo',
      action: 'manage',
    });
  });

  it('rejects unknown account attrs and actions', () => {
    expect(() => parseScopeString('account:unknown')).toThrow(ScopeParseError);
    expect(() => parseScopeString('account:email?action=nope')).toThrow(ScopeParseError);
  });
});

describe('parseScopeString — include', () => {
  it('parses include with aud', () => {
    expect(
      parseScopeString('include:app.example.authFull?aud=did:web:api.example.com%23svc_chat'),
    ).toEqual({
      type: 'include',
      nsid: 'app.example.authFull',
      aud: 'did:web:api.example.com#svc_chat',
    });
  });

  it('parses include without aud', () => {
    expect(parseScopeString('include:app.example.authFull')).toEqual({
      type: 'include',
      nsid: 'app.example.authFull',
    });
  });
});

describe('parseScopeString — grammar pathology', () => {
  it.each([
    'resource',
    'resource:positional?key=val',
    'resource:',
    'resource:?',
    'resource:&',
    'resource?',
  ])('rejects the syntactically-valid but semantically-invalid `%s`', (bad) => {
    expect(() => parseScopeString(bad)).toThrow(ScopeParseError);
  });

  it('rejects non-ASCII parameter values', () => {
    expect(() => parseScopeString('resource:positional?key=québec')).toThrow(ScopeParseError);
  });
});

describe('formatScope round-trip', () => {
  const fixtures = [
    'atproto',
    'transition:generic',
    'repo:app.example.profile',
    'repo?collection=app.example.a&collection=app.example.b',
    'repo:app.example.post?action=create&action=update',
    'repo:*',
    'repo:*?action=delete',
    'rpc:app.example.getProfile?aud=did%3Aweb%3Aapi.example.com%23svc',
    'blob:*/*',
    'blob?accept=video%2F*&accept=text%2Fhtml',
    'identity:*',
    'identity:handle',
    'account:email',
    'account:repo?action=manage',
    'include:app.example.authFull?aud=did%3Aweb%3Aapi.example.com%23svc_chat',
  ];

  for (const raw of fixtures) {
    it(`round-trips \`${raw}\``, () => {
      const parsed = parseScopeString(raw);
      const formatted = formatScope(parsed);
      expect(parseScopeString(formatted)).toEqual(parsed);
    });
  }
});

describe('parseScopeList', () => {
  it('parses a realistic oauth scope value', () => {
    const raw =
      'atproto repo:com.example.post repo:com.example.like blob:*/* include:pub.layers.auth.authAnnotator?aud=did%3Aweb%3Aappview.layers.pub%23layers_appview';
    const scopes = parseScopeList(raw);
    expect(scopes).toHaveLength(5);
    expect(scopes[0]).toEqual({ type: 'atproto' });
    expect(scopes[1]).toMatchObject({ resource: 'repo', collection: ['com.example.post'] });
    expect(scopes[3]).toMatchObject({ resource: 'blob', accept: ['*/*'] });
    expect(scopes[4]).toEqual({
      type: 'include',
      nsid: 'pub.layers.auth.authAnnotator',
      aud: 'did:web:appview.layers.pub#layers_appview',
    });
  });

  it('serializes back to a deterministic string', () => {
    const raw = 'atproto repo:com.example.post blob:*/*';
    const out = formatScopeList(parseScopeList(raw));
    expect(out).toBe('atproto repo:com.example.post blob:*/*');
  });
});

describe('parsePermissionSetBody', () => {
  it('accepts repo + rpc-with-inheritAud entries, rejects forbidden resources', () => {
    const result = parsePermissionSetBody('com.example.authBasic', [
      { type: 'permission', resource: 'repo', collection: ['com.example.post'] },
      { type: 'permission', resource: 'rpc', inheritAud: true, lxm: ['com.example.getProfile'] },
      { type: 'permission', resource: 'blob', accept: ['*/*'] }, // should be rejected
      { type: 'permission', resource: 'identity', attr: 'handle' }, // should be rejected
      { type: 'permission', resource: 'account', attr: 'email' }, // should be rejected
    ]);
    expect(result.permissions).toHaveLength(2);
    expect(result.rejected).toHaveLength(3);
  });

  it('rejects wildcards inside a set', () => {
    const result = parsePermissionSetBody('com.example.authBasic', [
      { type: 'permission', resource: 'repo', collection: ['*'] },
      { type: 'permission', resource: 'rpc', inheritAud: true, lxm: ['*'] },
    ]);
    expect(result.permissions).toHaveLength(0);
    expect(result.rejected).toHaveLength(2);
  });

  it('rejects rpc entries with concrete DID aud', () => {
    const result = parsePermissionSetBody('com.example.authBasic', [
      { type: 'permission', resource: 'rpc', aud: 'did:web:api.example.com#svc', lxm: ['x.y'] },
    ]);
    expect(result.permissions).toHaveLength(0);
    expect(result.rejected[0]).toMatch(/concrete DID aud/);
  });
});
