//! Liveness + readiness HTTP surface for the indexer binary.
//!
//! The indexer's only HTTP surface is operational. Two endpoints sit
//! at `/healthz` (liveness) and `/readyz` (readiness, probing
//! Postgres connectivity and the most recent committed cursor). Both
//! return JSON with stable field names so a Kubernetes probe or a
//! Prometheus exporter can hit them directly.

use std::net::SocketAddr;
use std::sync::Arc;

use idiolect_indexer::CursorStore;
use layers_storage::PostgresCursorStore;
use serde::Serialize;
use sqlx::PgPool;

/// State shared with the liveness/readiness endpoints.
#[derive(Clone)]
pub struct HealthState {
    /// Postgres pool the readiness probe uses to confirm DB connectivity.
    pub pool: PgPool,
    /// Cursor store the readiness probe queries for the most recent seq.
    pub cursor_store: PostgresCursorStore,
    /// Subscription id keyed in the cursor table.
    pub subscription_id: Arc<String>,
}

/// Wire shape of the readiness response.
#[derive(Debug, Serialize)]
pub struct Readiness {
    /// Aggregate readiness; `true` only when every probe is happy.
    pub ready: bool,
    /// Postgres `SELECT 1` succeeded.
    pub pg: bool,
    /// Latest committed cursor for this indexer's subscription.
    pub cursor: Option<u64>,
}

impl HealthState {
    /// Build a state value from the indexer's working set.
    #[must_use]
    pub fn new(pool: PgPool, cursor_store: PostgresCursorStore, subscription_id: String) -> Self {
        Self {
            pool,
            cursor_store,
            subscription_id: Arc::new(subscription_id),
        }
    }

    /// Probe Postgres + cursor table and produce a readiness snapshot.
    pub async fn probe(&self) -> Readiness {
        let pg = sqlx::query_scalar::<_, i32>("SELECT 1")
            .fetch_one(&self.pool)
            .await
            .is_ok();
        let cursor = self
            .cursor_store
            .load(&self.subscription_id)
            .await
            .ok()
            .flatten();
        Readiness {
            ready: pg,
            pg,
            cursor,
        }
    }
}

/// Spawn an axum-served liveness/readiness HTTP server on `addr`.
/// Returns the bound address (useful when port `0` is supplied) and a
/// future that resolves when the server stops.
///
/// # Errors
/// Returns the underlying bind / serve error.
pub async fn serve(
    addr: SocketAddr,
    state: HealthState,
    shutdown: impl std::future::Future<Output = ()> + Send + 'static,
) -> std::io::Result<(SocketAddr, tokio::task::JoinHandle<std::io::Result<()>>)> {
    use axum::Json;
    use axum::Router;
    use axum::extract::State;
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use axum::routing::get;

    async fn healthz() -> &'static str {
        "ok"
    }

    async fn readyz(State(state): State<HealthState>) -> impl IntoResponse {
        let r = state.probe().await;
        let status = if r.ready {
            StatusCode::OK
        } else {
            StatusCode::SERVICE_UNAVAILABLE
        };
        (status, Json(r))
    }

    let router = Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    let bound = listener.local_addr()?;
    let join = tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(shutdown)
            .await
    });
    Ok((bound, join))
}
