/**
 * Zod schemas and TypeScript types for the judgment.agreementReport record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating an agreement report record from the firehose.
 *
 * Matches the `pub.layers.judgment.agreementReport` lexicon definition.
 */
const agreementReportRecordSchema = z.object({
  experimentRef: z.string(),
  judgmentSetRefs: z.array(z.string()),
  metric: z.string().optional(),
  value: z.number().int().min(0).max(1000).optional(),
  numAnnotators: z.number().int().optional(),
  numItems: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated agreement report record from the firehose.
 */
type AgreementReportRecord = z.infer<typeof agreementReportRecordSchema>;

/**
 * A row from the `agreement_reports` PostgreSQL table.
 */
interface AgreementReportRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly experiment_ref: string;
  readonly metric: string | null;
  readonly score: number | null;
  readonly indexed_at: Date;
  readonly record: AgreementReportRecord;
}

/**
 * API response shape for an agreement report (camelCase).
 */
interface AgreementReportView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly experimentRef: string;
  readonly metric: string | null;
  readonly score: number | null;
  readonly indexedAt: string;
  readonly record: AgreementReportRecord;
}

/**
 * Transforms an {@link AgreementReportRow} into an {@link AgreementReportView}.
 */
function toAgreementReportView(row: AgreementReportRow): AgreementReportView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    experimentRef: row.experiment_ref,
    metric: row.metric,
    score: row.score,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getAgreementReport.
 */
const getAgreementReportParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listAgreementReports.
 */
const listAgreementReportsParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  agreementReportRecordSchema,
  getAgreementReportParamsSchema,
  listAgreementReportsParamsSchema,
  toAgreementReportView,
};
export type { AgreementReportRecord, AgreementReportRow, AgreementReportView };
