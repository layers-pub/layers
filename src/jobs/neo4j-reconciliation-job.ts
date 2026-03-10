/**
 * Reconciles record counts between PostgreSQL and Neo4j.
 *
 * Compares PG row counts against Neo4j node counts for each
 * table/label pair and logs mismatches so operators can investigate
 * drift between the two backends.
 *
 * @module
 */

import type { Driver } from 'neo4j-driver';
import type { Pool } from 'pg';

import { BaseJob, type BaseJobConfig } from './base-job.js';

/**
 * A table/label pair to reconcile between PG and Neo4j.
 */
interface Neo4jReconcilePair {
  readonly table: string;
  readonly label: string;
}

/** Table/label pairs to reconcile. */
const NEO4J_RECONCILE_PAIRS: readonly Neo4jReconcilePair[] = [
  { table: 'expressions', label: 'Expression' },
  { table: 'ontologies', label: 'Ontology' },
  { table: 'corpora', label: 'Corpus' },
  { table: 'personas', label: 'Persona' },
  { table: 'media_records', label: 'Media' },
  { table: 'eprints', label: 'Eprint' },
  { table: 'segmentations', label: 'Segmentation' },
  { table: 'type_defs', label: 'TypeDef' },
  { table: 'corpus_memberships', label: 'CorpusMembership' },
  { table: 'resource_collections', label: 'Resource' },
  { table: 'graph_nodes', label: 'Graph' },
  { table: 'changelogs', label: 'Changelog' },
  { table: 'annotation_layers', label: 'AnnotationLayer' },
  { table: 'cluster_sets', label: 'ClusterSet' },
  { table: 'templates', label: 'Template' },
  { table: 'graph_edges', label: 'GraphEdge' },
  { table: 'graph_edge_sets', label: 'GraphEdgeSet' },
  { table: 'data_links', label: 'DataLink' },
  { table: 'alignments', label: 'Alignment' },
  { table: 'experiment_defs', label: 'ExperimentDef' },
];

/**
 * Configuration for constructing a {@link Neo4jReconciliationJob}.
 */
interface Neo4jReconciliationJobConfig extends BaseJobConfig {
  readonly pgPool: Pool;
  readonly neo4jDriver: Driver;
}

/**
 * Compares PG record counts against Neo4j node counts for each table/label pair.
 *
 * Runs on a scheduled interval. When counts diverge, it logs a warning with
 * the table name, Neo4j label, and drift magnitude so operators can trigger
 * a targeted rebuild of the graph.
 *
 * @example
 * ```typescript
 * const job = new Neo4jReconciliationJob({
 *   name: 'neo4j-reconciliation',
 *   intervalMs: 300_000,
 *   pgPool,
 *   neo4jDriver,
 * });
 * job.start();
 * ```
 */
class Neo4jReconciliationJob extends BaseJob {
  private readonly pgPool: Pool;
  private readonly neo4jDriver: Driver;

  constructor(config: Neo4jReconciliationJobConfig) {
    super(config);
    this.pgPool = config.pgPool;
    this.neo4jDriver = config.neo4jDriver;
  }

  async run(): Promise<void> {
    this.logger.info('Starting Neo4j reconciliation');
    let mismatches = 0;

    for (const { table, label } of NEO4J_RECONCILE_PAIRS) {
      try {
        const pgResult = await this.pgPool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM ${table}`,
        );
        const pgCount = Number(pgResult.rows[0]?.count ?? 0);

        const session = this.neo4jDriver.session();
        try {
          const neo4jResult = await session.run(`MATCH (n:${label}) RETURN count(n) AS count`);
          const countValue = neo4jResult.records[0]?.get('count') as {
            toNumber(): number;
          };
          const neo4jCount = countValue.toNumber();

          if (pgCount !== neo4jCount) {
            mismatches++;
            this.logger.warn('Neo4j count mismatch', {
              table,
              label,
              pgCount,
              neo4jCount,
              drift: pgCount - neo4jCount,
            });
          }
        } finally {
          await session.close();
        }
      } catch (err: unknown) {
        this.logger.error('Neo4j reconciliation check failed', {
          table,
          label,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.logger.info('Neo4j reconciliation complete', {
      mismatches,
      pairs: NEO4J_RECONCILE_PAIRS.length,
    });
  }
}

export { Neo4jReconciliationJob, NEO4J_RECONCILE_PAIRS };
export type { Neo4jReconciliationJobConfig, Neo4jReconcilePair };
