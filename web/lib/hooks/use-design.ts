/**
 * TanStack Query hooks for the /design section.
 *
 * @remarks
 * Provides read queries for resource collections (filtered as "projects"),
 * resource entries, and mutations for creating entries, templates, fillings,
 * experiment definitions, and collection memberships. Mutations write to the
 * user's PDS via the ATProto agent, then request immediate indexing from the
 * appview so the UI updates without waiting for the firehose.
 *
 * @packageDocumentation
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Agent } from '@atproto/api';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import {
  createResourceEntryRecord,
  createCollectionMembershipRecord,
  createTemplateRecord,
  createFillingRecord,
  createExperimentDefRecord,
  deleteRecord,
  syncRecordWithAppview,
  syncDeleteWithAppview,
} from '@/lib/atproto/record-creator';
import { APIError } from '@/lib/errors';

import {
  resourceCollectionKeys,
  resourceEntryKeys,
  collectionMembershipKeys,
  templateKeys,
  fillingKeys,
  experimentDefKeys,
} from './keys';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Stale time for project collection queries (2 minutes). */
const PROJECT_STALE_TIME = 120_000;

/** Stale time for entry queries (60 seconds). */
const ENTRY_STALE_TIME = 60_000;

/** Delay after sync to allow DB transaction commit (ms). */
const SYNC_SETTLE_DELAY = 100;

// =============================================================================
// TYPES
// =============================================================================

type ResourceCollection = components['schemas']['ResourceGetCollectionOutput'];
type ResourceCollectionListResponse = components['schemas']['ResourceListCollectionsOutput'];
type ResourceEntry = components['schemas']['ResourceGetEntryOutput'];
type ResourceEntryListResponse = components['schemas']['ResourceListEntriesOutput'];
type CollectionMembershipListResponse =
  components['schemas']['ResourceListCollectionMembershipsOutput'];
type Template = components['schemas']['ResourceGetTemplateOutput'];
type Filling = components['schemas']['ResourceGetFillingOutput'];
type ExperimentDef = components['schemas']['JudgmentGetExperimentDefOutput'];

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

async function fetchProjectCollections(filters: {
  repo?: string;
  limit?: number;
  cursor?: string;
  language?: string;
}): Promise<ResourceCollectionListResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.resource.listCollections', {
    params: {
      query: { ...filters, kind: 'stimulus-pool', repo: filters.repo ?? '' } as {
        repo: string;
        kind?: string;
        language?: string;
        limit?: number;
        cursor?: string;
      },
    },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch project collections',
      undefined,
      '/xrpc/pub.layers.resource.listCollections',
    );
  }

  return data;
}

async function fetchProjectCollection(uri: string): Promise<ResourceCollection> {
  const { data, error } = await api.GET('/xrpc/pub.layers.resource.getCollection', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch collection: ${uri}`,
      undefined,
      '/xrpc/pub.layers.resource.getCollection',
    );
  }

  return data;
}

async function fetchCollectionEntries(filters: {
  collectionRef: string;
  limit?: number;
  cursor?: string;
}): Promise<CollectionMembershipListResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.resource.listCollectionMemberships', {
    params: { query: filters },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch collection entries',
      undefined,
      '/xrpc/pub.layers.resource.listCollectionMemberships',
    );
  }

  return data;
}

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetches resource collections filtered to stimulus-pool kind (used as
 * "projects" in the /design section).
 *
 * @param filters - query parameters (repo, limit, cursor, language)
 * @returns query result containing the collection list
 */
function useProjectCollections(filters: {
  repo?: string;
  limit?: number;
  cursor?: string;
  language?: string;
}) {
  return useQuery({
    queryKey: resourceCollectionKeys.list({ ...filters, kind: 'stimulus-pool' }),
    queryFn: () => fetchProjectCollections(filters),
    staleTime: PROJECT_STALE_TIME,
  });
}

/**
 * Fetches a single resource collection by AT-URI.
 *
 * @param uri - AT-URI of the collection record
 * @returns query result containing the collection, or an error
 */
function useProjectCollection(uri: string) {
  return useQuery({
    queryKey: resourceCollectionKeys.detail(uri),
    queryFn: () => fetchProjectCollection(uri),
    enabled: Boolean(uri),
    staleTime: PROJECT_STALE_TIME,
  });
}

/**
 * Fetches collection memberships for a given collection, which links
 * entries to the collection.
 *
 * @param collectionRef - AT-URI of the collection
 * @param options - optional limit and cursor for pagination
 * @returns query result containing the membership list
 */
function useCollectionEntries(
  collectionRef: string,
  options?: { limit?: number; cursor?: string },
) {
  const filters = { collectionRef, ...options };
  return useQuery({
    queryKey: collectionMembershipKeys.list(filters),
    queryFn: () => fetchCollectionEntries(filters),
    enabled: Boolean(collectionRef),
    staleTime: ENTRY_STALE_TIME,
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/** Parameters for creating an entry and linking it to a collection. */
interface CreateEntryParams {
  agent: Agent;
  authToken: string;
  collectionRef: string;
  form: string;
  lemma?: string;
  language?: string;
  features?: Array<{ key: string; value: string }>;
  ordinal?: number;
}

/**
 * Creates a resource entry in the user's PDS and links it to a collection
 * via a collectionMembership record. Both records are immediately indexed.
 */
function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation<{ entryUri: string; membershipUri: string }, APIError, CreateEntryParams>({
    mutationFn: async (params) => {
      const featureMap = params.features?.length ? { entries: params.features } : undefined;

      const entryResult = await createResourceEntryRecord(params.agent, {
        form: params.form,
        lemma: params.lemma,
        language: params.language,
        features: featureMap,
      });

      const membershipResult = await createCollectionMembershipRecord(params.agent, {
        collectionRef: params.collectionRef,
        entryRef: entryResult.uri,
        ordinal: params.ordinal,
      });

      // Immediate indexing (best-effort)
      await Promise.allSettled([
        syncRecordWithAppview(entryResult.uri, params.authToken),
        syncRecordWithAppview(membershipResult.uri, params.authToken),
      ]);

      await new Promise((resolve) => setTimeout(resolve, SYNC_SETTLE_DELAY));

      return { entryUri: entryResult.uri, membershipUri: membershipResult.uri };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: resourceEntryKeys.all });
      queryClient.invalidateQueries({
        queryKey: collectionMembershipKeys.list({ collectionRef: variables.collectionRef }),
      });
    },
  });
}

/** Parameters for deleting an entry and its collection membership. */
interface DeleteEntryParams {
  agent: Agent;
  authToken: string;
  entryUri: string;
  membershipUri: string;
  collectionRef: string;
}

/**
 * Deletes a resource entry and its collection membership from the user's PDS.
 * Both records are immediately removed from the appview index.
 */
function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation<void, APIError, DeleteEntryParams>({
    mutationFn: async (params) => {
      await Promise.all([
        deleteRecord(params.agent, params.entryUri),
        deleteRecord(params.agent, params.membershipUri),
      ]);

      // Immediate deletion indexing (best-effort)
      await Promise.allSettled([
        syncDeleteWithAppview(params.entryUri, params.authToken),
        syncDeleteWithAppview(params.membershipUri, params.authToken),
      ]);

      await new Promise((resolve) => setTimeout(resolve, SYNC_SETTLE_DELAY));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: resourceEntryKeys.all });
      queryClient.invalidateQueries({
        queryKey: collectionMembershipKeys.list({ collectionRef: variables.collectionRef }),
      });
    },
  });
}

/** Parameters for creating a template record. */
interface CreateTemplateParams {
  agent: Agent;
  authToken: string;
  text: string;
  name?: string;
  language?: string;
  slots: Array<{
    name: string;
    description?: string;
    required?: boolean;
    defaultValue?: string;
    collectionRef?: string;
  }>;
  constraints: Array<{
    expression: string;
    expressionFormat?: string;
    scope?: string;
    description?: string;
  }>;
  experimentRef?: string;
}

/**
 * Creates a template record in the user's PDS with immediate indexing.
 */
function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation<{ uri: string }, APIError, CreateTemplateParams>({
    mutationFn: async (params) => {
      const result = await createTemplateRecord(params.agent, {
        text: params.text,
        name: params.name,
        language: params.language,
        slots: params.slots,
        constraints: params.constraints.length > 0 ? params.constraints : undefined,
        experimentRef: params.experimentRef,
      });

      await syncRecordWithAppview(result.uri, params.authToken);
      await new Promise((resolve) => setTimeout(resolve, SYNC_SETTLE_DELAY));

      return { uri: result.uri };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

/** Parameters for creating a filling record. */
interface CreateFillingParams {
  agent: Agent;
  authToken: string;
  templateRef: string;
  slotFillings: Array<{
    slotName: string;
    entryRef?: string;
    literalValue?: string;
  }>;
  renderedText?: string;
  strategy?: string;
}

/**
 * Creates a filling record in the user's PDS with immediate indexing.
 */
function useCreateFilling() {
  const queryClient = useQueryClient();

  return useMutation<{ uri: string }, APIError, CreateFillingParams>({
    mutationFn: async (params) => {
      const result = await createFillingRecord(params.agent, {
        templateRef: params.templateRef,
        slotFillings: params.slotFillings,
        renderedText: params.renderedText,
        strategy: params.strategy as
          | 'exhaustive'
          | 'random'
          | 'stratified'
          | 'mlm'
          | 'csp'
          | 'mixed'
          | 'manual'
          | 'custom'
          | undefined,
      });

      await syncRecordWithAppview(result.uri, params.authToken);
      await new Promise((resolve) => setTimeout(resolve, SYNC_SETTLE_DELAY));

      return { uri: result.uri };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: fillingKeys.all });
      queryClient.invalidateQueries({
        queryKey: fillingKeys.list({ templateRef: variables.templateRef }),
      });
    },
  });
}

/** Parameters for creating an experiment definition record. */
interface CreateExperimentDefParams {
  agent: Agent;
  authToken: string;
  name: string;
  description?: string;
  measureType?: string;
  taskType?: string;
  guidelines?: string;
  templateRefs?: string[];
  collectionRefs?: string[];
}

/**
 * Creates an experiment definition record in the user's PDS with
 * immediate indexing.
 */
function useCreateExperimentDef() {
  const queryClient = useQueryClient();

  return useMutation<{ uri: string }, APIError, CreateExperimentDefParams>({
    mutationFn: async (params) => {
      const result = await createExperimentDefRecord(params.agent, {
        name: params.name,
        description: params.description,
        measureType: params.measureType as
          | 'acceptability'
          | 'inference'
          | 'similarity'
          | 'plausibility'
          | 'comprehension'
          | 'preference'
          | 'extraction'
          | 'reading-time'
          | 'production'
          | 'custom'
          | undefined,
        taskType: params.taskType as
          | 'forced-choice'
          | 'ordinal-scale'
          | 'magnitude'
          | 'binary'
          | 'free-text'
          | 'cloze'
          | 'drag-reorder'
          | 'highlighting'
          | 'custom'
          | undefined,
        guidelines: params.guidelines,
        templateRefs: params.templateRefs,
        collectionRefs: params.collectionRefs,
      });

      await syncRecordWithAppview(result.uri, params.authToken);
      await new Promise((resolve) => setTimeout(resolve, SYNC_SETTLE_DELAY));

      return { uri: result.uri };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentDefKeys.all });
    },
  });
}

export type {
  ResourceCollection,
  ResourceCollectionListResponse,
  ResourceEntry,
  ResourceEntryListResponse,
  CollectionMembershipListResponse,
  Template,
  Filling,
  ExperimentDef,
  CreateEntryParams,
  DeleteEntryParams,
  CreateTemplateParams,
  CreateFillingParams,
  CreateExperimentDefParams,
};
export {
  useProjectCollections,
  useProjectCollection,
  useCollectionEntries,
  useCreateEntry,
  useDeleteEntry,
  useCreateTemplate,
  useCreateFilling,
  useCreateExperimentDef,
};
