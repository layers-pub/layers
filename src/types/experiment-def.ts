/**
 * Zod schemas and TypeScript types for the judgment.experimentDef record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating an experiment definition record from the firehose.
 *
 * Matches the `pub.layers.judgment.experimentDef` lexicon definition.
 */
const experimentDefRecordSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  measureType: z.string().optional(),
  taskType: z.string().optional(),
  guidelines: z.string().optional(),
  ontologyRef: z.string().optional(),
  personaRef: z.string().optional(),
  corpusRef: z.string().optional(),
  templateRefs: z.array(z.string()).optional(),
  collectionRefs: z.array(z.string()).optional(),
  design: z.record(z.string(), z.unknown()).optional(),
  scaleMin: z.number().int().optional(),
  scaleMax: z.number().int().optional(),
  labels: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated experiment definition record from the firehose.
 */
type ExperimentDefRecord = z.infer<typeof experimentDefRecordSchema>;

/**
 * A row from the `experiment_defs` PostgreSQL table.
 */
interface ExperimentDefRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly measure: string | null;
  readonly task_type: string | null;
  readonly design_type: string | null;
  readonly ontology_ref: string | null;
  readonly persona_ref: string | null;
  readonly corpus_ref: string | null;
  readonly indexed_at: Date;
  readonly record: ExperimentDefRecord;
}

/**
 * API response shape for an experiment definition (camelCase).
 */
interface ExperimentDefView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly measure: string | null;
  readonly taskType: string | null;
  readonly designType: string | null;
  readonly ontologyRef: string | null;
  readonly personaRef: string | null;
  readonly corpusRef: string | null;
  readonly indexedAt: string;
  readonly record: ExperimentDefRecord;
}

/**
 * Transforms an {@link ExperimentDefRow} into an {@link ExperimentDefView}.
 */
function toExperimentDefView(row: ExperimentDefRow): ExperimentDefView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    name: row.name,
    measure: row.measure,
    taskType: row.task_type,
    designType: row.design_type,
    ontologyRef: row.ontology_ref,
    personaRef: row.persona_ref,
    corpusRef: row.corpus_ref,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getExperimentDef.
 */
const getExperimentDefParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listExperimentDefs.
 */
const listExperimentDefsParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchExperimentDefs.
 */
const searchExperimentDefsParamsSchema = z.object({
  q: z.string().min(1),
  measureType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  experimentDefRecordSchema,
  getExperimentDefParamsSchema,
  listExperimentDefsParamsSchema,
  searchExperimentDefsParamsSchema,
  toExperimentDefView,
};
export type { ExperimentDefRecord, ExperimentDefRow, ExperimentDefView };
