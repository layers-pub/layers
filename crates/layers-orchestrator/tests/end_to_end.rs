//! End-to-end pipeline test against a real Postgres container.
//!
//! Boots a Postgres 16 container via testcontainers, runs the project's
//! SQL migrations, drives a few mock firehose commits through the
//! `LayersRecordHandler` + `PostgresRecordSink` pair, and finally hits
//! the orchestrator's `/xrpc/pub.layers.corpus.getCorpus` endpoint to
//! confirm the indexed row round-trips out as JSON. Exercises:
//!
//! - SQL migrations under `migrations/`.
//! - `PostgresCursorStore::ensure_table` + the indexer's cursor commits.
//! - `LayersRecordHandler` -> `PostgresRecordSink::put_record` storing
//!   the decoded corpus body (name / languages / domain) as `record` JSONB.
//! - Generated route at `/xrpc/pub.layers.corpus.getCorpus`.
//! - Orchestrator's JSON envelope shape (`{records|record, cursor?}`).

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use idiolect_indexer::{
    CursorStore, InMemoryEventStream, IndexerAction, IndexerConfig, RawEvent, drive_indexer,
};
use layers_indexer::LayersRecordHandler;
use layers_orchestrator::{AppState, build_router};
use layers_records::{LayersFamily, Nsid};
use layers_storage::{PostgresCursorStore, PostgresRecordSink, RecordSink};
use serde_json::{Value, json};
use sqlx::PgPool;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;

const MIGRATIONS: &[&str] = &[
    include_str!("../../../migrations/0001_firehose_cursors.sql"),
    include_str!("../../../migrations/0002_record_tables.sql"),
];

async fn boot_pg() -> (testcontainers::ContainerAsync<Postgres>, PgPool) {
    let container = Postgres::default()
        .start()
        .await
        .expect("start postgres container");
    let host_port = container
        .get_host_port_ipv4(5432)
        .await
        .expect("postgres host port");
    let url = format!("postgres://postgres:postgres@127.0.0.1:{host_port}/postgres");
    let pool = layers_storage::postgres::connect(&url, 4)
        .await
        .expect("connect pool");
    for sql in MIGRATIONS {
        sqlx::raw_sql(sql)
            .execute(&pool)
            .await
            .expect("run migration");
    }
    (container, pool)
}

fn corpus_event(seq: u64, did: &str, rkey: &str, name: &str, language: &str) -> RawEvent {
    RawEvent {
        seq,
        live: true,
        did: did.to_owned(),
        rev: format!("rev-{seq}"),
        rkey: rkey.to_owned(),
        collection: Nsid::parse("pub.layers.corpus.corpus").expect("nsid"),
        action: IndexerAction::Create,
        cid: Some(format!("cid-{seq}")),
        body: Some(json!({
            "$type": "pub.layers.corpus.corpus",
            "name": name,
            "languages": [language],
            "createdAt": "2026-04-30T00:00:00Z",
        })),
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn pipeline_indexes_corpus_and_serves_get() {
    let (_container, pool) = boot_pg().await;

    let cursor_store = PostgresCursorStore::new(pool.clone());
    cursor_store
        .ensure_table()
        .await
        .expect("ensure cursor table");

    let sinks: Vec<Arc<dyn RecordSink>> = vec![Arc::new(PostgresRecordSink::new(pool.clone()))];
    let handler = LayersRecordHandler::new(layers_storage::MultiSink::new(sinks));

    let mut stream = InMemoryEventStream::new();
    stream.push(corpus_event(1, "did:plc:alice", "rk1", "Alpha", "eng"));
    stream.push(corpus_event(2, "did:plc:bob", "rk2", "Beta", "fra"));

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

    let row_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM corpora")
        .fetch_one(&pool)
        .await
        .expect("count corpora");
    assert_eq!(row_count, 2);

    let cursor = cursor_store.load("test").await.expect("load cursor");
    assert_eq!(cursor, Some(2));

    let state = AppState::ready(pool.clone(), "did:web:layers.test");
    let resp = build_router(state.clone())
        .oneshot(
            Request::builder()
                .uri("/xrpc/pub.layers.corpus.getCorpus?uri=at%3A%2F%2Fdid%3Aplc%3Aalice%2Fpub.layers.corpus.corpus%2Frk1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let payload: Value = serde_json::from_slice(&body).expect("json body");
    assert_eq!(
        payload["uri"],
        "at://did:plc:alice/pub.layers.corpus.corpus/rk1"
    );
    assert_eq!(payload["value"]["name"], "Alpha");
    assert_eq!(payload["value"]["languages"][0], "eng");

    // Public-read tier should serve the same response without auth: this
    // checkpoint really exercises the middleware against a real DB instead
    // of relying on the lazy-pool failure mode that tests/router.rs uses.
    let resp = build_router(state.clone())
        .oneshot(
            Request::builder()
                .uri("/xrpc/pub.layers.corpus.getCorpus?uri=at%3A%2F%2Fdid%3Aplc%3Aalice%2Fpub.layers.corpus.corpus%2Frk1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), axum::http::StatusCode::OK);

    let resp = build_router(state.clone())
        .oneshot(
            Request::builder()
                .uri("/xrpc/pub.layers.corpus.listCorpora?limit=10")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let payload: Value = serde_json::from_slice(&body).expect("json body");
    assert_eq!(payload["records"].as_array().unwrap().len(), 2);

    let resp = build_router(state)
        .oneshot(
            Request::builder()
                .uri("/xrpc/pub.layers.corpus.listCorpora?did=did%3Aplc%3Aalice")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let payload: Value = serde_json::from_slice(&body).expect("json body");
    let records = payload["records"].as_array().unwrap();
    assert_eq!(records.len(), 1);
    assert!(
        records[0]["uri"]
            .as_str()
            .unwrap_or_default()
            .starts_with("at://did:plc:alice/")
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn delete_event_removes_record() {
    let (_container, pool) = boot_pg().await;

    let cursor_store = PostgresCursorStore::new(pool.clone());
    cursor_store
        .ensure_table()
        .await
        .expect("ensure cursor table");

    let sinks: Vec<Arc<dyn RecordSink>> = vec![Arc::new(PostgresRecordSink::new(pool.clone()))];
    let handler = LayersRecordHandler::new(layers_storage::MultiSink::new(sinks));

    let mut stream = InMemoryEventStream::new();
    stream.push(corpus_event(1, "did:plc:alice", "rk1", "Alpha", "eng"));
    stream.push(RawEvent {
        seq: 2,
        live: true,
        did: "did:plc:alice".into(),
        rev: "rev-2".into(),
        rkey: "rk1".into(),
        collection: Nsid::parse("pub.layers.corpus.corpus").unwrap(),
        action: IndexerAction::Delete,
        cid: None,
        body: None,
    });

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

    let row_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM corpora")
        .fetch_one(&pool)
        .await
        .expect("count corpora");
    assert_eq!(row_count, 0);
}
