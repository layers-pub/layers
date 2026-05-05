/**
 * ATProto record creation utilities for Layers.
 *
 * All user data lives in user PDSes. The Layers appview only indexes
 * from the firehose; it never writes to user repositories.
 *
 * @module
 */

import type { Agent } from '@atproto/api';
import type { BlobRef } from '@atproto/lexicon';

import type * as ExpressionRecord from '@/lib/api/generated/types/pub/layers/expression/expression';
import type * as CorpusRecord from '@/lib/api/generated/types/pub/layers/corpus/corpus';
import type * as OntologyRecord from '@/lib/api/generated/types/pub/layers/ontology/ontology';
import type * as TypeDefRecord from '@/lib/api/generated/types/pub/layers/ontology/typeDef';
import type * as AnnotationLayerRecord from '@/lib/api/generated/types/pub/layers/annotation/annotationLayer';
import type * as ClusterSetRecord from '@/lib/api/generated/types/pub/layers/annotation/clusterSet';
import type * as SegmentationRecord from '@/lib/api/generated/types/pub/layers/segmentation/segmentation';
import type * as AlignmentRecord from '@/lib/api/generated/types/pub/layers/alignment/alignment';
import type * as MediaRecord from '@/lib/api/generated/types/pub/layers/media/media';
import type * as ResourceEntryRecord from '@/lib/api/generated/types/pub/layers/resource/entry';
import type * as ResourceCollectionRecord from '@/lib/api/generated/types/pub/layers/resource/collection';
import type * as CollectionMembershipRecord from '@/lib/api/generated/types/pub/layers/resource/collectionMembership';
import type * as TemplateRecord from '@/lib/api/generated/types/pub/layers/resource/template';
import type * as FillingRecord from '@/lib/api/generated/types/pub/layers/resource/filling';
import type * as TemplateCompositionRecord from '@/lib/api/generated/types/pub/layers/resource/templateComposition';
import type * as ExperimentDefRecord from '@/lib/api/generated/types/pub/layers/judgment/experimentDef';
import type * as AnnotationDefs from '@/lib/api/generated/types/pub/layers/annotation/defs';
import type * as SegmentationDefs from '@/lib/api/generated/types/pub/layers/segmentation/defs';
import type * as ResourceDefs from '@/lib/api/generated/types/pub/layers/resource/defs';
import type * as JudgmentDefs from '@/lib/api/generated/types/pub/layers/judgment/defs';
import type * as LayersDefs from '@/lib/api/generated/types/pub/layers/defs';
import { getBaseUrl } from '@/lib/api/client';

// =============================================================================
// Types
// =============================================================================

/** Result of creating an ATProto record. */
interface CreateRecordResult {
  /** AT-URI of the created record. */
  uri: string;
  /** CID of the created record. */
  cid: string;
}

/** Result of requesting immediate indexing from the appview. */
interface SyncResult {
  /** Whether the record was indexed. */
  indexed: boolean;
  /** Error message if indexing failed. */
  error?: string;
}

/** Result of requesting immediate deletion from the appview. */
interface SyncDeleteResult {
  /** Whether the record was deleted from the index. */
  deleted: boolean;
  /** Error message if deletion failed. */
  error?: string;
}

// =============================================================================
// Collection NSIDs
// =============================================================================

const COLLECTIONS = {
  expression: 'pub.layers.expression.expression',
  corpus: 'pub.layers.corpus.corpus',
  ontology: 'pub.layers.ontology.ontology',
  typeDef: 'pub.layers.ontology.typeDef',
  annotationLayer: 'pub.layers.annotation.annotationLayer',
  clusterSet: 'pub.layers.annotation.clusterSet',
  segmentation: 'pub.layers.segmentation.segmentation',
  alignment: 'pub.layers.alignment.alignment',
  media: 'pub.layers.media.media',
  membership: 'pub.layers.corpus.membership',
  experimentDef: 'pub.layers.judgment.experimentDef',
  judgmentSet: 'pub.layers.judgment.judgmentSet',
  agreementReport: 'pub.layers.judgment.agreementReport',
  changelogEntry: 'pub.layers.changelog.entry',
  graphNode: 'pub.layers.graph.graphNode',
  graphEdge: 'pub.layers.graph.graphEdge',
  graphEdgeSet: 'pub.layers.graph.graphEdgeSet',
  persona: 'pub.layers.persona.persona',
  eprint: 'pub.layers.eprint.eprint',
  dataLink: 'pub.layers.eprint.dataLink',
  entry: 'pub.layers.resource.entry',
  collection: 'pub.layers.resource.collection',
  collectionMembership: 'pub.layers.resource.collectionMembership',
  template: 'pub.layers.resource.template',
  templateComposition: 'pub.layers.resource.templateComposition',
  filling: 'pub.layers.resource.filling',
} as const;

// =============================================================================
// Helpers
// =============================================================================

function getAuthenticatedDid(agent: Agent): string {
  const did = agent.assertDid;
  return did;
}

// =============================================================================
// Record creators
// =============================================================================

/** Creates an expression record in the user's PDS. */
async function createExpressionRecord(
  agent: Agent,
  data: {
    text: string;
    languages?: readonly string[];
    kind?: ExpressionRecord.Main['kind'];
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: ExpressionRecord.Main = {
    $type: 'pub.layers.expression.expression',
    id: crypto.randomUUID(),
    kind: data.kind ?? 'sentence',
    text: data.text,
    languages: data.languages ? Array.from(data.languages) : undefined,
    createdAt: new Date().toISOString(),
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.expression,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/** Creates a corpus record in the user's PDS. */
async function createCorpusRecord(
  agent: Agent,
  data: {
    name: string;
    description?: string;
    languages?: readonly string[];
    license?: string;
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: CorpusRecord.Main = {
    $type: 'pub.layers.corpus.corpus',
    name: data.name,
    description: data.description,
    languages: data.languages ? Array.from(data.languages) : undefined,
    license: data.license,
    createdAt: new Date().toISOString(),
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.corpus,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/** Creates an ontology record in the user's PDS. */
async function createOntologyRecord(
  agent: Agent,
  data: {
    name: string;
    description?: string;
    version?: string;
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: OntologyRecord.Main = {
    $type: 'pub.layers.ontology.ontology',
    name: data.name,
    description: data.description,
    version: data.version,
    createdAt: new Date().toISOString(),
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.ontology,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/** Creates a typeDef record in the user's PDS. */
async function createTypeDefRecord(
  agent: Agent,
  data: {
    name: string;
    gloss?: string;
    parentTypeRef?: string;
    ontologyRef: string;
    typeKind?: TypeDefRecord.Main['typeKind'];
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: TypeDefRecord.Main = {
    $type: 'pub.layers.ontology.typeDef',
    name: data.name,
    typeKind: data.typeKind ?? 'entity-type',
    gloss: data.gloss,
    parentTypeRef: data.parentTypeRef,
    ontologyRef: data.ontologyRef,
    createdAt: new Date().toISOString(),
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.typeDef,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates an annotation layer record in the user's PDS.
 *
 * Annotation layers are the primary annotation container. Each layer holds
 * an array of annotations over a single expression. The kind, subkind,
 * and formalism fields control how the appview renders the annotations.
 */
async function createAnnotationLayerRecord(
  agent: Agent,
  data: {
    expression: string;
    kind: AnnotationLayerRecord.Main['kind'];
    annotations: AnnotationDefs.Annotation[];
    subkind?: AnnotationLayerRecord.Main['subkind'];
    formalism?: AnnotationLayerRecord.Main['formalism'];
    ontologyRef?: string;
    tokenizationId?: LayersDefs.Uuid;
    segmentationRef?: string;
    labelSet?: string;
    sourceMethod?: AnnotationLayerRecord.Main['sourceMethod'];
    languages?: readonly string[];
    parentLayerRef?: string;
    rank?: number;
    alternativesRef?: string;
    metadata?: LayersDefs.AnnotationMetadata;
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: AnnotationLayerRecord.Main = {
    $type: COLLECTIONS.annotationLayer,
    expression: data.expression,
    kind: data.kind,
    annotations: data.annotations,
    subkind: data.subkind,
    formalism: data.formalism,
    ontologyRef: data.ontologyRef,
    tokenizationId: data.tokenizationId,
    labelSet: data.labelSet,
    sourceMethod: data.sourceMethod,
    languages: data.languages ? Array.from(data.languages) : undefined,
    parentLayerRef: data.parentLayerRef,
    rank: data.rank,
    alternativesRef: data.alternativesRef,
    metadata: data.metadata,
    createdAt: new Date().toISOString(),
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.annotationLayer,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates a segmentation record in the user's PDS.
 *
 * Segmentations decompose an expression into one or more tokenizations.
 * Each tokenization is an ordered sequence of tokens that annotation
 * layers can reference by index.
 */
async function createSegmentationRecord(
  agent: Agent,
  data: {
    expression: string;
    tokenizations: SegmentationDefs.Tokenization[];
    metadata?: LayersDefs.AnnotationMetadata;
    knowledgeRefs?: LayersDefs.KnowledgeRef[];
    features?: LayersDefs.FeatureMap;
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: SegmentationRecord.Main = {
    $type: COLLECTIONS.segmentation,
    expression: data.expression,
    tokenizations: data.tokenizations,
    metadata: data.metadata,
    knowledgeRefs: data.knowledgeRefs,
    features: data.features,
    createdAt: new Date().toISOString(),
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.segmentation,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates an alignment record in the user's PDS.
 *
 * Alignments establish many-to-many correspondences between parallel
 * sequences: tokenizations, annotation layers, expressions (for parallel
 * text), or tiers (for interlinear glossing).
 */
async function createAlignmentRecord(
  agent: Agent,
  data: {
    kind: AlignmentRecord.Main['kind'];
    links: LayersDefs.AlignmentLink[];
    expression?: string;
    source?: LayersDefs.ObjectRef;
    target?: LayersDefs.ObjectRef;
    subkind?: AlignmentRecord.Main['subkind'];
    sourceLang?: string;
    targetLang?: string;
    metadata?: LayersDefs.AnnotationMetadata;
    knowledgeRefs?: LayersDefs.KnowledgeRef[];
    features?: LayersDefs.FeatureMap;
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: AlignmentRecord.Main = {
    $type: COLLECTIONS.alignment,
    kind: data.kind,
    links: data.links,
    expression: data.expression,
    source: data.source,
    target: data.target,
    subkind: data.subkind,
    sourceLang: data.sourceLang,
    targetLang: data.targetLang,
    metadata: data.metadata,
    knowledgeRefs: data.knowledgeRefs,
    features: data.features,
    createdAt: new Date().toISOString(),
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.alignment,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates a cluster set record in the user's PDS.
 *
 * Cluster sets group annotations into equivalence classes. Used for
 * coreference resolution, bridging anaphora, and cross-document entity
 * linking.
 */
async function createClusterSetRecord(
  agent: Agent,
  data: {
    kind: ClusterSetRecord.Main['kind'];
    clusters: AnnotationDefs.Cluster[];
    expression?: string;
    expressionRefs?: string[];
    corpusRef?: string;
    layerRef?: string;
    metadata?: LayersDefs.AnnotationMetadata;
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: ClusterSetRecord.Main = {
    $type: COLLECTIONS.clusterSet,
    kind: data.kind,
    clusters: data.clusters,
    expression: data.expression,
    expressionRefs: data.expressionRefs,
    corpusRef: data.corpusRef,
    layerRef: data.layerRef,
    metadata: data.metadata,
    createdAt: new Date().toISOString(),
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.clusterSet,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates a media record in the user's PDS.
 *
 * Media records reference audio, video, image, or document data
 * associated with expressions. The blob field holds a BlobRef (never
 * raw blob data); alternatively, externalUri points to externally
 * hosted media.
 */
async function createMediaRecord(
  agent: Agent,
  data: {
    kind: MediaRecord.Main['kind'];
    title?: string;
    description?: string;
    blob?: BlobRef;
    externalUri?: string;
    mimeType?: string;
    durationMs?: number;
    fileSizeBytes?: number;
    languages?: readonly string[];
    metadata?: LayersDefs.AnnotationMetadata;
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: MediaRecord.Main = {
    $type: COLLECTIONS.media,
    kind: data.kind,
    title: data.title,
    description: data.description,
    blob: data.blob,
    externalUri: data.externalUri,
    mimeType: data.mimeType,
    durationMs: data.durationMs,
    fileSizeBytes: data.fileSizeBytes,
    languages: data.languages ? Array.from(data.languages) : undefined,
    metadata: data.metadata,
    createdAt: new Date().toISOString(),
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.media,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

// =============================================================================
// Resource and design record creators
// =============================================================================

/**
 * Creates a resource entry record in the user's PDS (or a corpus PDS
 * when targetAgent is provided).
 *
 * Resource entries represent lexical items, frame elements, paradigm
 * cells, or other structured linguistic data that populate resource
 * collections.
 */
async function createResourceEntryRecord(
  agent: Agent,
  data: {
    form: string;
    lemma?: string;
    languages?: readonly string[];
    ontologyTypeRef?: string;
    knowledgeRefs?: LayersDefs.KnowledgeRef[];
    features?: LayersDefs.FeatureMap;
    components?: ResourceDefs.MweComponent[];
    mweKindUri?: string;
    mweKind?: ResourceEntryRecord.Main['mweKind'];
    sourceRef?: string;
    metadata?: LayersDefs.AnnotationMetadata;
  },
  targetAgent?: Agent,
): Promise<CreateRecordResult> {
  const writeAgent = targetAgent ?? agent;
  const did = getAuthenticatedDid(writeAgent);

  const record: ResourceEntryRecord.Main = {
    $type: COLLECTIONS.entry,
    form: data.form,
    lemma: data.lemma,
    languages: data.languages ? Array.from(data.languages) : undefined,
    ontologyTypeRef: data.ontologyTypeRef,
    knowledgeRefs: data.knowledgeRefs,
    features: data.features,
    components: data.components,
    mweKindUri: data.mweKindUri,
    mweKind: data.mweKind,
    sourceRef: data.sourceRef,
    metadata: data.metadata,
    createdAt: new Date().toISOString(),
  };

  const response = await writeAgent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.entry,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates a resource collection record in the user's PDS (or a corpus
 * PDS when targetAgent is provided).
 *
 * Resource collections group entries into named sets such as lexicons,
 * frame inventories, gazetteers, or stimulus pools. In the /design
 * section, collections with kind='project' serve as project containers.
 */
async function createResourceCollectionRecord(
  agent: Agent,
  data: {
    name: string;
    description?: string;
    kindUri?: string;
    kind?: ResourceCollectionRecord.Main['kind'];
    languages?: readonly string[];
    version?: string;
    ontologyRef?: string;
    knowledgeRefs?: LayersDefs.KnowledgeRef[];
    metadata?: LayersDefs.AnnotationMetadata;
    features?: LayersDefs.FeatureMap;
  },
  targetAgent?: Agent,
): Promise<CreateRecordResult> {
  const writeAgent = targetAgent ?? agent;
  const did = getAuthenticatedDid(writeAgent);

  const record: ResourceCollectionRecord.Main = {
    $type: COLLECTIONS.collection,
    name: data.name,
    description: data.description,
    kindUri: data.kindUri,
    kind: data.kind,
    languages: data.languages ? Array.from(data.languages) : undefined,
    version: data.version,
    ontologyRef: data.ontologyRef,
    knowledgeRefs: data.knowledgeRefs,
    metadata: data.metadata,
    features: data.features,
    createdAt: new Date().toISOString(),
  };

  const response = await writeAgent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.collection,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates a collection membership record in the user's PDS (or a corpus
 * PDS when targetAgent is provided).
 *
 * Collection memberships link resource entries to collections, with an
 * optional ordinal for ordering within the collection.
 */
async function createCollectionMembershipRecord(
  agent: Agent,
  data: {
    collectionRef: string;
    entryRef: string;
    ordinal?: number;
    metadata?: LayersDefs.AnnotationMetadata;
    features?: LayersDefs.FeatureMap;
  },
  targetAgent?: Agent,
): Promise<CreateRecordResult> {
  const writeAgent = targetAgent ?? agent;
  const did = getAuthenticatedDid(writeAgent);

  const record: CollectionMembershipRecord.Main = {
    $type: COLLECTIONS.collectionMembership,
    collectionRef: data.collectionRef,
    entryRef: data.entryRef,
    ordinal: data.ordinal,
    metadata: data.metadata,
    features: data.features,
    createdAt: new Date().toISOString(),
  };

  const response = await writeAgent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.collectionMembership,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates a template record in the user's PDS (or a corpus PDS when
 * targetAgent is provided).
 *
 * Templates define parameterized linguistic stimuli with named slot
 * placeholders (e.g., "{subject} {verb} the {object}") and optional
 * cross-slot constraints.
 */
async function createTemplateRecord(
  agent: Agent,
  data: {
    text: string;
    slots: ResourceDefs.Slot[];
    name?: string;
    languages?: readonly string[];
    constraints?: LayersDefs.Constraint[];
    ontologyRef?: string;
    experimentRef?: string;
    knowledgeRefs?: LayersDefs.KnowledgeRef[];
    metadata?: LayersDefs.AnnotationMetadata;
    features?: LayersDefs.FeatureMap;
  },
  targetAgent?: Agent,
): Promise<CreateRecordResult> {
  const writeAgent = targetAgent ?? agent;
  const did = getAuthenticatedDid(writeAgent);

  const record: TemplateRecord.Main = {
    $type: COLLECTIONS.template,
    text: data.text,
    slots: data.slots,
    name: data.name,
    languages: data.languages ? Array.from(data.languages) : undefined,
    constraints: data.constraints,
    ontologyRef: data.ontologyRef,
    experimentRef: data.experimentRef,
    knowledgeRefs: data.knowledgeRefs,
    metadata: data.metadata,
    features: data.features,
    createdAt: new Date().toISOString(),
  };

  const response = await writeAgent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.template,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates a filling record in the user's PDS (or a corpus PDS when
 * targetAgent is provided).
 *
 * Fillings instantiate templates by mapping slot names to filler values
 * (entry references or literal strings), producing rendered text.
 */
async function createFillingRecord(
  agent: Agent,
  data: {
    templateRef: string;
    slotFillings: ResourceDefs.SlotFilling[];
    renderedText?: string;
    expressionRef?: string;
    strategyUri?: string;
    strategy?: FillingRecord.Main['strategy'];
    metadata?: LayersDefs.AnnotationMetadata;
    knowledgeRefs?: LayersDefs.KnowledgeRef[];
    features?: LayersDefs.FeatureMap;
  },
  targetAgent?: Agent,
): Promise<CreateRecordResult> {
  const writeAgent = targetAgent ?? agent;
  const did = getAuthenticatedDid(writeAgent);

  const record: FillingRecord.Main = {
    $type: COLLECTIONS.filling,
    templateRef: data.templateRef,
    slotFillings: data.slotFillings,
    renderedText: data.renderedText,
    expressionRef: data.expressionRef,
    strategyUri: data.strategyUri,
    strategy: data.strategy,
    metadata: data.metadata,
    knowledgeRefs: data.knowledgeRefs,
    features: data.features,
    createdAt: new Date().toISOString(),
  };

  const response = await writeAgent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.filling,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates a template composition record in the user's PDS (or a corpus
 * PDS when targetAgent is provided).
 *
 * Template compositions combine multiple templates into sequences,
 * trees, or parallel structures for complex stimulus construction.
 */
async function createTemplateCompositionRecord(
  agent: Agent,
  data: {
    compositionType: TemplateCompositionRecord.Main['compositionType'];
    members: ResourceDefs.TemplateMember[];
    compositionTypeUri?: string;
    experimentRef?: string;
    metadata?: LayersDefs.AnnotationMetadata;
    features?: LayersDefs.FeatureMap;
  },
  targetAgent?: Agent,
): Promise<CreateRecordResult> {
  const writeAgent = targetAgent ?? agent;
  const did = getAuthenticatedDid(writeAgent);

  const record: TemplateCompositionRecord.Main = {
    $type: COLLECTIONS.templateComposition,
    compositionType: data.compositionType,
    members: data.members,
    compositionTypeUri: data.compositionTypeUri,
    experimentRef: data.experimentRef,
    metadata: data.metadata,
    features: data.features,
    createdAt: new Date().toISOString(),
  };

  const response = await writeAgent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.templateComposition,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Creates an experiment definition record in the user's PDS (or a
 * corpus PDS when targetAgent is provided).
 *
 * Experiment definitions specify how linguistic judgment data is
 * collected: what is measured, how responses are gathered, which
 * templates and collections provide stimuli, and how items are
 * distributed to participants.
 */
async function createExperimentDefRecord(
  agent: Agent,
  data: {
    name: string;
    description?: string;
    measureTypeUri?: string;
    measureType?: ExperimentDefRecord.Main['measureType'];
    taskTypeUri?: string;
    taskType?: ExperimentDefRecord.Main['taskType'];
    guidelines?: string;
    ontologyRef?: string;
    personaRef?: string;
    corpusRef?: string;
    templateRefs?: string[];
    collectionRefs?: string[];
    scaleMin?: number;
    scaleMax?: number;
    labels?: string[];
    knowledgeRefs?: LayersDefs.KnowledgeRef[];
    presentation?: JudgmentDefs.PresentationSpec;
    recordingMethods?: JudgmentDefs.RecordingMethod[];
    design?: JudgmentDefs.ExperimentDesign;
    features?: LayersDefs.FeatureMap;
  },
  targetAgent?: Agent,
): Promise<CreateRecordResult> {
  const writeAgent = targetAgent ?? agent;
  const did = getAuthenticatedDid(writeAgent);

  const record: ExperimentDefRecord.Main = {
    $type: COLLECTIONS.experimentDef,
    name: data.name,
    description: data.description,
    measureTypeUri: data.measureTypeUri,
    measureType: data.measureType,
    taskTypeUri: data.taskTypeUri,
    taskType: data.taskType,
    guidelines: data.guidelines,
    ontologyRef: data.ontologyRef,
    personaRef: data.personaRef,
    corpusRef: data.corpusRef,
    templateRefs: data.templateRefs,
    collectionRefs: data.collectionRefs,
    scaleMin: data.scaleMin,
    scaleMax: data.scaleMax,
    labels: data.labels,
    knowledgeRefs: data.knowledgeRefs,
    presentation: data.presentation,
    recordingMethods: data.recordingMethods,
    design: data.design,
    features: data.features,
    createdAt: new Date().toISOString(),
  };

  const response = await writeAgent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTIONS.experimentDef,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * Updates an existing record in the user's PDS by writing a new version
 * at the same rkey.
 *
 * ATProto does not have a PATCH operation. Updates are performed by
 * putting the full record at the existing AT-URI. The caller must
 * provide the complete record body (not a partial diff).
 */
async function updateRecord(
  agent: Agent,
  uri: string,
  record: Record<string, unknown>,
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);
  const { collection, rkey } = parseAtUri(uri);

  const response = await agent.com.atproto.repo.putRecord({
    repo: did,
    collection,
    rkey,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

// =============================================================================
// Deletion
// =============================================================================

/** Deletes a record from the user's PDS. */
async function deleteRecord(agent: Agent, uri: string): Promise<void> {
  const did = getAuthenticatedDid(agent);
  const { collection, rkey } = parseAtUri(uri);

  await agent.com.atproto.repo.deleteRecord({
    repo: did,
    collection,
    rkey,
  });
}

// =============================================================================
// Appview sync helpers
// =============================================================================

/**
 * Requests immediate indexing of a record by the appview.
 *
 * After creating a record in the user's PDS, the firehose may take
 * seconds to minutes to deliver the event. This function calls the
 * appview's sync.indexRecord endpoint to fetch the record directly
 * from the user's PDS and index it immediately.
 *
 * On failure, returns `{ indexed: false, error }` rather than throwing.
 * The firehose will eventually process the event as a fallback.
 */
async function syncRecordWithAppview(uri: string, authToken: string): Promise<SyncResult> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/xrpc/pub.layers.sync.indexRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ uri }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { indexed: false, error: `HTTP ${response.status}: ${text}` };
    }

    const body = (await response.json()) as { indexed: boolean; error?: string };
    return { indexed: body.indexed, error: body.error };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { indexed: false, error: message };
  }
}

/**
 * Requests immediate deletion of a record from the appview index.
 *
 * After deleting a record from the user's PDS, call this to remove it
 * from the appview's indexes without waiting for the firehose. On
 * failure, returns `{ deleted: false, error }` rather than throwing.
 */
async function syncDeleteWithAppview(uri: string, authToken: string): Promise<SyncDeleteResult> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/xrpc/pub.layers.sync.deleteRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ uri }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { deleted: false, error: `HTTP ${response.status}: ${text}` };
    }

    const body = (await response.json()) as { deleted: boolean; error?: string };
    return { deleted: body.deleted, error: body.error };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { deleted: false, error: message };
  }
}

// =============================================================================
// URI utilities
// =============================================================================

/** Parses an AT-URI into its components. */
function parseAtUri(uri: string): { did: string; collection: string; rkey: string } {
  const withoutScheme = uri.replace('at://', '');
  const [did, ...rest] = withoutScheme.split('/');
  const rkey = rest.pop() ?? '';
  const collection = rest.join('/');
  return { did: did ?? '', collection, rkey };
}

/** Builds an AT-URI from components. */
function buildAtUri(did: string, collection: string, rkey: string): string {
  return `at://${did}/${collection}/${rkey}`;
}

export type { CreateRecordResult, SyncResult, SyncDeleteResult };
export {
  COLLECTIONS,
  getAuthenticatedDid,
  createExpressionRecord,
  createCorpusRecord,
  createOntologyRecord,
  createTypeDefRecord,
  createAnnotationLayerRecord,
  createSegmentationRecord,
  createAlignmentRecord,
  createClusterSetRecord,
  createMediaRecord,
  createResourceEntryRecord,
  createResourceCollectionRecord,
  createCollectionMembershipRecord,
  createTemplateRecord,
  createFillingRecord,
  createTemplateCompositionRecord,
  createExperimentDefRecord,
  updateRecord,
  deleteRecord,
  syncRecordWithAppview,
  syncDeleteWithAppview,
  parseAtUri,
  buildAtUri,
};
