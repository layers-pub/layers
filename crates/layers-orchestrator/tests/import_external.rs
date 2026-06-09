//! End-to-end test for `pub.layers.integration.getExternal`.
//!
//! Boots a real Postgres container, a wiremock-served DID document
//! (so the resolver finds an `#atproto_pds` endpoint), and a
//! wiremock-served PDS that answers `com.atproto.repo.getRecord`.
//! The first import populates `external_records`; the second hits
//! the cache and does not call the PDS again.

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use layers_auth::did::{DidResolverConfig, DidResolverImpl};
use layers_orchestrator::{AppState, build_router};
use layers_storage::PostgresExternalSink;
use serde_json::json;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;
use wiremock::matchers::{method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

const FOREIGN_DID: &str = "did:plc:bobbobbobbobbobbobbobbob";
const FOREIGN_NSID: &str = "app.bsky.feed.post";
const FOREIGN_RKEY: &str = "rk1";

async fn boot_postgres() -> (testcontainers::ContainerAsync<Postgres>, PgPool) {
    let container = Postgres::default().start().await.expect("start postgres");
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

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn import_fetches_from_pds_then_serves_from_cache() {
    let (_pg, pool) = boot_postgres().await;
    let plc = MockServer::start().await;
    let pds = MockServer::start().await;

    let did_doc = json!({
        "@context": ["https://www.w3.org/ns/did/v1"],
        "id": FOREIGN_DID,
        "verificationMethod": [],
        "service": [
            {
                "id": format!("{FOREIGN_DID}#atproto_pds"),
                "type": "AtprotoPersonalDataServer",
                "serviceEndpoint": pds.uri()
            }
        ]
    });
    Mock::given(method("GET"))
        .and(path(format!("/{FOREIGN_DID}")))
        .respond_with(ResponseTemplate::new(200).set_body_json(did_doc))
        .expect(1)
        .mount(&plc)
        .await;

    Mock::given(method("GET"))
        .and(path("/xrpc/com.atproto.repo.getRecord"))
        .and(query_param("repo", FOREIGN_DID))
        .and(query_param("collection", FOREIGN_NSID))
        .and(query_param("rkey", FOREIGN_RKEY))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "uri": format!("at://{FOREIGN_DID}/{FOREIGN_NSID}/{FOREIGN_RKEY}"),
            "cid": "bafyreictest",
            "value": {
                "text": "hello world",
                "createdAt": "2026-04-28T12:00:00Z"
            }
        })))
        .expect(1) // exactly one network fetch — second call is cache
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
        .ready(true)
        .build();
    let app = build_router(state);

    let uri_param = format!("at%3A%2F%2F{FOREIGN_DID}%2F{FOREIGN_NSID}%2F{FOREIGN_RKEY}");
    let url = format!("/xrpc/pub.layers.integration.getExternal?uri={uri_param}");

    let resp = app
        .clone()
        .oneshot(Request::builder().uri(&url).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).expect("json");
    assert_eq!(payload["fromCache"], false);
    assert_eq!(payload["nsid"], FOREIGN_NSID);
    assert_eq!(payload["value"]["text"], "hello world");

    // Second call must serve from cache (and not hit either mock).
    let resp = app
        .oneshot(Request::builder().uri(&url).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).expect("json");
    assert_eq!(payload["fromCache"], true);
    assert_eq!(payload["value"]["text"], "hello world");

    // wiremock asserts each Mock's `expect(1)` count when servers drop.
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn missing_pds_endpoint_returns_400() {
    let (_pg, pool) = boot_postgres().await;
    let plc = MockServer::start().await;

    let did_doc = json!({
        "@context": ["https://www.w3.org/ns/did/v1"],
        "id": FOREIGN_DID,
        "verificationMethod": [],
        "service": []
    });
    Mock::given(method("GET"))
        .and(path(format!("/{FOREIGN_DID}")))
        .respond_with(ResponseTemplate::new(200).set_body_json(did_doc))
        .mount(&plc)
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
        .ready(true)
        .build();
    let app = build_router(state);

    let uri_param = format!("at%3A%2F%2F{FOREIGN_DID}%2F{FOREIGN_NSID}%2F{FOREIGN_RKEY}");
    let url = format!("/xrpc/pub.layers.integration.getExternal?uri={uri_param}");
    let resp = app
        .oneshot(Request::builder().uri(&url).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn malformed_at_uri_returns_400_without_pds_call() {
    let (_pg, pool) = boot_postgres().await;
    let external_sink: Arc<dyn layers_storage::ExternalRecordSink> =
        Arc::new(PostgresExternalSink::new(pool.clone()));
    let state = AppState::builder(pool.clone(), "did:web:layers.test")
        .external_sink(external_sink)
        .ready(true)
        .build();
    let app = build_router(state);

    let resp = app
        .oneshot(
            Request::builder()
                .uri("/xrpc/pub.layers.integration.getExternal?uri=https%3A%2F%2Fexample.com")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}
