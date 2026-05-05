//! PostgreSQL connection helpers shared across the storage layer.

use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

/// Build a `PgPool` from a connection URL with sensible defaults for an
/// indexer workload.
///
/// # Errors
/// Returns the underlying [`sqlx::Error`] when the URL is invalid or the
/// initial connection probe fails.
pub async fn connect(url: &str, max_connections: u32) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(max_connections)
        .connect(url)
        .await
}
