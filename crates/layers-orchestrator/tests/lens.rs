//! End-to-end test for `pub.layers.integration.applyLens`.
//!
//! Exercises the panproto-runtime path: imports a foreign record
//! from a wiremock-served PDS, then dispatches through
//! [`layers_orchestrator::lens::PanprotoLensApplier`] which calls
//! [`idiolect_lens::apply_lens`]. The lens AT-URI in the registry
//! is intentionally pointed at an empty `InMemoryResolver`, so the
//! handler returns a structured `BadRequest` whose message names
//! the underlying `apply_lens` failure — proving the dispatch chain
//! reaches the panproto runtime.
//!
//! Authoring full panproto lens records + matching source/target
//! schemas is a separate workstream tracked in `lexicons/lenses/`.
//! Once those land, swap the empty `InMemoryResolver` for one
//! pre-loaded with the lens record and assert on the lensed body.

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use idiolect_lens::AtUri;
use idiolect_lens::resolver::InMemoryResolver;
use idiolect_lens::schema_loader::InMemorySchemaLoader;
use layers_auth::did::{DidResolverConfig, DidResolverImpl};
use layers_orchestrator::lens::{LensApplier, PanprotoLensApplier};
use layers_orchestrator::{AppState, build_router};
use layers_storage::PostgresExternalSink;
use panproto_schema::Protocol;
use serde_json::json;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;
use wiremock::matchers::{method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

const FOREIGN_DID: &str = "did:plc:bobbobbobbobbobbobbobbob";

async fn boot_postgres() -> (testcontainers::ContainerAsync<Postgres>, PgPool) {
    let container = Postgres::default()
        .start()
        .await
        .expect("start postgres");
    let port = container
        .get_host_port_ipv4(5432)
        .await
        .expect("postgres port");
    let url = format!("postgres://postgres:postgres@127.0.0.1:{port}/postgres");
    let pool = PgPoolOptions::new()
        .max_connections(4)
        .connect(&url)
        .await
        .expect("connect");
    PostgresExternalSink::new(pool.clone())
        .ensure_table()
        .await
        .expect("external_records");
    (container, pool)
}

fn applier_with_registered_lens() -> Arc<dyn LensApplier> {
    let lens_uri = AtUri::parse(
        "at://did:plc:lensowner/dev.panproto.schema.lens/margin-note-v1",
    )
    .unwrap();
    Arc::new(
        PanprotoLensApplier::new(
            Arc::new(InMemoryResolver::new()),
            Arc::new(InMemorySchemaLoader::new()),
            Protocol::default(),
        )
        .register(
            "at.margin.note",
            lens_uri,
            "pub.layers.annotation.annotationLayer",
        ),
    )
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn apply_lens_returns_400_when_no_applier_configured() {
    let (_pg, pool) = boot_postgres().await;
    let state = AppState::builder(pool, "did:web:layers.test")
        .ready(true)
        .build();
    let app = build_router(state);

    let url = format!(
        "/xrpc/pub.layers.integration.applyLens?uri=at%3A%2F%2F{FOREIGN_DID}%2Fat.margin.note%2Frk1"
    );
    let resp = app
        .oneshot(Request::builder().uri(&url).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn apply_lens_returns_400_when_source_nsid_unregistered() {
    let (_pg, pool) = boot_postgres().await;
    let plc = MockServer::start().await;
    let pds = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path(format!("/{FOREIGN_DID}")))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "id": FOREIGN_DID,
            "verificationMethod": [],
            "service": [{
                "id": format!("{FOREIGN_DID}#atproto_pds"),
                "type": "AtprotoPersonalDataServer",
                "serviceEndpoint": pds.uri()
            }]
        })))
        .mount(&plc)
        .await;

    Mock::given(method("GET"))
        .and(path("/xrpc/com.atproto.repo.getRecord"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "uri": format!("at://{FOREIGN_DID}/com.example.unknown/rk"),
            "cid": "bafy",
            "value": {"hello": "world"}
        })))
        .mount(&pds)
        .await;

    let resolver = Arc::new(DidResolverImpl::with_config(DidResolverConfig {
        plc_directory: plc.uri(),
        ..DidResolverConfig::default()
    }));
    let external_sink: Arc<dyn layers_storage::ExternalRecordSink> =
        Arc::new(PostgresExternalSink::new(pool.clone()));
    let state = AppState::builder(pool.clone(), "did:web:layers.test")
        .resolver(resolver)
        .external_sink(external_sink)
        .lens_applier(applier_with_registered_lens())
        .ready(true)
        .build();
    let app = build_router(state);

    let url = format!(
        "/xrpc/pub.layers.integration.applyLens?uri=at%3A%2F%2F{FOREIGN_DID}%2Fcom.example.unknown%2Frk"
    );
    let resp = app
        .oneshot(Request::builder().uri(&url).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).expect("json");
    assert!(
        payload["message"]
            .as_str()
            .unwrap_or_default()
            .contains("com.example.unknown"),
        "got: {payload:?}"
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn apply_lens_dispatches_into_panproto_runtime_for_registered_nsid() {
    let (_pg, pool) = boot_postgres().await;
    let plc = MockServer::start().await;
    let pds = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path(format!("/{FOREIGN_DID}")))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "id": FOREIGN_DID,
            "verificationMethod": [],
            "service": [{
                "id": format!("{FOREIGN_DID}#atproto_pds"),
                "type": "AtprotoPersonalDataServer",
                "serviceEndpoint": pds.uri()
            }]
        })))
        .mount(&plc)
        .await;

    Mock::given(method("GET"))
        .and(path("/xrpc/com.atproto.repo.getRecord"))
        .and(query_param("repo", FOREIGN_DID))
        .and(query_param("collection", "at.margin.note"))
        .and(query_param("rkey", "rk1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "uri": format!("at://{FOREIGN_DID}/at.margin.note/rk1"),
            "cid": "bafy",
            "value": {"motivation":"highlighting","target":{"source":"https://example.com"}}
        })))
        .mount(&pds)
        .await;

    let resolver = Arc::new(DidResolverImpl::with_config(DidResolverConfig {
        plc_directory: plc.uri(),
        ..DidResolverConfig::default()
    }));
    let external_sink: Arc<dyn layers_storage::ExternalRecordSink> =
        Arc::new(PostgresExternalSink::new(pool.clone()));
    let state = AppState::builder(pool.clone(), "did:web:layers.test")
        .resolver(resolver)
        .external_sink(external_sink)
        .lens_applier(applier_with_registered_lens())
        .ready(true)
        .build();
    let app = build_router(state);

    let url = format!(
        "/xrpc/pub.layers.integration.applyLens?uri=at%3A%2F%2F{FOREIGN_DID}%2Fat.margin.note%2Frk1"
    );
    let resp = app
        .oneshot(Request::builder().uri(&url).body(Body::empty()).unwrap())
        .await
        .unwrap();
    // Registry knows the source NSID, but the lens record was never
    // published into the InMemoryResolver, so the panproto runtime
    // bubbles a NotFound through `apply_lens`. The orchestrator
    // surfaces it as 400 with the underlying message — proving the
    // dispatch chain reaches `idiolect_lens::apply_lens` rather
    // than falling through to a Rust closure.
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).expect("json");
    let message = payload["message"].as_str().unwrap_or_default();
    assert!(
        message.contains("apply_lens") || message.contains("not found") || message.contains("NotFound"),
        "expected runtime-routed error; got: {message}"
    );
}
