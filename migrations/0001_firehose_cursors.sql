-- One row per firehose subscription. Schema matches
-- layers_storage::cursor::PostgresCursorStore so the Rust indexer can
-- ensure_table() lazily on first run, but sites that prefer to drive
-- migrations centrally can apply this file directly.

CREATE TABLE IF NOT EXISTS firehose_cursors (
    subscription_id TEXT PRIMARY KEY,
    seq             BIGINT NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
