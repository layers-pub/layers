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
import type * as AnnotationDefs from '@/lib/api/generated/types/pub/layers/annotation/defs';
import type * as SegmentationDefs from '@/lib/api/generated/types/pub/layers/segmentation/defs';
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
    language?: string;
    kind?: ExpressionRecord.Main['kind'];
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: ExpressionRecord.Main = {
    $type: 'pub.layers.expression.expression',
    id: crypto.randomUUID(),
    kind: data.kind ?? 'sentence',
    text: data.text,
    language: data.language,
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
    language?: string;
    license?: string;
  },
): Promise<CreateRecordResult> {
  const did = getAuthenticatedDid(agent);

  const record: CorpusRecord.Main = {
    $type: 'pub.layers.corpus.corpus',
    name: data.name,
    description: data.description,
    language: data.language,
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
    language?: string;
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
    language: data.language,
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
    language?: string;
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
    language: data.language,
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
  updateRecord,
  deleteRecord,
  syncRecordWithAppview,
  syncDeleteWithAppview,
  parseAtUri,
  buildAtUri,
};
