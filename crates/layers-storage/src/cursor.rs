//! PostgreSQL-backed [`CursorStore`] for the Layers indexer.
//!
//! Schema (one row per subscription id):
//!
//! ```sql
//! CREATE TABLE firehose_cursors (
//!     subscription_id TEXT PRIMARY KEY,
//!     seq             BIGINT NOT NULL,
//!     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
//! );
//! ```
//!
//! Multi-subscription by design: a single appview that multiplexes
//! several firehose endpoints (or carries an `OrFamily` over multiple
//! upstreams) keeps one row per slot.

#[cfg(feature = "postgres")]
mod pg {
    use idiolect_indexer::{CursorStore, IndexerError};
    use sqlx::PgPool;

    /// PostgreSQL-backed cursor store.
    #[derive(Debug, Clone)]
    pub struct PostgresCursorStore {
        pool: PgPool,
    }

    impl PostgresCursorStore {
        /// Build a store backed by an existing connection pool.
        #[must_use]
        pub fn new(pool: PgPool) -> Self {
            Self { pool }
        }

        /// Create the `firehose_cursors` table if it does not already exist.
        ///
        /// # Errors
        /// Returns [`IndexerError::Cursor`] when the underlying DDL fails.
        pub async fn ensure_table(&self) -> Result<(), IndexerError> {
            sqlx::query(
                "CREATE TABLE IF NOT EXISTS firehose_cursors (
                    subscription_id TEXT PRIMARY KEY,
                    seq             BIGINT NOT NULL,
                    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )",
            )
            .execute(&self.pool)
            .await
            .map_err(|e| IndexerError::Cursor(format!("ensure firehose_cursors: {e}")))?;
            Ok(())
        }
    }

    impl CursorStore for PostgresCursorStore {
        async fn load(&self, subscription_id: &str) -> Result<Option<u64>, IndexerError> {
            let row: Option<(i64,)> = sqlx::query_as(
                "SELECT seq FROM firehose_cursors WHERE subscription_id = $1",
            )
            .bind(subscription_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| IndexerError::Cursor(format!("load cursor: {e}")))?;

            Ok(row.map(|(s,)| u64::try_from(s).unwrap_or(0)))
        }

        async fn commit(
            &self,
            subscription_id: &str,
            seq: u64,
        ) -> Result<(), IndexerError> {
            let seq_i = i64::try_from(seq).map_err(|_| {
                IndexerError::Cursor(format!("seq {seq} does not fit in i64"))
            })?;
            sqlx::query(
                "INSERT INTO firehose_cursors (subscription_id, seq, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (subscription_id)
                 DO UPDATE SET seq = EXCLUDED.seq, updated_at = NOW()",
            )
            .bind(subscription_id)
            .bind(seq_i)
            .execute(&self.pool)
            .await
            .map_err(|e| IndexerError::Cursor(format!("commit cursor: {e}")))?;
            Ok(())
        }

        async fn list(&self) -> Result<Vec<(String, u64)>, IndexerError> {
            let rows: Vec<(String, i64)> = sqlx::query_as(
                "SELECT subscription_id, seq FROM firehose_cursors ORDER BY subscription_id",
            )
            .fetch_all(&self.pool)
            .await
            .map_err(|e| IndexerError::Cursor(format!("list cursors: {e}")))?;
            Ok(rows
                .into_iter()
                .map(|(id, seq)| (id, u64::try_from(seq).unwrap_or(0)))
                .collect())
        }
    }
}

#[cfg(feature = "postgres")]
pub use pg::PostgresCursorStore;
