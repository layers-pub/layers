//! [`RecordSink`] implementations for the four Layers backends.
//!
//! This module contains [`PostgresRecordSink`], the source-of-truth writer.
//! Search (Elasticsearch) and graph (Neo4j) sinks live in sibling modules
//! gated behind their respective features. A composite [`MultiSink`] fans
//! a single decoded record out to several backends concurrently.
//!
//! Schema is uniform across the 26 record-kind tables: the `record`
//! column carries the full JSON body, and the orchestrator's filter
//! predicates query JSONB via `record->>'<key>'`. This keeps schema
//! and write paths regular without losing any query reach.

#[cfg(feature = "postgres")]
mod pg {
    use idiolect_indexer::IndexerError;
    use layers_records::{AnyRecord, LayersFamily, RecordFamily};
    use serde_json::Value;
    use sqlx::PgPool;
    use sqlx::types::Json;

    use crate::RecordSink;

    /// `PostgreSQL` writer that upserts each `pub.layers.*` record into its
    /// per-collection table. Every table has the shape
    /// `(uri PRIMARY KEY, did, rkey, indexed_at, record JSONB)`; richer
    /// access patterns query JSONB indexes on `record`.
    #[derive(Debug, Clone)]
    pub struct PostgresRecordSink {
        pool: PgPool,
    }

    impl PostgresRecordSink {
        /// Wrap an existing pool.
        #[must_use]
        pub fn new(pool: PgPool) -> Self {
            Self { pool }
        }

        /// Borrow the underlying pool. Useful for transactional writes
        /// that span multiple tables.
        #[must_use]
        pub fn pool(&self) -> &PgPool {
            &self.pool
        }

        /// Create every `pub.layers.*` record table if it does not already
        /// exist, applying the generated `0002_record_tables.sql` migration.
        /// Called at indexer startup so a fresh deployment boots without an
        /// out-of-band migration step, mirroring
        /// [`crate::PostgresExternalSink::ensure_table`].
        ///
        /// # Errors
        /// Returns the underlying [`sqlx::Error`] if the DDL fails.
        pub async fn ensure_tables(&self) -> Result<(), sqlx::Error> {
            // Multi-statement DDL must run through the simple query protocol.
            let sql = include_str!("../../../migrations/0002_record_tables.sql");
            sqlx::raw_sql(sql).execute(&self.pool).await?;
            Ok(())
        }
    }

    #[async_trait::async_trait]
    impl RecordSink for PostgresRecordSink {
        async fn put_record(
            &self,
            did: &str,
            rkey: &str,
            cid: Option<&str>,
            record: &AnyRecord,
        ) -> Result<(), IndexerError> {
            let nsid = LayersFamily::nsid_str(record);
            let table = table_for(nsid)?;
            let uri = format!("at://{did}/{nsid}/{rkey}");
            let body = serde_json::to_value(record)
                .map_err(|e| IndexerError::Handler(format!("serialize {nsid}: {e}")))?;
            upsert(&self.pool, table, &uri, did, rkey, cid, &body).await
        }

        async fn delete_record(
            &self,
            did: &str,
            collection: &str,
            rkey: &str,
        ) -> Result<(), IndexerError> {
            let table = table_for(collection)?;
            let uri = format!("at://{did}/{collection}/{rkey}");
            sqlx::query(&format!("DELETE FROM {table} WHERE uri = $1"))
                .bind(&uri)
                .execute(&self.pool)
                .await
                .map_err(|e| IndexerError::Handler(format!("delete {table}: {e}")))?;
            Ok(())
        }
    }

    /// Resolve a `pub.layers.<ns>.<record>` NSID to its Postgres table
    /// name via the generated [`layers_records::tables`] map (the single
    /// source of truth shared with the orchestrator route generator).
    fn table_for(nsid: &str) -> Result<&'static str, IndexerError> {
        layers_records::tables::table_for(nsid)
            .ok_or_else(|| IndexerError::Handler(format!("no table for record NSID `{nsid}`")))
    }

    async fn upsert(
        pool: &PgPool,
        table: &str,
        uri: &str,
        did: &str,
        rkey: &str,
        cid: Option<&str>,
        body: &Value,
    ) -> Result<(), IndexerError> {
        let sql = format!(
            "INSERT INTO {table} (uri, did, rkey, cid, indexed_at, record)
             VALUES ($1, $2, $3, $4, NOW(), $5)
             ON CONFLICT (uri) DO UPDATE
             SET did = EXCLUDED.did,
                 rkey = EXCLUDED.rkey,
                 cid = EXCLUDED.cid,
                 indexed_at = NOW(),
                 record = EXCLUDED.record"
        );
        sqlx::query(&sql)
            .bind(uri)
            .bind(did)
            .bind(rkey)
            .bind(cid)
            .bind(Json(body))
            .execute(pool)
            .await
            .map_err(|e| IndexerError::Handler(format!("upsert {table}: {e}")))?;
        Ok(())
    }
}

#[cfg(feature = "postgres")]
pub use pg::PostgresRecordSink;
