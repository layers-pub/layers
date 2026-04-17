/**
 * Evaluator for the declarative column/node/mapper DSL used in every lens
 * JSON's `extensions.storage` block.
 *
 * The DSL is intentionally minimal: it expresses exactly the expressions that
 * the hand-written extractRow/extractNodeProps/toDocument functions did, and
 * nothing more. When a lens spec needs a computation the DSL cannot express
 * the codegen falls back to `{ kind: 'raw', src }` which this evaluator
 * rejects at runtime — surfaced early rather than silently producing null.
 *
 * @module
 */

import type { ColumnExpr, MapperExpr } from './lens-spec.js';

interface EvalContext {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly record: unknown;
}

type Dict = Record<string, unknown>;

function asDict(value: unknown): Dict | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Dict)
    : null;
}

export function evaluateColumn(expr: ColumnExpr, ctx: EvalContext): unknown {
  switch (expr.kind) {
    case 'uri':
      return ctx.uri;
    case 'did':
      return ctx.did;
    case 'rkey':
      return ctx.rkey;
    case 'now':
      return new Date();
    case 'record-json':
      return JSON.stringify(ctx.record);
    case 'literal':
      return expr.value;
    case 'field': {
      const rec = asDict(ctx.record);
      const value = rec?.[expr.path];
      if (value === undefined) return expr.nullable ? null : undefined;
      return value;
    }
    case 'field-or': {
      const rec = asDict(ctx.record);
      const value = rec?.[expr.path];
      return value ?? evaluateColumn(expr.fallback, ctx);
    }
    case 'field-chain': {
      let cur: unknown = ctx.record;
      for (const segment of expr.path) {
        const dict = asDict(cur);
        if (!dict) return expr.nullable ? null : undefined;
        cur = dict[segment];
      }
      if (cur === undefined) return expr.nullable ? null : undefined;
      return cur;
    }
    case 'count': {
      const rec = asDict(ctx.record);
      const value = rec?.[expr.path];
      if (Array.isArray(value)) return value.length;
      return expr.nullable ? null : 0;
    }
    case 'json-stringify-field': {
      const rec = asDict(ctx.record);
      const value = rec?.[expr.path];
      return value === undefined ? null : JSON.stringify(value);
    }
    case 'raw':
      throw new Error(
        `Column DSL evaluator received a raw expression that was not lowered by the extractor: ${expr.src}. ` +
          `Either lower it in layers/codegen/extract-storage-specs.mjs or express it with the DSL.`,
      );
    default: {
      const exhaustive: never = expr;
      throw new Error(`Unhandled column expression kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function evaluateColumnMap(
  map: Record<string, ColumnExpr>,
  ctx: EvalContext,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, expr] of Object.entries(map)) {
    out[name] = evaluateColumn(expr, ctx);
  }
  return out;
}

interface MapperContext {
  readonly row: Record<string, unknown>;
  readonly record: unknown;
}

export function evaluateMapperField(expr: MapperExpr, ctx: MapperContext): unknown {
  switch (expr.kind) {
    case 'row':
      return ctx.row[expr.column];
    case 'record-field': {
      const rec = asDict(ctx.record);
      const value = rec?.[expr.path];
      if (value === undefined) return expr.nullable ? null : undefined;
      return value;
    }
    case 'indexed-at-iso': {
      const v = ctx.row.indexed_at;
      return v instanceof Date ? v.toISOString() : v;
    }
    case 'raw':
      throw new Error(
        `Mapper DSL evaluator received a raw expression that was not lowered by the extractor: ${expr.src}`,
      );
    default: {
      const exhaustive: never = expr;
      throw new Error(`Unhandled mapper expression kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function evaluateMapperFields(
  map: Record<string, MapperExpr>,
  ctx: MapperContext,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, expr] of Object.entries(map)) {
    out[name] = evaluateMapperField(expr, ctx);
  }
  return out;
}
