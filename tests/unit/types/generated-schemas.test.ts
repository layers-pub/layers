/**
 * Tests for the generated zod record schemas in src/types/*.
 *
 * Exercises every record kind with a realistic valid payload plus targeted
 * invalid cases (missing required, over-length, wrong type). Keeps the
 * codegen↔lexicon parity honest.
 */

import { describe, expect, it } from 'vitest';

import { personaRecordSchema } from '../../../src/types/persona.js';
import { corpusRecordSchema } from '../../../src/types/corpus.js';
import { expressionRecordSchema } from '../../../src/types/expression.js';
import { annotationLayerRecordSchema } from '../../../src/types/annotation-layer.js';
import { segmentationRecordSchema } from '../../../src/types/segmentation.js';
import { ontologyRecordSchema } from '../../../src/types/ontology.js';
import { typeDefRecordSchema } from '../../../src/types/type-def.js';
import { clusterSetRecordSchema } from '../../../src/types/cluster-set.js';
import { alignmentRecordSchema } from '../../../src/types/alignment.js';
import { graphNodeRecordSchema } from '../../../src/types/graph-node.js';
import { graphEdgeRecordSchema } from '../../../src/types/graph-edge.js';
import { graphEdgeSetRecordSchema } from '../../../src/types/graph-edge-set.js';
import { eprintRecordSchema } from '../../../src/types/eprint.js';
import { dataLinkRecordSchema } from '../../../src/types/data-link.js';
import { mediaRecordSchema } from '../../../src/types/media.js';
import { changelogEntryRecordSchema } from '../../../src/types/changelog-entry.js';
import { corpusMembershipRecordSchema } from '../../../src/types/corpus-membership.js';
import { experimentDefRecordSchema } from '../../../src/types/experiment-def.js';
import { judgmentSetRecordSchema } from '../../../src/types/judgment-set.js';
import { agreementReportRecordSchema } from '../../../src/types/agreement-report.js';
import { resourceEntryRecordSchema } from '../../../src/types/resource-entry.js';
import { resourceCollectionRecordSchema } from '../../../src/types/resource-collection.js';
import { collectionMembershipRecordSchema } from '../../../src/types/collection-membership.js';
import { templateRecordSchema } from '../../../src/types/template.js';
import { templateCompositionRecordSchema } from '../../../src/types/template-composition.js';
import { fillingRecordSchema } from '../../../src/types/filling.js';

const NOW = '2026-04-17T12:00:00Z';
const DID = 'did:plc:abc123';
const URI = (nsid: string, rk = 'rk1') => `at://${DID}/${nsid}/${rk}`;

describe('generated record schemas: valid payloads', () => {
  it('persona — minimum (name + createdAt)', () => {
    expect(personaRecordSchema.safeParse({ name: 'Syntactician', createdAt: NOW }).success).toBe(true);
  });

  it('persona — rich payload', () => {
    const result = personaRecordSchema.safeParse({
      name: 'Biomedical NER Annotator',
      description: 'Spans clinical text into UMLS concepts.',
      domain: 'biomedical',
      kind: 'human-annotator',
      ontologyRefs: [URI('pub.layers.ontology.ontology')],
      knowledgeRefs: [{ source: 'wikidata', identifier: 'Q123', label: 'Cat' }],
      features: { version: 2 },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it('corpus — valid', () => {
    const r = corpusRecordSchema.safeParse({
      name: 'EWT Universal Dependencies',
      language: 'en',
      license: 'CC-BY-4.0',
      domain: 'syntax',
      createdAt: NOW,
    });
    expect(r.success).toBe(true);
  });

  it('expression — requires id + kind + createdAt', () => {
    expect(
      expressionRecordSchema.safeParse({ id: 'e1', kind: 'sentence', createdAt: NOW }).success,
    ).toBe(true);
  });

  it('annotationLayer — valid with token-tag kind', () => {
    expect(
      annotationLayerRecordSchema.safeParse({
        expression: URI('pub.layers.expression.expression'),
        kind: 'token-tag',
        annotations: [],
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('segmentation — valid', () => {
    expect(
      segmentationRecordSchema.safeParse({
        expression: URI('pub.layers.expression.expression'),
        tokenizations: [],
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('ontology — valid', () => {
    expect(ontologyRecordSchema.safeParse({ name: 'UD', createdAt: NOW }).success).toBe(true);
  });

  it('typeDef — valid', () => {
    expect(
      typeDefRecordSchema.safeParse({
        ontologyRef: URI('pub.layers.ontology.ontology'),
        name: 'NOUN',
        typeKind: 'pos',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('clusterSet — valid', () => {
    expect(
      clusterSetRecordSchema.safeParse({
        expression: URI('pub.layers.expression.expression'),
        kind: 'coreference',
        clusters: [],
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('alignment — valid', () => {
    expect(
      alignmentRecordSchema.safeParse({
        kind: 'parallel-text',
        links: [],
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('graphNode — valid', () => {
    expect(
      graphNodeRecordSchema.safeParse({
        label: 'Some concept',
        nodeType: 'concept',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('graphEdge — valid', () => {
    expect(
      graphEdgeRecordSchema.safeParse({
        source: URI('pub.layers.graph.graphNode'),
        target: URI('pub.layers.graph.graphNode', 'rk2'),
        edgeType: 'relates-to',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('graphEdgeSet — valid', () => {
    expect(
      graphEdgeSetRecordSchema.safeParse({
        edges: [],
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('eprint — valid', () => {
    expect(
      eprintRecordSchema.safeParse({
        eprintIdentifier: '2401.12345',
        linkType: 'primary',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('dataLink — valid', () => {
    expect(
      dataLinkRecordSchema.safeParse({
        eprintUri: URI('pub.layers.eprint.eprint'),
        dataKind: 'corpus',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('media — valid', () => {
    expect(
      mediaRecordSchema.safeParse({
        kind: 'audio',
        mimeType: 'audio/wav',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('changelogEntry — valid', () => {
    expect(
      changelogEntryRecordSchema.safeParse({
        subject: URI('pub.layers.corpus.corpus'),
        subjectCollection: 'pub.layers.corpus.corpus',
        summary: 'Added 100 new records',
        sections: [],
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('corpusMembership — valid', () => {
    expect(
      corpusMembershipRecordSchema.safeParse({
        corpusRef: URI('pub.layers.corpus.corpus'),
        expressionRef: URI('pub.layers.expression.expression'),
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('experimentDef — valid', () => {
    expect(
      experimentDefRecordSchema.safeParse({
        name: 'Acceptability',
        measureType: 'acceptability',
        taskType: 'scale-rating',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('judgmentSet — valid', () => {
    expect(
      judgmentSetRecordSchema.safeParse({
        experimentRef: URI('pub.layers.judgment.experimentDef'),
        agent: DID,
        judgments: [],
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('agreementReport — valid', () => {
    expect(
      agreementReportRecordSchema.safeParse({
        experimentRef: URI('pub.layers.judgment.experimentDef'),
        metric: 'cohen-kappa',
        score: 0.82,
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('resourceEntry — valid', () => {
    expect(
      resourceEntryRecordSchema.safeParse({
        form: 'cat',
        language: 'en',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('resourceCollection — valid', () => {
    expect(
      resourceCollectionRecordSchema.safeParse({
        name: 'EN lexicon',
        kind: 'lexicon',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('collectionMembership — valid', () => {
    expect(
      collectionMembershipRecordSchema.safeParse({
        collectionRef: URI('pub.layers.resource.collection'),
        entryRef: URI('pub.layers.resource.entry'),
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('template — valid', () => {
    expect(
      templateRecordSchema.safeParse({
        name: 'Cloze',
        slots: [],
        text: 'The {object} is on the mat.',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('templateComposition — valid', () => {
    expect(
      templateCompositionRecordSchema.safeParse({
        compositionType: 'latin-square',
        members: [],
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });

  it('filling — valid', () => {
    expect(
      fillingRecordSchema.safeParse({
        templateRef: URI('pub.layers.resource.template'),
        slotFillings: [],
        strategy: 'random',
        createdAt: NOW,
      }).success,
    ).toBe(true);
  });
});

describe('generated record schemas: rejection cases', () => {
  it('rejects persona missing required name', () => {
    const r = personaRecordSchema.safeParse({ createdAt: NOW });
    expect(r.success).toBe(false);
  });

  it('rejects persona name over maxLength (256)', () => {
    const r = personaRecordSchema.safeParse({ name: 'x'.repeat(257), createdAt: NOW });
    expect(r.success).toBe(false);
  });

  it('rejects expression without kind', () => {
    const r = expressionRecordSchema.safeParse({ id: 'e1', createdAt: NOW });
    expect(r.success).toBe(false);
  });

  it('rejects experimentDef without required name or createdAt', () => {
    expect(experimentDefRecordSchema.safeParse({ name: 'x' }).success).toBe(false);
    expect(experimentDefRecordSchema.safeParse({ createdAt: NOW }).success).toBe(false);
  });

  it('accepts ref fields as either at-uri strings or inlined objects', () => {
    // annotationLayer.metadata is a ref to pub.layers.defs#annotationMetadata
    const asString = annotationLayerRecordSchema.safeParse({
      expression: URI('pub.layers.expression.expression'),
      kind: 'token-tag',
      annotations: [],
      metadata: 'at://did:plc:xyz/pub.layers.defs/metadata',
      createdAt: NOW,
    });
    const asObject = annotationLayerRecordSchema.safeParse({
      expression: URI('pub.layers.expression.expression'),
      kind: 'token-tag',
      annotations: [],
      metadata: { annotator: DID, version: '1.0' },
      createdAt: NOW,
    });
    expect(asString.success).toBe(true);
    expect(asObject.success).toBe(true);
  });
});
