/**
 * ATProto record creation utilities for Layers.
 *
 * All user data lives in user PDSes. The Layers appview only indexes
 * from the firehose; it never writes to user repositories.
 *
 * @module
 */

import type { Agent } from '@atproto/api';

import type * as ExpressionRecord from '@/lib/api/generated/types/pub/layers/expression/expression';
import type * as CorpusRecord from '@/lib/api/generated/types/pub/layers/corpus/corpus';
import type * as OntologyRecord from '@/lib/api/generated/types/pub/layers/ontology/ontology';
import type * as TypeDefRecord from '@/lib/api/generated/types/pub/layers/ontology/typeDef';

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

/** Deletes a record from the user's PDS. */
async function deleteRecord(
  agent: Agent,
  uri: string,
): Promise<void> {
  const did = getAuthenticatedDid(agent);
  const parts = uri.replace('at://', '').split('/');
  const collection = `${parts[1]}/${parts[2]}`;
  const rkey = parts[3];

  await agent.com.atproto.repo.deleteRecord({
    repo: did,
    collection,
    rkey: rkey ?? '',
  });
}

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

export type { CreateRecordResult };
export {
  COLLECTIONS,
  getAuthenticatedDid,
  createExpressionRecord,
  createCorpusRecord,
  createOntologyRecord,
  createTypeDefRecord,
  deleteRecord,
  parseAtUri,
  buildAtUri,
};
