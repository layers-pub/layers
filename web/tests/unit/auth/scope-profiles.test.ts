import { describe, expect, it } from 'vitest';

import {
  DEFAULT_APPVIEW_AUDIENCE,
  LAYERS_PERMISSION_SETS,
  LAYERS_SCOPE_PROFILES,
  buildLayersScopeString,
  type LayersScopeProfile,
} from '@/lib/auth/scope-profiles';

describe('buildLayersScopeString (web)', () => {
  const AUD = DEFAULT_APPVIEW_AUDIENCE;

  it('login-only is the atproto sentinel', () => {
    expect(buildLayersScopeString('login-only', AUD)).toBe('atproto');
  });

  it.each(Object.keys(LAYERS_SCOPE_PROFILES) as LayersScopeProfile[])(
    '%s produces a space-separated scope string starting with atproto',
    (profile) => {
      const scope = buildLayersScopeString(profile, AUD);
      expect(scope.startsWith('atproto')).toBe(true);
      expect(scope).not.toContain('transition:generic');
    },
  );

  it('annotator includes the annotator permission set + blob:*/*', () => {
    const scope = buildLayersScopeString('annotator', AUD);
    expect(scope).toContain(`include:${LAYERS_PERMISSION_SETS.annotator}`);
    expect(scope).toContain('blob:*/*');
    expect(scope).toContain(encodeURIComponent(`${AUD.did}#${AUD.serviceFragment}`));
  });

  it('full bundles the full set + blob:*/*', () => {
    const scope = buildLayersScopeString('full', AUD);
    expect(scope).toContain(`include:${LAYERS_PERMISSION_SETS.full}`);
    expect(scope).toContain('blob:*/*');
  });
});
