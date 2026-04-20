/**
 * Layers-specific OAuth scope profiles.
 *
 * Every scope Layers requests is built from the atproto permission grammar.
 * We explicitly avoid `transition:generic`: clients never grant blanket
 * repository access — they grant exactly the record kinds and endpoints a
 * feature needs, expressed as a combination of permission sets and granular
 * scopes.
 *
 * The profiles below map to the {@link LayersScopeProfile} UI picker. A
 * client metadata document should declare the *maximum* scope — the union of
 * every profile's scope set — because the OAuth authorization request is
 * only allowed to subset the declared maximum.
 *
 * @module
 */

import { formatScopeList, parseScopeList } from './scope-string.js';
import type { Scope } from './types.js';

/**
 * Every permission-set NSID published by Layers. Keep in sync with
 * `layers/lexicons/pub/layers/auth/*.json`.
 */
export const LAYERS_PERMISSION_SETS = {
  readOnly: 'pub.layers.authReadOnly',
  annotator: 'pub.layers.authAnnotator',
  corpusManager: 'pub.layers.authCorpusManager',
  ontologyEditor: 'pub.layers.authOntologyEditor',
  experimenter: 'pub.layers.authExperimenter',
  full: 'pub.layers.authFull',
} as const;

export type LayersPermissionSet = keyof typeof LAYERS_PERMISSION_SETS;

/** The DID/service-fragment the appview answers on for inherit-aud resolution. */
export interface AppviewAudience {
  readonly did: string;
  readonly serviceFragment: string;
}

function includeFor(nsid: string, aud: AppviewAudience): string {
  return `include:${nsid}?aud=${encodeURIComponent(`${aud.did}#${aud.serviceFragment}`)}`;
}

/**
 * Named, opinionated scope profiles offered to end users.
 *
 * A *profile* is a tuple of permission sets + freestanding granular scopes
 * (most commonly blob:*\/* which cannot be bundled in a permission set).
 */
export type LayersScopeProfile =
  | 'login-only'
  | 'read-only'
  | 'annotator'
  | 'corpus-manager'
  | 'ontology-editor'
  | 'experimenter'
  | 'full';

interface ProfileDefinition {
  readonly title: string;
  readonly detail: string;
  readonly sets: readonly LayersPermissionSet[];
  readonly extras: readonly string[];
}

export const LAYERS_SCOPE_PROFILES: Readonly<Record<LayersScopeProfile, ProfileDefinition>> = {
  'login-only': {
    title: 'Sign in',
    detail: 'Verify your identity to sign in. No record access.',
    sets: [],
    extras: [],
  },
  'read-only': {
    title: 'Read records',
    detail: 'Read Layers records indexed by the appview. No writes.',
    sets: ['readOnly'],
    extras: [],
  },
  annotator: {
    title: 'Annotate',
    detail: 'Create annotations, segmentations, alignments, and upload media.',
    sets: ['annotator'],
    extras: ['blob:*/*'],
  },
  'corpus-manager': {
    title: 'Manage corpora',
    detail: 'Create corpora, collections, templates, and resource entries.',
    sets: ['corpusManager'],
    extras: ['blob:*/*'],
  },
  'ontology-editor': {
    title: 'Edit ontologies',
    detail: 'Create and edit ontologies and type definitions.',
    sets: ['ontologyEditor'],
    extras: [],
  },
  experimenter: {
    title: 'Run experiments',
    detail: 'Design experiments, collect judgments, and compute agreement.',
    sets: ['experimenter'],
    extras: [],
  },
  full: {
    title: 'Full access',
    detail: 'Every Layers permission: annotations, corpora, ontologies, experiments, blob uploads.',
    sets: ['full'],
    extras: ['blob:*/*'],
  },
};

/**
 * Builds the OAuth `scope` string for a given profile. The resulting string
 * always starts with `atproto` (identity/login) and, for profiles that
 * reference permission sets, binds every `include:` to the supplied appview
 * audience so `inheritAud` fields resolve correctly.
 */
export function buildLayersScopeString(
  profile: LayersScopeProfile,
  aud: AppviewAudience,
): string {
  const def = LAYERS_SCOPE_PROFILES[profile];
  const parts: string[] = ['atproto'];
  for (const key of def.sets) {
    parts.push(includeFor(LAYERS_PERMISSION_SETS[key], aud));
  }
  for (const extra of def.extras) parts.push(extra);
  return parts.join(' ');
}

/**
 * Returns the scope string declared in the client metadata document — the
 * maximum set of scopes Layers may ever request. The real appview audience is
 * injected by the caller; during build time we use a placeholder that matches
 * the structure validators expect.
 */
export const LAYERS_MAXIMUM_SCOPE = (() => {
  const placeholderAud: AppviewAudience = {
    did: 'did:web:appview.layers.pub',
    serviceFragment: 'layers_appview',
  };
  const parts = new Set<string>(['atproto', 'blob:*/*']);
  for (const nsid of Object.values(LAYERS_PERMISSION_SETS)) {
    parts.add(includeFor(nsid, placeholderAud));
  }
  return [...parts].join(' ');
})();

/**
 * Validates every scope in an incoming string against the permission grammar.
 * Used by the `/callback` handler to assert that no unknown scope reached the
 * session (belt-and-braces alongside the authorization server).
 */
export function validateScopeString(raw: string): Scope[] {
  return parseScopeList(raw);
}

export { formatScopeList };
