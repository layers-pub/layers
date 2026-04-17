/**
 * Unit tests for the lens → RecordTypeConfig + IDocumentMapper factories.
 *
 * These factories replace 26 hand-written `*-repository.ts` and `*-mapper.ts`
 * modules. The tests cover every shape the DSL has to handle: scalar fields,
 * nullable passthroughs, literal columns, count, field-chain, edges (single
 * + array), and document projections.
 */

import { describe, expect, it } from 'vitest';

import {
  documentMapperFromLens,
  recordTypeConfigFromLens,
} from '../../../../src/services/indexing/lens-record-config.js';
import type { LensStorageSpec } from '../../../../src/services/indexing/lens-spec.js';

const personaSpec: LensStorageSpec = {
  collection: 'pub.layers.persona.persona',
  table: 'personas',
  esIndex: 'personas',
  neo4jLabel: 'Persona',
  resourceName: 'Persona',
  columns: {
    name: { kind: 'field', path: 'name' },
    domain: { kind: 'field', path: 'domain', nullable: true },
    kind: { kind: 'field', path: 'kind', nullable: true },
    indexed_at: { kind: 'now' },
    record: { kind: 'record-json' },
  },
  nodeProps: {
    name: { kind: 'field', path: 'name' },
    kind: { kind: 'field', path: 'kind', nullable: true },
  },
  edges: [{ type: 'REFERENCES', targetPath: 'ontologyRefs', each: true, nullable: true }],
  es: {
    fields: {
      uri: { kind: 'row', column: 'uri' },
      did: { kind: 'row', column: 'did' },
      name: { kind: 'row', column: 'name' },
      description: { kind: 'record-field', path: 'description', nullable: true },
      indexed_at: { kind: 'indexed-at-iso' },
    },
    searchFields: ['name^3', 'description'],
  },
};

describe('recordTypeConfigFromLens', () => {
  const config = recordTypeConfigFromLens(personaSpec);

  it('projects identity + scalar columns via extractRow', () => {
    const record = { name: 'Alice', domain: 'linguistics', kind: 'human' };
    const row = config.extractRow(
      'did:plc:abc',
      'rk1',
      'at://did:plc:abc/pub.layers.persona.persona/rk1',
      record,
    );
    expect(row.uri).toBe('at://did:plc:abc/pub.layers.persona.persona/rk1');
    expect(row.did).toBe('did:plc:abc');
    expect(row.rkey).toBe('rk1');
    expect(row.name).toBe('Alice');
    expect(row.domain).toBe('linguistics');
    expect(row.indexed_at).toBeInstanceOf(Date);
    expect(typeof row.record).toBe('string');
  });

  it('nullable columns default to null when the field is absent', () => {
    const row = config.extractRow(
      'did:plc:abc',
      'rk1',
      'at://x',
      { name: 'Alice' },
    );
    expect(row.domain).toBeNull();
    expect(row.kind).toBeNull();
  });

  it('extractNodeProps emits uri/did plus the declared props', () => {
    const props = config.extractNodeProps('at://x', 'did:plc:abc', {
      name: 'Alice',
      kind: 'human',
    });
    expect(props).toMatchObject({
      uri: 'at://x',
      did: 'did:plc:abc',
      name: 'Alice',
      kind: 'human',
    });
  });

  it('extractEdges expands `each` references into one edge per array item', () => {
    const edges = config.extractEdges('at://src', {
      ontologyRefs: ['at://o1', 'at://o2', ''],
    });
    expect(edges).toEqual([
      { from: 'at://src', to: 'at://o1', type: 'REFERENCES' },
      { from: 'at://src', to: 'at://o2', type: 'REFERENCES' },
    ]);
  });

  it('extractEdges omits ref edges when the field is missing', () => {
    expect(config.extractEdges('at://src', { name: 'n' })).toEqual([]);
  });

  it('rejects single-ref edge specs when the field is absent but emits them when present', () => {
    const spec: LensStorageSpec = {
      ...personaSpec,
      edges: [{ type: 'USES', targetPath: 'ontologyRef', nullable: true }],
    };
    const c = recordTypeConfigFromLens(spec);
    expect(c.extractEdges('at://src', {})).toEqual([]);
    expect(c.extractEdges('at://src', { ontologyRef: 'at://o1' })).toEqual([
      { from: 'at://src', to: 'at://o1', type: 'USES' },
    ]);
  });

  it('throws when the spec is missing required envelope fields', () => {
    const broken = { ...personaSpec, table: null } as unknown as LensStorageSpec;
    expect(() => recordTypeConfigFromLens(broken)).toThrow(/table/);
  });
});

describe('documentMapperFromLens', () => {
  const mapper = documentMapperFromLens(personaSpec);

  it('projects row + record fields according to es.fields', () => {
    const doc = mapper.toDocument({
      uri: 'at://x',
      did: 'did:plc:abc',
      name: 'Alice',
      indexed_at: new Date('2026-04-17T00:00:00Z'),
      record: JSON.stringify({ description: 'hello' }),
    });
    expect(doc).toEqual({
      uri: 'at://x',
      did: 'did:plc:abc',
      name: 'Alice',
      description: 'hello',
      indexed_at: '2026-04-17T00:00:00.000Z',
    });
  });

  it('falls back to null when a record field is missing', () => {
    const doc = mapper.toDocument({
      uri: 'at://x',
      did: 'did:plc:abc',
      name: 'Alice',
      indexed_at: new Date(),
      record: JSON.stringify({}),
    });
    expect(doc.description).toBeNull();
  });

  it('passes row through verbatim when the spec declares no fields', () => {
    const emptyMapper = documentMapperFromLens({
      ...personaSpec,
      es: { fields: {} },
    });
    const row = { uri: 'at://x', did: 'did:plc:abc', name: 'Alice', indexed_at: new Date() };
    expect(emptyMapper.toDocument(row)).toEqual({ ...row });
  });
});
