/**
 * Unit tests for the cross-reference extractor.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { extractCrossReferences } from '@/services/indexing/cross-reference-extractor.js';

describe('extractCrossReferences', () => {
  describe('expression.expression', () => {
    it('extracts all ref fields when populated', () => {
      const record = {
        id: 'expr-001',
        sourceRef: 'at://did:plc:abc/pub.layers.expression.expression/source1',
        eprintRef: 'at://did:plc:abc/pub.layers.eprint.eprint/ep1',
        parentRef: 'at://did:plc:abc/pub.layers.expression.expression/parent1',
        text: 'The cat sat on the mat.',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.expression.expression', record);

      expect(refs).toHaveLength(3);
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.expression.expression/source1',
        refType: 'sourceRef',
      });
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.eprint.eprint/ep1',
        refType: 'eprintRef',
      });
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.expression.expression/parent1',
        refType: 'parentRef',
      });
    });

    it('returns empty array when no ref fields are present', () => {
      const record = {
        id: 'expr-002',
        text: 'Hello world',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.expression.expression', record);

      expect(refs).toHaveLength(0);
    });

    it('skips empty string values', () => {
      const record = {
        id: 'expr-003',
        sourceRef: '',
        eprintRef: 'at://did:plc:abc/pub.layers.eprint.eprint/ep1',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.expression.expression', record);

      expect(refs).toHaveLength(1);
      expect(refs[0]?.refType).toBe('eprintRef');
    });
  });

  describe('annotation.annotationLayer', () => {
    it('extracts expression, ontologyRef, and personaRef', () => {
      const record = {
        expression: 'at://did:plc:abc/pub.layers.expression.expression/expr1',
        ontologyRef: 'at://did:plc:abc/pub.layers.ontology.ontology/ont1',
        personaRef: 'at://did:plc:abc/pub.layers.persona.persona/p1',
        annotations: [],
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.annotation.annotationLayer', record);

      expect(refs).toHaveLength(3);
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.expression.expression/expr1',
        refType: 'expressionRef',
      });
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.ontology.ontology/ont1',
        refType: 'ontologyRef',
      });
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.persona.persona/p1',
        refType: 'personaRef',
      });
    });

    it('includes segmentationRef when present', () => {
      const record = {
        expression: 'at://did:plc:abc/pub.layers.expression.expression/expr1',
        segmentationRef: 'at://did:plc:abc/pub.layers.segmentation.segmentation/seg1',
        annotations: [],
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.annotation.annotationLayer', record);

      expect(refs).toHaveLength(2);
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.segmentation.segmentation/seg1',
        refType: 'segmentationRef',
      });
    });
  });

  describe('annotation.clusterSet', () => {
    it('extracts layerRef', () => {
      const record = {
        layerRef: 'at://did:plc:abc/pub.layers.annotation.annotationLayer/layer1',
        clusters: [],
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.annotation.clusterSet', record);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        targetUri: 'at://did:plc:abc/pub.layers.annotation.annotationLayer/layer1',
        refType: 'layerRef',
      });
    });

    it('extracts both expression and layerRef', () => {
      const record = {
        expression: 'at://did:plc:abc/pub.layers.expression.expression/expr1',
        layerRef: 'at://did:plc:abc/pub.layers.annotation.annotationLayer/layer1',
        clusters: [],
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.annotation.clusterSet', record);

      expect(refs).toHaveLength(2);
    });
  });

  describe('corpus.membership', () => {
    it('extracts corpusRef and expressionRef', () => {
      const record = {
        corpusRef: 'at://did:plc:abc/pub.layers.corpus.corpus/corp1',
        expressionRef: 'at://did:plc:abc/pub.layers.expression.expression/expr1',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.corpus.membership', record);

      expect(refs).toHaveLength(2);
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.corpus.corpus/corp1',
        refType: 'corpusRef',
      });
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.expression.expression/expr1',
        refType: 'expressionRef',
      });
    });
  });

  describe('resource.templateComposition', () => {
    it('extracts templateRef from each member', () => {
      const record = {
        members: [
          { templateRef: 'at://did:plc:abc/pub.layers.resource.template/t1' },
          { templateRef: 'at://did:plc:abc/pub.layers.resource.template/t2' },
          { templateRef: 'at://did:plc:abc/pub.layers.resource.template/t3' },
        ],
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.resource.templateComposition', record);

      expect(refs).toHaveLength(3);
      expect(refs[0]).toEqual({
        targetUri: 'at://did:plc:abc/pub.layers.resource.template/t1',
        refType: 'templateRef',
      });
      expect(refs[1]).toEqual({
        targetUri: 'at://did:plc:abc/pub.layers.resource.template/t2',
        refType: 'templateRef',
      });
      expect(refs[2]).toEqual({
        targetUri: 'at://did:plc:abc/pub.layers.resource.template/t3',
        refType: 'templateRef',
      });
    });

    it('handles empty members array', () => {
      const record = {
        members: [],
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.resource.templateComposition', record);

      expect(refs).toHaveLength(0);
    });

    it('handles members without templateRef', () => {
      const record = {
        members: [{ otherField: 'value' }, { templateRef: 'at://did:plc:abc/t1' }],
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.resource.templateComposition', record);

      expect(refs).toHaveLength(1);
    });

    it('skips non-object members', () => {
      const record = {
        members: ['not-an-object', 42, null],
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.resource.templateComposition', record);

      expect(refs).toHaveLength(0);
    });
  });

  describe('unknown collection', () => {
    it('returns empty array for unrecognized collection', () => {
      const record = { someField: 'value' };

      const refs = extractCrossReferences('pub.layers.unknown.type', record);

      expect(refs).toHaveLength(0);
    });

    it('returns empty array for collections without cross-refs', () => {
      const refs1 = extractCrossReferences('pub.layers.ontology.ontology', { id: 'ont1' });
      const refs2 = extractCrossReferences('pub.layers.corpus.corpus', { id: 'corp1' });
      const refs3 = extractCrossReferences('pub.layers.persona.persona', { id: 'p1' });
      const refs4 = extractCrossReferences('pub.layers.media.media', { id: 'm1' });
      const refs5 = extractCrossReferences('pub.layers.eprint.eprint', { id: 'ep1' });
      const refs6 = extractCrossReferences('pub.layers.graph.graphNode', { id: 'gn1' });
      const refs7 = extractCrossReferences('pub.layers.resource.collection', { id: 'rc1' });
      const refs8 = extractCrossReferences('pub.layers.resource.entry', { id: 're1' });

      expect(refs1).toHaveLength(0);
      expect(refs2).toHaveLength(0);
      expect(refs3).toHaveLength(0);
      expect(refs4).toHaveLength(0);
      expect(refs5).toHaveLength(0);
      expect(refs6).toHaveLength(0);
      expect(refs7).toHaveLength(0);
      expect(refs8).toHaveLength(0);
    });
  });

  describe('ontology.typeDef', () => {
    it('extracts ontologyRef and parentTypeRef', () => {
      const record = {
        ontologyRef: 'at://did:plc:abc/pub.layers.ontology.ontology/ont1',
        parentTypeRef: 'at://did:plc:abc/pub.layers.ontology.typeDef/parent1',
        label: 'NounPhrase',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.ontology.typeDef', record);

      expect(refs).toHaveLength(2);
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.ontology.ontology/ont1',
        refType: 'ontologyRef',
      });
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.ontology.typeDef/parent1',
        refType: 'parentTypeRef',
      });
    });
  });

  describe('eprint.dataLink', () => {
    it('extracts eprintUri and corpusRef', () => {
      const record = {
        eprintUri: 'at://did:plc:abc/pub.layers.eprint.eprint/ep1',
        corpusRef: 'at://did:plc:abc/pub.layers.corpus.corpus/corp1',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.eprint.dataLink', record);

      expect(refs).toHaveLength(2);
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.eprint.eprint/ep1',
        refType: 'eprintRef',
      });
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.corpus.corpus/corp1',
        refType: 'corpusRef',
      });
    });
  });

  describe('judgment.judgmentSet', () => {
    it('extracts experimentRef', () => {
      const record = {
        experimentRef: 'at://did:plc:abc/pub.layers.judgment.experimentDef/exp1',
        judgments: [],
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.judgment.judgmentSet', record);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        targetUri: 'at://did:plc:abc/pub.layers.judgment.experimentDef/exp1',
        refType: 'experimentRef',
      });
    });
  });

  describe('changelog.entry', () => {
    it('extracts subject as subjectRef', () => {
      const record = {
        subject: 'at://did:plc:abc/pub.layers.expression.expression/expr1',
        action: 'update',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.changelog.entry', record);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        targetUri: 'at://did:plc:abc/pub.layers.expression.expression/expr1',
        refType: 'subjectRef',
      });
    });
  });

  describe('resource.filling', () => {
    it('extracts templateRef and expressionRef', () => {
      const record = {
        templateRef: 'at://did:plc:abc/pub.layers.resource.template/t1',
        expressionRef: 'at://did:plc:abc/pub.layers.expression.expression/expr1',
        values: {},
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.resource.filling', record);

      expect(refs).toHaveLength(2);
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.resource.template/t1',
        refType: 'templateRef',
      });
      expect(refs).toContainEqual({
        targetUri: 'at://did:plc:abc/pub.layers.expression.expression/expr1',
        refType: 'expressionRef',
      });
    });
  });

  describe('graph.graphEdge', () => {
    it('extracts edgeSetRef when present', () => {
      const record = {
        edgeSetRef: 'at://did:plc:abc/pub.layers.graph.graphEdgeSet/es1',
        source: 'at://node1',
        target: 'at://node2',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.graph.graphEdge', record);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        targetUri: 'at://did:plc:abc/pub.layers.graph.graphEdgeSet/es1',
        refType: 'edgeSetRef',
      });
    });

    it('returns empty when edgeSetRef is missing', () => {
      const record = {
        source: 'at://node1',
        target: 'at://node2',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.graph.graphEdge', record);

      expect(refs).toHaveLength(0);
    });
  });

  describe('non-string values', () => {
    it('ignores numeric values in ref fields', () => {
      const record = {
        sourceRef: 42,
        eprintRef: 'at://did:plc:abc/pub.layers.eprint.eprint/ep1',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.expression.expression', record);

      expect(refs).toHaveLength(1);
      expect(refs[0]?.refType).toBe('eprintRef');
    });

    it('ignores null values in ref fields', () => {
      const record = {
        sourceRef: null,
        parentRef: undefined,
        eprintRef: 'at://did:plc:abc/pub.layers.eprint.eprint/ep1',
        createdAt: '2026-01-15T12:00:00Z',
      };

      const refs = extractCrossReferences('pub.layers.expression.expression', record);

      expect(refs).toHaveLength(1);
    });
  });
});
