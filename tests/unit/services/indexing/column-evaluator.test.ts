/**
 * Unit tests for the lens-spec column DSL evaluator.
 *
 * The evaluator is the runtime half of the "schema is the source of truth"
 * story: every storage projection is a ColumnExpr tree and this module turns
 * it into a concrete value. A regression here breaks every record kind.
 */

import { describe, expect, it } from 'vitest';

import {
  evaluateColumn,
  evaluateColumnMap,
  evaluateMapperField,
  evaluateMapperFields,
} from '../../../../src/services/indexing/column-evaluator.js';
import type { ColumnExpr, MapperExpr } from '../../../../src/services/indexing/lens-spec.js';

const ctx = {
  uri: 'at://did:plc:abc/pub.layers.persona.persona/rk1',
  did: 'did:plc:abc',
  rkey: 'rk1',
  record: {
    name: 'Syntactician',
    domain: 'linguistics',
    annotations: ['a', 'b', 'c'],
    design: { type: 'within-subject' },
    empty: null,
  },
};

describe('evaluateColumn', () => {
  it('returns identity fields', () => {
    expect(evaluateColumn({ kind: 'uri' }, ctx)).toBe(ctx.uri);
    expect(evaluateColumn({ kind: 'did' }, ctx)).toBe(ctx.did);
    expect(evaluateColumn({ kind: 'rkey' }, ctx)).toBe(ctx.rkey);
  });

  it('produces a fresh Date for `now`', () => {
    const v = evaluateColumn({ kind: 'now' }, ctx);
    expect(v).toBeInstanceOf(Date);
  });

  it('serializes the full record for `record-json`', () => {
    const v = evaluateColumn({ kind: 'record-json' }, ctx);
    expect(JSON.parse(v as string)).toMatchObject({ name: 'Syntactician' });
  });

  it('returns literals verbatim', () => {
    expect(evaluateColumn({ kind: 'literal', value: null }, ctx)).toBeNull();
    expect(evaluateColumn({ kind: 'literal', value: 42 }, ctx)).toBe(42);
  });

  it('reads fields directly and respects the nullable flag', () => {
    expect(evaluateColumn({ kind: 'field', path: 'name' }, ctx)).toBe('Syntactician');
    expect(
      evaluateColumn({ kind: 'field', path: 'missing', nullable: true }, ctx),
    ).toBeNull();
    expect(evaluateColumn({ kind: 'field', path: 'missing' }, ctx)).toBeUndefined();
  });

  it('walks field chains', () => {
    expect(
      evaluateColumn({ kind: 'field-chain', path: ['design', 'type'] }, ctx),
    ).toBe('within-subject');
    expect(
      evaluateColumn(
        { kind: 'field-chain', path: ['missing', 'type'], nullable: true },
        ctx,
      ),
    ).toBeNull();
  });

  it('counts arrays', () => {
    expect(evaluateColumn({ kind: 'count', path: 'annotations' }, ctx)).toBe(3);
    expect(
      evaluateColumn({ kind: 'count', path: 'missing', nullable: true }, ctx),
    ).toBeNull();
    expect(evaluateColumn({ kind: 'count', path: 'missing' }, ctx)).toBe(0);
  });

  it('falls back through field-or', () => {
    expect(
      evaluateColumn(
        {
          kind: 'field-or',
          path: 'empty',
          fallback: { kind: 'literal', value: 'default' },
        },
        ctx,
      ),
    ).toBe('default');
    expect(
      evaluateColumn(
        {
          kind: 'field-or',
          path: 'name',
          fallback: { kind: 'literal', value: 'default' },
        },
        ctx,
      ),
    ).toBe('Syntactician');
  });

  it('rejects raw-eval escape hatches at runtime', () => {
    const expr = { kind: 'raw', src: 'someRawExpression' } as ColumnExpr;
    expect(() => evaluateColumn(expr, ctx)).toThrow(/raw expression/);
  });
});

describe('evaluateColumnMap', () => {
  it('evaluates a full column map in order', () => {
    const map: Record<string, ColumnExpr> = {
      name: { kind: 'field', path: 'name' },
      domain: { kind: 'field', path: 'domain', nullable: true },
      indexed_at: { kind: 'now' },
      record: { kind: 'record-json' },
    };
    const row = evaluateColumnMap(map, ctx);
    expect(row.name).toBe('Syntactician');
    expect(row.domain).toBe('linguistics');
    expect(row.indexed_at).toBeInstanceOf(Date);
    expect(typeof row.record).toBe('string');
  });
});

describe('evaluateMapperField', () => {
  const mctx = {
    row: { uri: 'at://x', name: 'n', indexed_at: new Date('2026-04-17T00:00:00Z') },
    record: { description: 'desc' },
  };

  it('passes through row columns', () => {
    expect(evaluateMapperField({ kind: 'row', column: 'name' }, mctx)).toBe('n');
  });

  it('projects nullable record fields', () => {
    expect(
      evaluateMapperField(
        { kind: 'record-field', path: 'description', nullable: true },
        mctx,
      ),
    ).toBe('desc');
    expect(
      evaluateMapperField(
        { kind: 'record-field', path: 'missing', nullable: true },
        mctx,
      ),
    ).toBeNull();
  });

  it('serializes indexed_at as ISO string', () => {
    expect(evaluateMapperField({ kind: 'indexed-at-iso' }, mctx)).toBe(
      '2026-04-17T00:00:00.000Z',
    );
  });

  it('rejects raw mapper expressions', () => {
    const expr = { kind: 'raw', src: 'x' } as MapperExpr;
    expect(() => evaluateMapperField(expr, mctx)).toThrow(/raw expression/);
  });
});

describe('evaluateMapperFields', () => {
  it('applies a full field map', () => {
    const mctx = {
      row: { uri: 'at://x', name: 'n' },
      record: { description: 'desc' },
    };
    const doc = evaluateMapperFields(
      {
        uri: { kind: 'row', column: 'uri' },
        name: { kind: 'row', column: 'name' },
        description: { kind: 'record-field', path: 'description' },
      },
      mctx,
    );
    expect(doc).toEqual({ uri: 'at://x', name: 'n', description: 'desc' });
  });
});
