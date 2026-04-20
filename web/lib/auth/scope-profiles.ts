/**
 * Client-side mirror of the Layers OAuth scope profiles.
 *
 * The source of truth is `src/auth/permissions/layers-scopes.ts` on the
 * backend; this file intentionally duplicates the profile definitions so the
 * browser can build scope strings without importing any Node-only code.
 * Keep it in sync by hand; a unit test on the backend asserts the profile
 * names match.
 *
 * @module
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
    detail:
      'Every Layers permission: annotations, corpora, ontologies, experiments, blob uploads.',
    sets: ['full'],
    extras: ['blob:*/*'],
  },
};

export interface AppviewAudience {
  readonly did: string;
  readonly serviceFragment: string;
}

/**
 * Builds the OAuth `scope` string for a given profile. Mirrors the backend
 * helper exactly so the two sides stay aligned.
 */
export function buildLayersScopeString(
  profile: LayersScopeProfile,
  aud: AppviewAudience,
): string {
  const def = LAYERS_SCOPE_PROFILES[profile];
  const parts: string[] = ['atproto'];
  for (const key of def.sets) {
    const nsid = LAYERS_PERMISSION_SETS[key];
    parts.push(`include:${nsid}?aud=${encodeURIComponent(`${aud.did}#${aud.serviceFragment}`)}`);
  }
  for (const extra of def.extras) parts.push(extra);
  return parts.join(' ');
}

/** Default audience baked into client metadata; override per-deployment. */
export const DEFAULT_APPVIEW_AUDIENCE: AppviewAudience = {
  did: 'did:web:appview.layers.pub',
  serviceFragment: 'layers_appview',
};
