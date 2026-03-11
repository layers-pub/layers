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
  createResourceCollectionRecord,
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
  searchKeys,
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
type TemplateListResponse = components['schemas']['ResourceListTemplatesOutput'];
type TemplateRecordView = components['schemas']['ResourceListTemplatesRecordView'];
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

async function fetchEntries(filters: {
  repo: string;
  limit?: number;
  cursor?: string;
  language?: string;
}): Promise<ResourceEntryListResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.resource.listEntries', {
    params: { query: filters },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch entries',
      undefined,
      '/xrpc/pub.layers.resource.listEntries',
    );
  }

  return data;
}

async function fetchEntry(uri: string): Promise<ResourceEntry> {
  const { data, error } = await api.GET('/xrpc/pub.layers.resource.getEntry', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch entry: ${uri}`,
      undefined,
      '/xrpc/pub.layers.resource.getEntry',
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

/**
 * Fetches resource entries for a given repo.
 *
 * @param filters - query parameters (repo, limit, cursor, language)
 * @returns query result containing the entry list
 */
function useEntries(filters: { repo: string; limit?: number; cursor?: string; language?: string }) {
  return useQuery({
    queryKey: resourceEntryKeys.list(filters),
    queryFn: () => fetchEntries(filters),
    enabled: Boolean(filters.repo),
    staleTime: ENTRY_STALE_TIME,
  });
}

/**
 * Fetches a single resource entry by AT-URI.
 *
 * @param uri - AT-URI of the entry record
 * @returns query result containing the entry
 */
function useEntry(uri: string) {
  return useQuery({
    queryKey: resourceEntryKeys.detail(uri),
    queryFn: () => fetchEntry(uri),
    enabled: Boolean(uri),
    staleTime: ENTRY_STALE_TIME,
  });
}

// =============================================================================
// TEMPLATE FETCH FUNCTIONS
// =============================================================================

async function fetchProjectTemplates(filters: {
  repo: string;
  language?: string;
  limit?: number;
  cursor?: string;
}): Promise<TemplateListResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.resource.listTemplates', {
    params: { query: filters },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch templates',
      undefined,
      '/xrpc/pub.layers.resource.listTemplates',
    );
  }

  return data;
}

async function fetchTemplate(uri: string): Promise<Template> {
  const { data, error } = await api.GET('/xrpc/pub.layers.resource.getTemplate', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch template: ${uri}`,
      undefined,
      '/xrpc/pub.layers.resource.getTemplate',
    );
  }

  return data;
}

// =============================================================================
// TEMPLATE QUERY HOOKS
// =============================================================================

/**
 * Fetches templates for a given repository (user DID).
 *
 * @param repo - DID of the repository owner
 * @param options - optional language, limit, cursor for pagination
 * @returns query result containing the template list
 */
function useProjectTemplates(
  repo: string,
  options?: { language?: string; limit?: number; cursor?: string },
) {
  const filters = { repo, ...options };
  return useQuery({
    queryKey: templateKeys.list(filters),
    queryFn: () => fetchProjectTemplates(filters),
    enabled: Boolean(repo),
    staleTime: ENTRY_STALE_TIME,
  });
}

/**
 * Fetches a single template record by AT-URI.
 *
 * @param uri - AT-URI of the template record
 * @returns query result containing the template
 */
function useTemplate(uri: string) {
  return useQuery({
    queryKey: templateKeys.detail(uri),
    queryFn: () => fetchTemplate(uri),
    enabled: Boolean(uri),
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

// =============================================================================
// NETWORK COLLECTION BROWSING (SEARCH-BASED)
// =============================================================================

/** Normalized collection result from the search endpoint. */
interface NetworkCollectionResult {
  uri: string;
  did: string;
  name: string;
  description?: string;
  language?: string;
  kind?: string;
  entryCount?: number;
}

/** Response shape for useNetworkCollections. */
interface NetworkCollectionSearchResponse {
  collections: NetworkCollectionResult[];
  cursor?: string;
  total: number;
}

/** Parameters for searching published collections on the network. */
interface NetworkCollectionFilters {
  query: string;
  language?: string;
  kind?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Extracts a string field from an untyped search result record.
 */
function getStringField(record: Record<string, unknown>, field: string): string | undefined {
  const val = record[field];
  return typeof val === 'string' ? val : undefined;
}

async function fetchNetworkCollections(
  filters: NetworkCollectionFilters,
): Promise<NetworkCollectionSearchResponse> {
  // Build the search query, appending type filter
  const searchQuery = filters.query.trim();

  // Use the full-text search endpoint filtered to collection records
  const { data, error } = await api.GET('/api/v1/search', {
    params: {
      query: {
        q: searchQuery,
        type: 'pub.layers.resource.collection',
        limit: filters.limit ?? 12,
        cursor: filters.cursor,
      },
    },
  });

  if (error || !data) {
    throw new APIError('Failed to search network collections', undefined, '/api/v1/search');
  }

  // Map search results to normalized collection objects
  const collections: NetworkCollectionResult[] = data.results.map((result) => {
    const record = result.record as Record<string, unknown>;
    return {
      uri: result.uri,
      did: result.did,
      name: getStringField(record, 'name') ?? 'Untitled',
      description: getStringField(record, 'description'),
      language: getStringField(record, 'language'),
      kind: getStringField(record, 'kind'),
      entryCount: typeof record['entryCount'] === 'number' ? record['entryCount'] : undefined,
    };
  });

  // Apply client-side filters that the search endpoint may not support
  const filtered = collections.filter((c) => {
    if (filters.language && c.language !== filters.language) return false;
    if (filters.kind && c.kind !== filters.kind) return false;
    return true;
  });

  return {
    collections: filtered,
    cursor: data.cursor,
    total: data.total,
  };
}

/**
 * Searches for published resource collections across the ATProto network.
 *
 * Uses the appview's full-text search endpoint filtered to collection
 * records. The query must be at least 2 characters for the search to
 * execute. Results are filtered client-side by language and kind when
 * the search endpoint does not support those facets directly.
 *
 * @param filters - search query, language, kind, pagination
 * @returns query result containing normalized collection results
 */
function useNetworkCollections(filters: NetworkCollectionFilters) {
  const hasQuery = filters.query.trim().length >= 2;

  return useQuery({
    queryKey: searchKeys.list({
      type: 'pub.layers.resource.collection',
      q: filters.query,
      language: filters.language,
      kind: filters.kind,
      cursor: filters.cursor,
    }),
    queryFn: () => fetchNetworkCollections(filters),
    enabled: hasQuery,
    staleTime: ENTRY_STALE_TIME,
  });
}

// =============================================================================
// FORK COLLECTION MUTATION
// =============================================================================

/** Parameters for forking a collection to the user's PDS. */
interface ForkCollectionParams {
  agent: Agent;
  authToken: string;
  sourceCollectionUri: string;
  onProgress?: (current: number, total: number) => void;
}

/** Result of a fork operation. */
interface ForkCollectionResult {
  collectionUri: string;
  entryCount: number;
}

/**
 * Forks a collection from the network to the user's PDS.
 *
 * Creates a new collection record in the user's PDS with the same name,
 * description, language, and kind. Then fetches all entries from the
 * source collection (via memberships) and creates copies with membership
 * links. Reports progress via the onProgress callback.
 */
function useForkCollection() {
  const queryClient = useQueryClient();

  return useMutation<ForkCollectionResult, APIError, ForkCollectionParams>({
    mutationFn: async (params) => {
      const { agent, authToken, sourceCollectionUri, onProgress } = params;

      // 1. Fetch the source collection metadata
      const { data: sourceCollection, error: collectionError } = await api.GET(
        '/xrpc/pub.layers.resource.getCollection',
        { params: { query: { uri: sourceCollectionUri } } },
      );

      if (collectionError || !sourceCollection) {
        throw new APIError(
          `Failed to fetch source collection: ${sourceCollectionUri}`,
          undefined,
          '/xrpc/pub.layers.resource.getCollection',
        );
      }

      // 2. Create a new collection in the user's PDS
      const newCollection = await createResourceCollectionRecord(agent, {
        name: sourceCollection.value.name,
        description: sourceCollection.value.description,
        kind: sourceCollection.value.kind,
        language: sourceCollection.value.language,
        version: sourceCollection.value.version,
        ontologyRef: sourceCollection.value.ontologyRef,
      });

      // Sync the new collection immediately (best-effort)
      await syncRecordWithAppview(newCollection.uri, authToken).catch(() => {});

      // 3. Fetch all entries from the source collection (paginated)
      const allMemberships: Array<{
        entryRef: string;
        ordinal?: number;
      }> = [];

      let membershipCursor: string | undefined;
      do {
        const { data: memberships, error: membershipError } = await api.GET(
          '/xrpc/pub.layers.resource.listCollectionMemberships',
          {
            params: {
              query: {
                collectionRef: sourceCollectionUri,
                limit: 100,
                cursor: membershipCursor,
              },
            },
          },
        );

        if (membershipError || !memberships) {
          throw new APIError(
            'Failed to fetch source collection memberships',
            undefined,
            '/xrpc/pub.layers.resource.listCollectionMemberships',
          );
        }

        for (const record of memberships.records) {
          allMemberships.push({
            entryRef: record.value.entryRef,
            ordinal: record.value.ordinal,
          });
        }

        membershipCursor = memberships.cursor;
      } while (membershipCursor);

      const total = allMemberships.length;
      onProgress?.(0, total);

      // 4. For each entry, fetch the source entry, create a copy, and link it
      let copied = 0;
      for (const membership of allMemberships) {
        try {
          // Fetch the source entry
          const { data: sourceEntry, error: entryError } = await api.GET(
            '/xrpc/pub.layers.resource.getEntry',
            { params: { query: { uri: membership.entryRef } } },
          );

          if (entryError || !sourceEntry) {
            // Skip entries that fail to fetch
            copied++;
            onProgress?.(copied, total);
            continue;
          }

          // Create the entry in user's PDS
          const newEntry = await createResourceEntryRecord(agent, {
            form: sourceEntry.value.form,
            lemma: sourceEntry.value.lemma,
            language: sourceEntry.value.language,
            ontologyTypeRef: sourceEntry.value.ontologyTypeRef,
            knowledgeRefs: sourceEntry.value.knowledgeRefs,
            features: sourceEntry.value.features,
            components: sourceEntry.value.components,
            mweKindUri: sourceEntry.value.mweKindUri,
            mweKind: sourceEntry.value.mweKind,
            sourceRef: membership.entryRef,
          });

          // Link entry to the new collection
          await createCollectionMembershipRecord(agent, {
            collectionRef: newCollection.uri,
            entryRef: newEntry.uri,
            ordinal: membership.ordinal,
          });

          // Sync both records (best-effort, fire and forget)
          void Promise.allSettled([syncRecordWithAppview(newEntry.uri, authToken)]);
        } catch {
          // Continue with remaining entries on individual failures
        }

        copied++;
        onProgress?.(copied, total);
      }

      // Final sync delay for DB commit
      await new Promise((resolve) => setTimeout(resolve, SYNC_SETTLE_DELAY));

      return { collectionUri: newCollection.uri, entryCount: copied };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceCollectionKeys.all });
      queryClient.invalidateQueries({ queryKey: resourceEntryKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionMembershipKeys.all });
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
  TemplateListResponse,
  TemplateRecordView,
  Filling,
  ExperimentDef,
  CreateEntryParams,
  DeleteEntryParams,
  CreateTemplateParams,
  CreateFillingParams,
  CreateExperimentDefParams,
  NetworkCollectionResult,
  NetworkCollectionSearchResponse,
  NetworkCollectionFilters,
  ForkCollectionParams,
  ForkCollectionResult,
};
export {
  useProjectCollections,
  useProjectCollection,
  useCollectionEntries,
  useEntries,
  useEntry,
  useProjectTemplates,
  useTemplate,
  useCreateEntry,
  useDeleteEntry,
  useCreateTemplate,
  useCreateFilling,
  useCreateExperimentDef,
  useNetworkCollections,
  useForkCollection,
};
