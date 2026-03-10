/**
 * Cross-backend record count reconciliation admin endpoints.
 *
 * Compares record counts across PostgreSQL, Elasticsearch, and Neo4j
 * to detect indexing drift. A background reconciliation job can be
 * triggered but is currently stubbed.
 *
 * @module
 */

import type { Client } from '@elastic/elasticsearch';
import type { Hono } from 'hono';
import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';

import { DatabaseError } from '../../../../../types/errors.js';

/**
 * Dependencies required by reconciliation endpoints.
 */
interface ReconciliationDependencies {
  readonly pgPool: Pool;
  readonly esClient: Client;
  readonly neo4jDriver: Driver;
}

/**
 * A single table's record count comparison across backends.
 */
interface ReconciliationRow {
  readonly table: string;
  readonly pgCount: number;
  readonly esCount: number;
  readonly neo4jCount: number;
  readonly mismatches: number;
}

/**
 * Record type definitions for reconciliation.
 *
 * Each entry maps a logical table name to its PostgreSQL table,
 * Elasticsearch index, and Neo4j node label. A value of null means
 * the record type is not stored in that backend.
 */
const RECORD_TYPES: readonly {
  table: string;
  pgTable: string;
  esIndex: string | null;
  neo4jLabel: string | null;
}[] = [
  {
    table: 'expressions',
    pgTable: 'expressions_index',
    esIndex: 'expressions',
    neo4jLabel: 'Expression',
  },
  { table: 'ontologies', pgTable: 'ontologies_index', esIndex: 'ontologies', neo4jLabel: null },
  { table: 'corpora', pgTable: 'corpora_index', esIndex: 'corpora', neo4jLabel: null },
  { table: 'media', pgTable: 'media_index', esIndex: 'media', neo4jLabel: null },
  {
    table: 'annotation_layers',
    pgTable: 'annotation_layers_index',
    esIndex: 'annotation_layers',
    neo4jLabel: 'AnnotationLayer',
  },
  { table: 'segmentations', pgTable: 'segmentations_index', esIndex: null, neo4jLabel: null },
  { table: 'alignments', pgTable: 'alignments_index', esIndex: null, neo4jLabel: 'Alignment' },
  { table: 'cluster_sets', pgTable: 'cluster_sets_index', esIndex: null, neo4jLabel: 'ClusterSet' },
  { table: 'profiles', pgTable: 'personas_index', esIndex: 'personas', neo4jLabel: null },
  { table: 'type_defs', pgTable: 'type_defs_index', esIndex: 'type_defs', neo4jLabel: 'TypeDef' },
];

/**
 * Row shape for PostgreSQL count queries.
 */
interface CountRow {
  count: number;
}

/**
 * Queries the count of records in a PostgreSQL table.
 * Returns -1 if the table does not exist or the query fails.
 */
async function pgCount(pool: Pool, tableName: string): Promise<number> {
  try {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
    return (result.rows[0] as CountRow).count;
  } catch {
    return -1;
  }
}

/**
 * Queries the count of documents in an Elasticsearch index.
 * Returns -1 if the index does not exist or the query fails.
 */
async function esCount(client: Client, indexName: string): Promise<number> {
  try {
    const result = await client.count({ index: indexName });
    return result.count;
  } catch {
    return -1;
  }
}

/**
 * Queries the count of nodes with a given label in Neo4j.
 * Returns -1 if the query fails.
 */
async function neo4jCount(driver: Driver, label: string): Promise<number> {
  const session = driver.session({ defaultAccessMode: 'READ' });
  try {
    const result = await session.run(`MATCH (n:${label}) RETURN count(n) AS count`);
    const record = result.records[0];
    if (!record) return 0;
    const countValue: unknown = record.get('count');
    if (typeof countValue === 'number') return countValue;
    if (countValue !== null && typeof countValue === 'object' && 'toNumber' in countValue) {
      return (countValue as { toNumber: () => number }).toNumber();
    }
    return Number(countValue);
  } catch {
    return -1;
  } finally {
    await session.close();
  }
}

/**
 * Computes the mismatch count from available (non-negative) backend counts.
 */
function computeMismatch(pg: number, es: number, neo4j: number): number {
  const available = [pg, es, neo4j].filter((v) => v >= 0);
  if (available.length < 2) return 0;
  return Math.max(...available) - Math.min(...available);
}

/**
 * Registers reconciliation admin routes on the given Hono app.
 *
 * @param app - the Hono application instance
 * @param deps - database clients for count queries
 */
function reconciliationAdminRoutes(app: Hono, deps: ReconciliationDependencies): void {
  app.get('/admin/v1/reconciliation', async (c) => {
    try {
      const rows: ReconciliationRow[] = await Promise.all(
        RECORD_TYPES.map(async (rt) => {
          const [pg, es, neo4j] = await Promise.all([
            pgCount(deps.pgPool, rt.pgTable),
            rt.esIndex ? esCount(deps.esClient, rt.esIndex) : Promise.resolve(-1),
            rt.neo4jLabel ? neo4jCount(deps.neo4jDriver, rt.neo4jLabel) : Promise.resolve(-1),
          ]);

          return {
            table: rt.table,
            pgCount: pg,
            esCount: es,
            neo4jCount: neo4j,
            mismatches: computeMismatch(pg, es, neo4j),
          };
        }),
      );

      return c.json(rows);
    } catch (err) {
      const dbErr = new DatabaseError('Failed to run reconciliation', err as Error);
      return c.json({ error: dbErr.code, message: dbErr.message }, 500);
    }
  });

  app.post('/admin/v1/reconciliation/run', async (c) => {
    const jobId = `recon-${Date.now()}`;

    try {
      const rows: ReconciliationRow[] = await Promise.all(
        RECORD_TYPES.map(async (rt) => {
          const [pg, es, neo4j] = await Promise.all([
            pgCount(deps.pgPool, rt.pgTable),
            rt.esIndex ? esCount(deps.esClient, rt.esIndex) : Promise.resolve(-1),
            rt.neo4jLabel ? neo4jCount(deps.neo4jDriver, rt.neo4jLabel) : Promise.resolve(-1),
          ]);

          return {
            table: rt.table,
            pgCount: pg,
            esCount: es,
            neo4jCount: neo4j,
            mismatches: computeMismatch(pg, es, neo4j),
          };
        }),
      );

      const totalMismatches = rows.reduce((sum, row) => sum + row.mismatches, 0);

      return c.json(
        {
          jobId,
          status: 'completed',
          totalMismatches,
          rows,
        },
        200,
      );
    } catch (err) {
      const dbErr = new DatabaseError('Failed to run reconciliation', err as Error);
      return c.json({ jobId, status: 'failed', error: dbErr.code, message: dbErr.message }, 500);
    }
  });
}

export { reconciliationAdminRoutes };
export type { ReconciliationDependencies, ReconciliationRow };
