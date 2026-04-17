/**
 * Factories that turn a {@link LensStorageSpec} into the exact shapes the
 * rest of the indexing pipeline already consumes: a {@link RecordTypeConfig}
 * (for {@link BaseRepository}) and an {@link IDocumentMapper}.
 *
 * Everything in this module is pure: no I/O, no global state. The registry
 * loader passes specs in and the indexer wires the returned values into
 * `BaseRepository` + `BaseRecordService`.
 *
 * @module
 */

import { evaluateColumnMap, evaluateMapperFields } from './column-evaluator.js';
import type { LensStorageSpec } from './lens-spec.js';
import type { RecordTypeConfig } from '../../storage/base-repository.js';
import type { IDocumentMapper } from '../../storage/elasticsearch/document-mapper.js';

function asDict(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Build a {@link RecordTypeConfig} that implements extractRow, extractNodeProps
 * and extractEdges from a lens spec. `BaseRepository` is unchanged.
 */
export function recordTypeConfigFromLens(spec: LensStorageSpec): RecordTypeConfig<unknown> {
  if (!spec.table) throw new Error(`Lens spec for ${spec.collection} is missing table name`);
  if (!spec.esIndex) throw new Error(`Lens spec for ${spec.collection} is missing esIndex`);
  if (!spec.neo4jLabel) throw new Error(`Lens spec for ${spec.collection} is missing neo4jLabel`);
  if (!spec.resourceName)
    throw new Error(`Lens spec for ${spec.collection} is missing resourceName`);

  const collection = spec.collection;
  const table = spec.table;
  const esIndex = spec.esIndex;
  const neo4jLabel = spec.neo4jLabel;
  const resourceName = spec.resourceName;
  const columns = spec.columns;
  const nodeProps = spec.nodeProps;
  const edges = spec.edges;

  return {
    collection,
    table,
    esIndex,
    neo4jLabel,
    resourceName,

    extractRow(did, rkey, uri, record) {
      const base = { uri, did, rkey };
      return { ...base, ...evaluateColumnMap(columns, { did, rkey, uri, record }) };
    },

    extractNodeProps(uri, did, record) {
      const base = { uri, did };
      return {
        ...base,
        ...evaluateColumnMap(nodeProps, { did, rkey: '', uri, record }),
      };
    },

    extractEdges(uri, record) {
      const out: { from: string; to: string; type: string }[] = [];
      const rec = asDict(record);
      if (!rec) return out;
      for (const edge of edges) {
        const value = rec[edge.targetPath];
        if (edge.each) {
          if (!Array.isArray(value)) continue;
          for (const target of value) {
            if (typeof target === 'string' && target.length > 0) {
              out.push({ from: uri, to: target, type: edge.type });
            }
          }
        } else {
          if (typeof value === 'string' && value.length > 0) {
            out.push({ from: uri, to: value, type: edge.type });
          }
        }
      }
      return out;
    },
  };
}

/**
 * Build an {@link IDocumentMapper} that projects a row+record into an ES doc
 * according to the lens spec. If the spec declares no fields, the row is
 * passed through unchanged.
 */
export function documentMapperFromLens(spec: LensStorageSpec): IDocumentMapper {
  const fields = spec.es.fields;
  return {
    toDocument(row: Record<string, unknown>): Record<string, unknown> {
      if (Object.keys(fields).length === 0) return { ...row };
      const record = asDict(row.record);
      const indexedAt = row.indexed_at;
      const recordObj =
        record ??
        (typeof row.record === 'string' ? (safeJsonParse(row.record) as Record<string, unknown>) : null);
      const doc = evaluateMapperFields(fields, { row, record: recordObj });
      // Preserve the indexed-at serialization behavior used by every
      // hand-written mapper: ISO string when Date, pass-through otherwise.
      if (!('indexed_at' in doc)) {
        doc.indexed_at = indexedAt instanceof Date ? indexedAt.toISOString() : indexedAt;
      }
      return doc;
    },
  };
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
