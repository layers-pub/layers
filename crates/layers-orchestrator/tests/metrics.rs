//! Verify the orchestrator's `/metrics` endpoint produces real
//! Prometheus output and that request middleware emits per-route
//! counters / histograms.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use layers_orchestrator::metrics::{install_recorder, REQUEST_LATENCY, REQUEST_TOTAL};
use layers_orchestrator::{AppState, build_router};
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

fn lazy_pool() -> sqlx::PgPool {
    PgPoolOptions::new()
        .max_connections(1)
        .connect_lazy("postgres://localhost:5432/layers_test")
        .expect("lazy pool")
}

#[tokio::test]
async fn metrics_endpoint_renders_after_request() {
    let handle = install_recorder().expect("install recorder");
    let state = AppState::builder(lazy_pool(), "did:web:layers.test")
        .metrics(handle)
        .ready(true)
        .build();
    let app = build_router(state);

    // Hit healthz to generate a recorded request.
    let resp = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    // /metrics should now contain the request counter and latency
    // histogram, named per the public constants.
    let resp = app
        .oneshot(
            Request::builder()
                .uri("/metrics")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let text = std::str::from_utf8(&body).expect("utf8");
    assert!(
        text.contains(REQUEST_TOTAL),
        "expected {REQUEST_TOTAL} in metrics output:\n{text}"
    );
    assert!(
        text.contains(REQUEST_LATENCY),
        "expected {REQUEST_LATENCY} in metrics output:\n{text}"
    );
    assert!(
        text.contains("route=\"/healthz\""),
        "expected route label in metrics output:\n{text}"
    );
}

#[tokio::test]
async fn metrics_endpoint_503_without_recorder() {
    let state = AppState::builder(lazy_pool(), "did:web:layers.test")
        .ready(true)
        .build();
    let app = build_router(state);

    let resp = app
        .oneshot(
            Request::builder()
                .uri("/metrics")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);
}
