/**
 * Migration to create the agreement_reports table for indexing
 * pub.layers.judgment.agreementReport records.
 *
 * @module
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    CREATE TABLE agreement_reports (
        uri             TEXT PRIMARY KEY,
        did             TEXT NOT NULL,
        rkey            TEXT NOT NULL,
        experiment_ref  TEXT NOT NULL,
        metric          TEXT,
        score           INTEGER,
        indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        record          JSONB NOT NULL,
        CONSTRAINT agreement_reports_did_rkey_unique UNIQUE (did, rkey)
    );

    CREATE INDEX idx_agreement_reports_did ON agreement_reports (did);
    CREATE INDEX idx_agreement_reports_experiment_ref ON agreement_reports (experiment_ref);
    CREATE INDEX idx_agreement_reports_indexed_at ON agreement_reports (indexed_at);
    CREATE INDEX idx_agreement_reports_record ON agreement_reports USING GIN (record);
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TABLE IF EXISTS agreement_reports CASCADE;');
}
