-- Single table for foreign records the appview indexes for cross-family
-- interop (idiolect community / observation, leaflet documents, margin
-- annotations, semble cards, etc.). The Layers pipeline never decodes
-- these into typed Rust records; we treat them as content-addressed
-- JSON bodies that other layers records may reference by AT-URI.

CREATE TABLE IF NOT EXISTS external_records (
    uri        TEXT PRIMARY KEY,
    did        TEXT NOT NULL,
    nsid       TEXT NOT NULL,
    rkey       TEXT NOT NULL,
    cid        TEXT,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    record     JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_external_records_did
    ON external_records (did);
CREATE INDEX IF NOT EXISTS idx_external_records_nsid
    ON external_records (nsid);
CREATE INDEX IF NOT EXISTS idx_external_records_record
    ON external_records USING GIN (record);
