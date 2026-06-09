//! Integration test for the generated list-filter paths against a real
//! Postgres container. Drives a corpus membership and an alignment
//! through the indexer, then exercises the orchestrator's filtered list
//! endpoints — proving the corrected `http_query` paths resolve to real
//! record fields (flat `record->>'corpusRef'`) and that `objectRef`
//! fields filter through the nested `record->'source'->>'recordRef'`.

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use idiolect_indexer::{
    InMemoryEventStream, IndexerAction, IndexerConfig, RawEvent, drive_indexer,
};
use layers_indexer::LayersRecordHandler;
use layers_orchestrator::{AppState, build_router};
use layers_records::{LayersFamily, Nsid};
use layers_storage::{PostgresCursorStore, PostgresRecordSink, RecordSink};
use serde_json::Value;
use sqlx::PgPool;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;

async fn boot_pg() -> (testcontainers::ContainerAsync<Postgres>, PgPool) {
    let container = Postgres::default().start().await.expect("start postgres");
    let host_port = container
        .get_host_port_ipv4(5432)
        .await
        .expect("postgres port");
    let url = format!("postgres://postgres:postgres@127.0.0.1:{host_port}/postgres");
    let pool = layers_storage::postgres::connect(&url, 4)
        .await
        .expect("connect pool");
    (container, pool)
}

fn event(seq: u64, did: &str, nsid: &str, rkey: &str, body: Value) -> RawEvent {
    RawEvent {
        seq,
        live: true,
        did: did.to_owned(),
        rev: format!("rev-{seq}"),
        rkey: rkey.to_owned(),
        collection: Nsid::parse(nsid.to_owned()).expect("nsid"),
        action: IndexerAction::Create,
        cid: Some(format!("cid-{seq}")),
        body: Some(body),
    }
}

async fn get_records(app: &axum::Router, uri: &str) -> Vec<Value> {
    let resp = app
        .clone()
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK, "request to {uri} failed");
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let payload: Value = serde_json::from_slice(&body).expect("json");
    payload["records"].as_array().cloned().unwrap_or_default()
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn list_filters_resolve_real_record_fields() {
    let (_pg, pool) = boot_pg().await;

    let cursor_store = PostgresCursorStore::new(pool.clone());
    cursor_store.ensure_table().await.expect("ensure cursors");
    let record_sink = PostgresRecordSink::new(pool.clone());
    record_sink
        .ensure_tables()
        .await
        .expect("ensure record tables");

    let sinks: Vec<Arc<dyn RecordSink>> = vec![Arc::new(record_sink)];
    let handler = LayersRecordHandler::new(layers_storage::MultiSink::new(sinks));

    let corpus_a = "at://did:plc:alice/pub.layers.corpus.corpus/cA";
    let corpus_b = "at://did:plc:alice/pub.layers.corpus.corpus/cB";
    let expr_src = "at://did:plc:alice/pub.layers.expression.expression/s1";

    let mut stream = InMemoryEventStream::new();
    stream.push(event(
        1,
        "did:plc:alice",
        "pub.layers.corpus.membership",
        "m1",
        serde_json::json!({
            "createdAt": "2026-04-30T00:00:00Z",
            "corpusRef": corpus_a,
            "expressionRef": "at://did:plc:alice/pub.layers.expression.expression/e1",
        }),
    ));
    stream.push(event(
        2,
        "did:plc:alice",
        "pub.layers.alignment.alignment",
        "a1",
        serde_json::json!({
            "createdAt": "2026-04-30T00:00:00Z",
            "kind": "translation",
            "links": [],
            "source": { "recordRef": expr_src },
        }),
    ));

    drive_indexer::<LayersFamily, _, _, _>(
        &mut stream,
        &handler,
        &cursor_store,
        &IndexerConfig {
            subscription_id: "test".into(),
        },
    )
    .await
    .expect("drive indexer");

    let state = AppState::ready(pool.clone(), "did:web:layers.test");
    let app = build_router(state);

    // Flat corrected path: `corpusRef` (was the nonexistent `corpus`).
    let enc_a = urlencoding(corpus_a);
    let hits = get_records(
        &app,
        &format!("/xrpc/pub.layers.corpus.listMemberships?corpusRef={enc_a}"),
    )
    .await;
    assert_eq!(hits.len(), 1, "membership should match its corpusRef");

    // A non-matching value must filter the row out (proves the filter
    // actually applies, not that it is ignored).
    let enc_b = urlencoding(corpus_b);
    let misses = get_records(
        &app,
        &format!("/xrpc/pub.layers.corpus.listMemberships?corpusRef={enc_b}"),
    )
    .await;
    assert!(misses.is_empty(), "wrong corpusRef must match nothing");

    // Nested objectRef path: `source` filters via record->'source'->>'recordRef'.
    let enc_src = urlencoding(expr_src);
    let aligned = get_records(
        &app,
        &format!("/xrpc/pub.layers.alignment.listAlignments?source={enc_src}"),
    )
    .await;
    assert_eq!(
        aligned.len(),
        1,
        "alignment should match its source recordRef"
    );

    let misaligned = get_records(
        &app,
        "/xrpc/pub.layers.alignment.listAlignments?source=at%3A%2F%2Fnope",
    )
    .await;
    assert!(misaligned.is_empty(), "wrong source must match nothing");
}

/// Minimal percent-encoding for an at-uri query value (`:` and `/`).
fn urlencoding(s: &str) -> String {
    s.replace(':', "%3A").replace('/', "%2F")
}
