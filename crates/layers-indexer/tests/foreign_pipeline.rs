//! End-to-end test for the foreign-record pipeline against a real
//! Postgres container. Drives a small in-memory event stream of
//! foreign frames through `drive_external` and verifies the rows land
//! in `external_records`.

use idiolect_indexer::{InMemoryEventStream, IndexerAction, RawEvent};
use layers_indexer::foreign::drive_external;
use layers_records::Nsid;
use layers_storage::external::PostgresExternalSink;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres;

async fn boot_postgres() -> (testcontainers::ContainerAsync<Postgres>, PgPool) {
    let container = Postgres::default()
        .start()
        .await
        .expect("start postgres container");
    let host_port = container
        .get_host_port_ipv4(5432)
        .await
        .expect("postgres port");
    let url = format!("postgres://postgres:postgres@127.0.0.1:{host_port}/postgres");
    let pool = PgPoolOptions::new()
        .max_connections(4)
        .connect(&url)
        .await
        .expect("connect");
    (container, pool)
}

fn frame(
    seq: u64,
    action: IndexerAction,
    did: &str,
    nsid: &str,
    rkey: &str,
    body: serde_json::Value,
) -> RawEvent {
    RawEvent {
        seq,
        live: true,
        did: did.to_owned(),
        rev: format!("rev{seq}"),
        collection: Nsid::parse(nsid.to_owned()).expect("nsid"),
        rkey: rkey.to_owned(),
        action,
        cid: Some(format!("bafy_{seq}")),
        body: Some(body),
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn foreign_records_land_in_external_table() {
    let (_container, pool) = boot_postgres().await;
    let sink = PostgresExternalSink::new(pool.clone());
    sink.ensure_table().await.expect("ensure_table");

    let mut stream = InMemoryEventStream::default();
    stream.push(frame(
        1,
        IndexerAction::Create,
        "did:plc:alice",
        "dev.idiolect.community",
        "rk1",
        serde_json::json!({"name": "Idiolect Communities"}),
    ));
    stream.push(frame(
        2,
        IndexerAction::Create,
        "did:plc:bob",
        "pub.leaflet.document",
        "doc1",
        serde_json::json!({"title": "On Layers"}),
    ));
    stream.push(frame(
        3,
        IndexerAction::Create,
        "did:plc:carol",
        "app.bsky.feed.post",
        "rk-skip",
        serde_json::json!({"text": "out of family"}),
    ));
    stream.push(frame(
        4,
        IndexerAction::Delete,
        "did:plc:bob",
        "pub.leaflet.document",
        "doc1",
        serde_json::Value::Null,
    ));

    drive_external(&mut stream, &sink, &["dev.idiolect.", "pub.leaflet."])
        .await
        .expect("drive");

    let rows: Vec<(String, String)> =
        sqlx::query_as("SELECT uri, nsid FROM external_records ORDER BY uri")
            .fetch_all(&pool)
            .await
            .expect("fetch");
    assert_eq!(
        rows.len(),
        1,
        "expected the surviving idiolect community row"
    );
    assert_eq!(rows[0].0, "at://did:plc:alice/dev.idiolect.community/rk1");
    assert_eq!(rows[0].1, "dev.idiolect.community");

    let bsky_count: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM external_records WHERE nsid = 'app.bsky.feed.post'",
    )
    .fetch_one(&pool)
    .await
    .expect("count");
    assert_eq!(bsky_count, 0, "out-of-prefix records must be skipped");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn idempotent_upsert_overwrites_in_place() {
    let (_container, pool) = boot_postgres().await;
    let sink = PostgresExternalSink::new(pool.clone());
    sink.ensure_table().await.expect("ensure_table");

    let mut stream = InMemoryEventStream::default();
    stream.push(frame(
        1,
        IndexerAction::Create,
        "did:plc:alice",
        "dev.idiolect.community",
        "rk1",
        serde_json::json!({"name": "v1"}),
    ));
    stream.push(frame(
        2,
        IndexerAction::Update,
        "did:plc:alice",
        "dev.idiolect.community",
        "rk1",
        serde_json::json!({"name": "v2"}),
    ));
    drive_external(&mut stream, &sink, &["dev.idiolect."])
        .await
        .expect("drive");

    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM external_records")
        .fetch_one(&pool)
        .await
        .expect("count");
    assert_eq!(count, 1);

    let body: sqlx::types::Json<serde_json::Value> =
        sqlx::query_scalar("SELECT record FROM external_records WHERE rkey = 'rk1'")
            .fetch_one(&pool)
            .await
            .expect("fetch body");
    assert_eq!(body.0["name"], "v2");
}
