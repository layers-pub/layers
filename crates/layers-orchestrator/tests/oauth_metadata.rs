//! `/oauth/client-metadata.json` route tests.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use layers_orchestrator::oauth::OAuthClientConfig;
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
async fn metadata_route_emits_configured_document() {
    let cfg = OAuthClientConfig::defaults_for("https://layers.pub");
    let state = AppState::builder(lazy_pool(), "did:web:layers.test")
        .oauth_metadata(cfg.into_metadata())
        .ready(true)
        .build();
    let app = build_router(state);

    let resp = app
        .oneshot(
            Request::builder()
                .uri("/oauth/client-metadata.json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let value: serde_json::Value = serde_json::from_slice(&body).expect("json");
    assert_eq!(
        value["client_id"],
        "https://layers.pub/oauth/client-metadata.json"
    );
    assert_eq!(value["application_type"], "web");
    assert_eq!(value["dpop_bound_access_tokens"], true);
    assert!(
        value["scope"]
            .as_str()
            .unwrap_or_default()
            .contains("include:pub.layers.authReadOnly")
    );
    let redirects = value["redirect_uris"].as_array().unwrap();
    assert_eq!(
        redirects[0].as_str().unwrap(),
        "https://layers.pub/oauth/callback"
    );
}

#[tokio::test]
async fn metadata_route_503_when_unconfigured() {
    let state = AppState::builder(lazy_pool(), "did:web:layers.test")
        .ready(true)
        .build();
    let app = build_router(state);

    let resp = app
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
