//! Smoke tests for the indexer's `/healthz` and `/readyz` endpoints.
//!
//! `/healthz` is unconditionally OK; `/readyz` probes Postgres. With a
//! lazy pool that never connects, the readiness probe returns 503.

use std::time::Duration;

use layers_indexer::health::{HealthState, serve as serve_health};
use layers_storage::PostgresCursorStore;
use sqlx::postgres::PgPoolOptions;
use tokio::sync::oneshot;

fn lazy_pool() -> sqlx::PgPool {
    PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_millis(100))
        .connect_lazy("postgres://localhost:5432/layers_test_unreachable")
        .expect("lazy pool")
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn healthz_is_unconditional_ok() {
    let pool = lazy_pool();
    let state = HealthState::new(pool.clone(), PostgresCursorStore::new(pool), "test".into());
    let (tx, rx) = oneshot::channel::<()>();
    let (bound, join) = serve_health("127.0.0.1:0".parse().unwrap(), state, async move {
        let _ = rx.await;
    })
    .await
    .expect("serve");

    let body = reqwest::get(format!("http://{bound}/healthz"))
        .await
        .expect("healthz")
        .text()
        .await
        .expect("text");
    assert_eq!(body, "ok");

    let _ = tx.send(());
    let _ = join.await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn readyz_503_when_postgres_unreachable() {
    let pool = lazy_pool();
    let state = HealthState::new(pool.clone(), PostgresCursorStore::new(pool), "test".into());
    let (tx, rx) = oneshot::channel::<()>();
    let (bound, join) = serve_health("127.0.0.1:0".parse().unwrap(), state, async move {
        let _ = rx.await;
    })
    .await
    .expect("serve");

    let resp = reqwest::get(format!("http://{bound}/readyz"))
        .await
        .expect("readyz");
    assert_eq!(resp.status(), reqwest::StatusCode::SERVICE_UNAVAILABLE);
    let body: serde_json::Value = resp.json().await.expect("json");
    assert_eq!(body["ready"], false);
    assert_eq!(body["pg"], false);

    let _ = tx.send(());
    let _ = join.await;
}
