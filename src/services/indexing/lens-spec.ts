/**
 * Typed view of the `extensions.storage` block emitted into every lens JSON
 * by `layers/codegen/extract-storage-specs.mjs`.
 *
 * The block is the authoritative declarative description of a record's
 * PostgreSQL row layout, Elasticsearch document shape, and Neo4j graph
 * projection. The generic indexer/repository/service read this shape at
 * runtime, so per-record TypeScript classes are no longer required.
 *
 * @module
 */

export type ColumnExpr =
  | { readonly kind: 'uri' }
  | { readonly kind: 'did' }
  | { readonly kind: 'rkey' }
  | { readonly kind: 'now' }
  | { readonly kind: 'record-json' }
  | { readonly kind: 'literal'; readonly value: unknown }
  | { readonly kind: 'field'; readonly path: string; readonly nullable?: boolean }
  | {
      readonly kind: 'field-or';
      readonly path: string;
      readonly fallback: ColumnExpr;
    }
  | {
      readonly kind: 'field-chain';
      readonly path: readonly string[];
      readonly nullable?: boolean;
    }
  | { readonly kind: 'count'; readonly path: string; readonly nullable?: boolean }
  | { readonly kind: 'json-stringify-field'; readonly path: string }
  | { readonly kind: 'raw'; readonly src: string };

export type MapperExpr =
  | { readonly kind: 'row'; readonly column: string }
  | { readonly kind: 'record-field'; readonly path: string; readonly nullable?: boolean }
  | { readonly kind: 'indexed-at-iso' }
  | { readonly kind: 'raw'; readonly src: string };

export interface EdgeSpec {
  readonly type: string;
  readonly targetPath: string;
  readonly nullable?: boolean;
  readonly each?: boolean;
}

export interface EsSpec {
  readonly fields: Record<string, MapperExpr>;
  readonly searchFields?: readonly string[];
}

export interface LensStorageSpec {
  readonly collection: string;
  readonly table: string | null;
  readonly esIndex: string | null;
  readonly neo4jLabel: string | null;
  readonly resourceName: string | null;
  readonly columns: Record<string, ColumnExpr>;
  readonly nodeProps: Record<string, ColumnExpr>;
  readonly edges: readonly EdgeSpec[];
  readonly es: EsSpec;
}

export interface LensDocument {
  readonly $type: 'panproto.protolens';
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly description?: string;
  readonly steps?: readonly unknown[];
  readonly extensions?: {
    readonly storage?: LensStorageSpec;
    readonly table?: unknown;
  };
}
