/**
 * Query key factories for all 26 Layers record types, cross-references, and search.
 *
 * @remarks
 * Each factory follows a hierarchical key structure that enables granular
 * cache invalidation via TanStack Query. Invalidating a parent key (e.g.,
 * `expressionKeys.all`) also invalidates all child keys (lists, details).
 *
 * @packageDocumentation
 */

// =============================================================================
// CORE LINGUISTIC RECORDS
// =============================================================================

const expressionKeys = {
  all: ['expressions'] as const,
  lists: () => [...expressionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...expressionKeys.lists(), filters] as const,
  details: () => [...expressionKeys.all, 'detail'] as const,
  detail: (uri: string) => [...expressionKeys.details(), uri] as const,
};

const segmentationKeys = {
  all: ['segmentations'] as const,
  lists: () => [...segmentationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...segmentationKeys.lists(), filters] as const,
  details: () => [...segmentationKeys.all, 'detail'] as const,
  detail: (uri: string) => [...segmentationKeys.details(), uri] as const,
};

const annotationLayerKeys = {
  all: ['annotationLayers'] as const,
  lists: () => [...annotationLayerKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...annotationLayerKeys.lists(), filters] as const,
  details: () => [...annotationLayerKeys.all, 'detail'] as const,
  detail: (uri: string) => [...annotationLayerKeys.details(), uri] as const,
};

const clusterSetKeys = {
  all: ['clusterSets'] as const,
  lists: () => [...clusterSetKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...clusterSetKeys.lists(), filters] as const,
  details: () => [...clusterSetKeys.all, 'detail'] as const,
  detail: (uri: string) => [...clusterSetKeys.details(), uri] as const,
};

// =============================================================================
// TYPE SYSTEM RECORDS
// =============================================================================

const ontologyKeys = {
  all: ['ontologies'] as const,
  lists: () => [...ontologyKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...ontologyKeys.lists(), filters] as const,
  details: () => [...ontologyKeys.all, 'detail'] as const,
  detail: (uri: string) => [...ontologyKeys.details(), uri] as const,
};

const typeDefKeys = {
  all: ['typeDefs'] as const,
  lists: () => [...typeDefKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...typeDefKeys.lists(), filters] as const,
  details: () => [...typeDefKeys.all, 'detail'] as const,
  detail: (uri: string) => [...typeDefKeys.details(), uri] as const,
};

// =============================================================================
// CORPUS RECORDS
// =============================================================================

const corpusKeys = {
  all: ['corpora'] as const,
  lists: () => [...corpusKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...corpusKeys.lists(), filters] as const,
  details: () => [...corpusKeys.all, 'detail'] as const,
  detail: (uri: string) => [...corpusKeys.details(), uri] as const,
};

const corpusMembershipKeys = {
  all: ['corpusMemberships'] as const,
  lists: () => [...corpusMembershipKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...corpusMembershipKeys.lists(), filters] as const,
  details: () => [...corpusMembershipKeys.all, 'detail'] as const,
  detail: (uri: string) => [...corpusMembershipKeys.details(), uri] as const,
};

// =============================================================================
// RESOURCE RECORDS
// =============================================================================

const resourceCollectionKeys = {
  all: ['resourceCollections'] as const,
  lists: () => [...resourceCollectionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...resourceCollectionKeys.lists(), filters] as const,
  details: () => [...resourceCollectionKeys.all, 'detail'] as const,
  detail: (uri: string) => [...resourceCollectionKeys.details(), uri] as const,
};

const resourceEntryKeys = {
  all: ['resourceEntries'] as const,
  lists: () => [...resourceEntryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...resourceEntryKeys.lists(), filters] as const,
  details: () => [...resourceEntryKeys.all, 'detail'] as const,
  detail: (uri: string) => [...resourceEntryKeys.details(), uri] as const,
};

const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...templateKeys.lists(), filters] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (uri: string) => [...templateKeys.details(), uri] as const,
};

const fillingKeys = {
  all: ['fillings'] as const,
  lists: () => [...fillingKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...fillingKeys.lists(), filters] as const,
  details: () => [...fillingKeys.all, 'detail'] as const,
  detail: (uri: string) => [...fillingKeys.details(), uri] as const,
};

const collectionMembershipKeys = {
  all: ['collectionMemberships'] as const,
  lists: () => [...collectionMembershipKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...collectionMembershipKeys.lists(), filters] as const,
  details: () => [...collectionMembershipKeys.all, 'detail'] as const,
  detail: (uri: string) => [...collectionMembershipKeys.details(), uri] as const,
};

const templateCompositionKeys = {
  all: ['templateCompositions'] as const,
  lists: () => [...templateCompositionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...templateCompositionKeys.lists(), filters] as const,
  details: () => [...templateCompositionKeys.all, 'detail'] as const,
  detail: (uri: string) => [...templateCompositionKeys.details(), uri] as const,
};

// =============================================================================
// JUDGMENT RECORDS
// =============================================================================

const judgmentSetKeys = {
  all: ['judgmentSets'] as const,
  lists: () => [...judgmentSetKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...judgmentSetKeys.lists(), filters] as const,
  details: () => [...judgmentSetKeys.all, 'detail'] as const,
  detail: (uri: string) => [...judgmentSetKeys.details(), uri] as const,
};

const experimentDefKeys = {
  all: ['experimentDefs'] as const,
  lists: () => [...experimentDefKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...experimentDefKeys.lists(), filters] as const,
  details: () => [...experimentDefKeys.all, 'detail'] as const,
  detail: (uri: string) => [...experimentDefKeys.details(), uri] as const,
};

const agreementReportKeys = {
  all: ['agreementReports'] as const,
  lists: () => [...agreementReportKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...agreementReportKeys.lists(), filters] as const,
  details: () => [...agreementReportKeys.all, 'detail'] as const,
  detail: (uri: string) => [...agreementReportKeys.details(), uri] as const,
};

// =============================================================================
// GRAPH AND ALIGNMENT RECORDS
// =============================================================================

const alignmentKeys = {
  all: ['alignments'] as const,
  lists: () => [...alignmentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...alignmentKeys.lists(), filters] as const,
  details: () => [...alignmentKeys.all, 'detail'] as const,
  detail: (uri: string) => [...alignmentKeys.details(), uri] as const,
};

const graphNodeKeys = {
  all: ['graphNodes'] as const,
  lists: () => [...graphNodeKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...graphNodeKeys.lists(), filters] as const,
  details: () => [...graphNodeKeys.all, 'detail'] as const,
  detail: (uri: string) => [...graphNodeKeys.details(), uri] as const,
};

const graphEdgeKeys = {
  all: ['graphEdges'] as const,
  lists: () => [...graphEdgeKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...graphEdgeKeys.lists(), filters] as const,
  details: () => [...graphEdgeKeys.all, 'detail'] as const,
  detail: (uri: string) => [...graphEdgeKeys.details(), uri] as const,
};

const graphEdgeSetKeys = {
  all: ['graphEdgeSets'] as const,
  lists: () => [...graphEdgeSetKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...graphEdgeSetKeys.lists(), filters] as const,
  details: () => [...graphEdgeSetKeys.all, 'detail'] as const,
  detail: (uri: string) => [...graphEdgeSetKeys.details(), uri] as const,
};

// =============================================================================
// INTEGRATION RECORDS
// =============================================================================

const personaKeys = {
  all: ['personas'] as const,
  lists: () => [...personaKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...personaKeys.lists(), filters] as const,
  details: () => [...personaKeys.all, 'detail'] as const,
  detail: (uri: string) => [...personaKeys.details(), uri] as const,
};

const mediaKeys = {
  all: ['media'] as const,
  lists: () => [...mediaKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...mediaKeys.lists(), filters] as const,
  details: () => [...mediaKeys.all, 'detail'] as const,
  detail: (uri: string) => [...mediaKeys.details(), uri] as const,
};

const eprintKeys = {
  all: ['eprints'] as const,
  lists: () => [...eprintKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...eprintKeys.lists(), filters] as const,
  details: () => [...eprintKeys.all, 'detail'] as const,
  detail: (uri: string) => [...eprintKeys.details(), uri] as const,
};

const dataLinkKeys = {
  all: ['dataLinks'] as const,
  lists: () => [...dataLinkKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...dataLinkKeys.lists(), filters] as const,
  details: () => [...dataLinkKeys.all, 'detail'] as const,
  detail: (uri: string) => [...dataLinkKeys.details(), uri] as const,
};

const changelogKeys = {
  all: ['changelogs'] as const,
  lists: () => [...changelogKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...changelogKeys.lists(), filters] as const,
  details: () => [...changelogKeys.all, 'detail'] as const,
  detail: (uri: string) => [...changelogKeys.details(), uri] as const,
};

// =============================================================================
// CROSS-REFERENCES AND SEARCH
// =============================================================================

const crossReferenceKeys = {
  all: ['crossReferences'] as const,
  lists: () => [...crossReferenceKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...crossReferenceKeys.lists(), filters] as const,
  details: () => [...crossReferenceKeys.all, 'detail'] as const,
  detail: (uri: string) => [...crossReferenceKeys.details(), uri] as const,
};

const searchKeys = {
  all: ['search'] as const,
  lists: () => [...searchKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...searchKeys.lists(), filters] as const,
};

// =============================================================================
// EXTERNAL ANNOTATIONS (margin.at interop)
// =============================================================================

const externalAnnotationKeys = {
  all: ['externalAnnotations'] as const,
  lists: () => [...externalAnnotationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...externalAnnotationKeys.lists(), filters] as const,
};

// =============================================================================
// SIDECAR (DESIGN COMPUTE)
// =============================================================================

const sidecarKeys = {
  all: ['sidecar'] as const,
  resources: () => [...sidecarKeys.all, 'resources'] as const,
  resource: (source: string, filters: Record<string, unknown>) =>
    [...sidecarKeys.resources(), source, filters] as const,
};

export {
  expressionKeys,
  segmentationKeys,
  annotationLayerKeys,
  clusterSetKeys,
  ontologyKeys,
  typeDefKeys,
  corpusKeys,
  corpusMembershipKeys,
  resourceCollectionKeys,
  resourceEntryKeys,
  templateKeys,
  fillingKeys,
  collectionMembershipKeys,
  templateCompositionKeys,
  judgmentSetKeys,
  experimentDefKeys,
  agreementReportKeys,
  alignmentKeys,
  graphNodeKeys,
  graphEdgeKeys,
  graphEdgeSetKeys,
  personaKeys,
  mediaKeys,
  eprintKeys,
  dataLinkKeys,
  changelogKeys,
  crossReferenceKeys,
  searchKeys,
  externalAnnotationKeys,
  sidecarKeys,
};
