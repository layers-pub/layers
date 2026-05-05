//! Foreign-record sink.
//!
//! Layers indexes a curated set of foreign NSIDs alongside its own
//! `pub.layers.*` family so cross-app interop (idiolect community,
//! leaflet documents, margin annotations, semble cards) works
//! natively. Foreign records are stored as content-addressed JSON in
//! a single [`external_records`] table without typed decoding; query
//! handlers serve them through the orchestrator's
//! `pub.layers.integration.listExternal` route.

use idiolect_indexer::IndexerError;
use serde_json::Value;
use sqlx::PgPool;
use sqlx::types::Json;

/// NSID prefixes the indexer binary subscribes to by default.
///
/// Every entry is verified against the upstream's actual lexicon
/// files; the verifying source for each is in the comment. Operators
/// override the list at boot via `LAYERS_FOREIGN_PREFIXES`.
pub const DEFAULT_FOREIGN_PREFIXES: &[&str] = &[
    // verified: layers/Cargo.toml depends on idiolect-records whose
    //           lexicons/dev/idiolect/community.json carries `id: dev.idiolect.community`.
    "dev.idiolect.",
    // verified: hyperlink-academy/leaflet repo at lexicons/pub/leaflet/{document,publication}.json.
    "pub.leaflet.",
    // verified: margin-at/margin repo at lexicons/at/margin/note.json id == "at.margin.note".
    "at.margin.",
    // verified: cosmik-network/semble at src/modules/atproto/infrastructure/lexicons/
    //           collectionLinkRemoval.json id == "network.cosmik.collectionLinkRemoval".
    "network.cosmik.",
    // verified: pkg.go.dev/tangled.sh/tangled.sh/core/api/tangled enumerates
    //           sh.tangled.{repo,knot,pipeline,actor,feed,graph,...}.
    "sh.tangled.",
    // verified: grainsocial/grain repo at lexicons/social/grain/gallery/gallery.json
    //           id == "social.grain.gallery".
    "social.grain.",
    // verified: streamplace/streamplace repo at lexicons/place/stream/key.json
    //           id == "place.stream.key" (live video / chat / badges).
    "place.stream.",
    // verified: JL037/voxport-lexicons repo at lexicons/com/voxport/podcast/episode.json
    //           id == "com.voxport.podcast.episode" (podcast episodes + series).
    "com.voxport.",
    // verified: did:plc:wxex3wx5k4ctciupsv5m5stb hosts app.dropanchor.checkin
    //           via com.atproto.lexicon.schema (location-anchored journal).
    "app.dropanchor.",
    // verified: did:plc:l5m5nuh5cvdatyn5fjxar2sh hosts at.mapped.post / .trail
    //           via com.atproto.lexicon.schema (trail/activity tracking).
    "at.mapped.",
    // verified: did:plc:purpkfw7haimc4zu5a57slza hosts app.greengale.document
    //           via com.atproto.lexicon.schema (markdown publishing).
    "app.greengale.",
    // verified: did:plc:j5ttxzdb5kwo4mcqkmzgvt33 hosts app.beaconbits.beacon
    //           via com.atproto.lexicon.schema (location shouts at venues).
    "app.beaconbits.",
];

/// Sink shape for foreign records. Mirrors [`crate::RecordSink`] but
/// takes the NSID + raw JSON body since we don't decode foreign
/// records into typed Rust enums.
#[async_trait::async_trait]
pub trait ExternalRecordSink: Send + Sync {
    /// Upsert a foreign record. Idempotent over `(uri)`.
    async fn put_external_record(
        &self,
        did: &str,
        nsid: &str,
        rkey: &str,
        cid: Option<&str>,
        body: &Value,
    ) -> Result<(), IndexerError>;

    /// Remove a foreign record by AT-URI. Idempotent.
    async fn delete_external_record(&self, uri: &str) -> Result<(), IndexerError>;
}

/// Postgres implementation of [`ExternalRecordSink`] backed by the
/// shared `external_records` table.
#[derive(Debug, Clone)]
pub struct PostgresExternalSink {
    pool: PgPool,
}

impl PostgresExternalSink {
    /// Wrap an existing pool.
    #[must_use]
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Borrow the pool.
    #[must_use]
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Create the `external_records` table if it does not exist.
    /// Production deployments drive migrations explicitly via the
    /// SQL files under `layers/migrations/`; this helper exists for
    /// integration tests.
    ///
    /// # Errors
    /// Returns the underlying sqlx error.
    pub async fn ensure_table(&self) -> Result<(), sqlx::Error> {
        let sql = include_str!("../../../migrations/0003_external_records.sql");
        sqlx::query(sql).execute(&self.pool).await?;
        Ok(())
    }
}

#[async_trait::async_trait]
impl ExternalRecordSink for PostgresExternalSink {
    async fn put_external_record(
        &self,
        did: &str,
        nsid: &str,
        rkey: &str,
        cid: Option<&str>,
        body: &Value,
    ) -> Result<(), IndexerError> {
        let uri = format!("at://{did}/{nsid}/{rkey}");
        sqlx::query(
            "INSERT INTO external_records (uri, did, nsid, rkey, cid, indexed_at, record)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6)
             ON CONFLICT (uri) DO UPDATE
             SET did = EXCLUDED.did,
                 nsid = EXCLUDED.nsid,
                 rkey = EXCLUDED.rkey,
                 cid = EXCLUDED.cid,
                 indexed_at = NOW(),
                 record = EXCLUDED.record",
        )
        .bind(uri)
        .bind(did)
        .bind(nsid)
        .bind(rkey)
        .bind(cid)
        .bind(Json(body))
        .execute(&self.pool)
        .await
        .map_err(|e| IndexerError::Handler(format!("upsert external_records: {e}")))?;
        Ok(())
    }

    async fn delete_external_record(&self, uri: &str) -> Result<(), IndexerError> {
        sqlx::query("DELETE FROM external_records WHERE uri = $1")
            .bind(uri)
            .execute(&self.pool)
            .await
            .map_err(|e| IndexerError::Handler(format!("delete external_records: {e}")))?;
        Ok(())
    }
}

/// Returns true when `nsid` matches any prefix in `DEFAULT_FOREIGN_PREFIXES`.
#[must_use]
pub fn is_default_foreign(nsid: &str) -> bool {
    DEFAULT_FOREIGN_PREFIXES.iter().any(|p| nsid.starts_with(p))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_prefixes_cover_documented_apps() {
        // Every assertion below corresponds to a verbatim NSID
        // observed in the upstream's lexicon JSON or generated
        // bindings.
        assert!(is_default_foreign("dev.idiolect.community"));
        assert!(is_default_foreign("pub.leaflet.document"));
        assert!(is_default_foreign("at.margin.note"));
        assert!(is_default_foreign("network.cosmik.collectionLinkRemoval"));
        assert!(is_default_foreign("sh.tangled.repo.issue"));
        assert!(is_default_foreign("social.grain.gallery"));
        assert!(is_default_foreign("place.stream.key"));
        assert!(is_default_foreign("com.voxport.podcast.episode"));
        assert!(is_default_foreign("app.dropanchor.checkin"));
        assert!(is_default_foreign("at.mapped.post"));
        assert!(is_default_foreign("app.greengale.document"));
        assert!(is_default_foreign("app.beaconbits.beacon"));
    }

    #[test]
    fn layers_records_are_not_treated_as_foreign() {
        assert!(!is_default_foreign("pub.layers.corpus.corpus"));
        assert!(!is_default_foreign("pub.layers.annotation.annotationLayer"));
    }

    #[test]
    fn unknown_nsids_are_not_foreign_by_default() {
        assert!(!is_default_foreign("app.bsky.feed.post"));
        assert!(!is_default_foreign("com.example.thing"));
    }
}
