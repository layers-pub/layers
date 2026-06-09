//! Router-level integration tests that don't need a real Postgres.
//!
//! Each test boots the axum router with a connection-less pool — the
//! handlers under test never touch the database. This exercises the
//! middleware chain and operational endpoints in isolation.

use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

use layers_orchestrator::{AppState, build_router};

fn lazy_pool() -> sqlx::PgPool {
    PgPoolOptions::new()
        .max_connections(1)
        .connect_lazy("postgres://localhost:5432/layers_test")
        .expect("lazy pool")
}

fn app() -> axum::Router {
    let state = AppState::ready(lazy_pool(), "did:web:layers.test");
    build_router(state)
}

#[tokio::test]
async fn healthz_ok() {
    let resp = app()
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"ok");
}

#[tokio::test]
async fn readyz_reflects_state() {
    let warming = AppState::warming(lazy_pool(), "did:web:layers.test");
    let app = build_router(warming);
    let resp = app
        .oneshot(
            Request::builder()
                .uri("/readyz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);
}

#[tokio::test]
async fn unknown_route_404() {
    let resp = app()
        .oneshot(
            Request::builder()
                .uri("/xrpc/com.example.does.not.exist")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn malformed_bearer_returns_401() {
    let resp = app()
        .oneshot(
            Request::builder()
                .uri("/xrpc/pub.layers.corpus.getCorpus?uri=at%3A%2F%2Fdid%3Aplc%3Ax%2Fpub.layers.corpus.corpus%2Frk")
                .header(header::AUTHORIZATION, "garbage")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn missing_uri_query_returns_400() {
    // Public-read tier admits unauthenticated requests; the handler then
    // rejects the missing required `uri` parameter via axum's Query extractor.
    let resp = app()
        .oneshot(
            Request::builder()
                .uri("/xrpc/pub.layers.corpus.getCorpus")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn cors_preflight_admits_xrpc_origin() {
    let resp = app()
        .oneshot(
            Request::builder()
                .method("OPTIONS")
                .uri("/xrpc/pub.layers.corpus.getCorpus")
                .header(header::ORIGIN, "https://example.com")
                .header("access-control-request-method", "GET")
                .header("access-control-request-headers", "authorization")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert!(
        resp.status().is_success() || resp.status() == StatusCode::NO_CONTENT,
        "preflight should succeed; got {}",
        resp.status()
    );
    let allow_origin = resp
        .headers()
        .get("access-control-allow-origin")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    assert_eq!(allow_origin, "*");
}

#[tokio::test]
async fn request_id_set_when_absent_and_propagated_in_response() {
    let resp = app()
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let id = resp
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    assert!(!id.is_empty(), "missing X-Request-Id header on response");
    // UUIDv4 has 36 chars; we generated this server-side.
    assert_eq!(id.len(), 36, "expected uuid; got `{id}`");
}

#[tokio::test]
async fn metrics_endpoint_is_exposed_when_recorder_installed() {
    use layers_orchestrator::metrics::install_recorder;
    // Only one recorder may be installed per process; gracefully tolerate the
    // case where another test already claimed it.
    let handle = install_recorder().ok();
    let mut state_builder = AppState::builder(lazy_pool(), "did:web:layers.test").ready(true);
    if let Some(h) = handle {
        state_builder = state_builder.metrics(h);
    }
    let app = build_router(state_builder.build());
    let resp = app
        .oneshot(
            Request::builder()
                .uri("/metrics")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    // Either OK (handle installed) or 503 (recorder already taken). Both
    // confirm the route exists and the response shape is sane.
    assert!(
        matches!(
            resp.status(),
            StatusCode::OK | StatusCode::SERVICE_UNAVAILABLE
        ),
        "unexpected /metrics status: {}",
        resp.status()
    );
}

#[tokio::test]
async fn oauth_metadata_route_serves_503_without_config() {
    let resp = app()
        .oneshot(
            Request::builder()
                .uri("/oauth/client-metadata.json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);
}
