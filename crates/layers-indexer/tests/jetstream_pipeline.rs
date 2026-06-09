//! End-to-end Jetstream → handler → Postgres pipeline test.
//!
//! Builds a synthetic Jetstream JSON-line stream via
//! `JetstreamEventStream::from_lines`, runs it through the
//! `LayersRecordHandler` against a real Postgres container, and
//! confirms records land + cursors commit.

use std::sync::Arc;

use idiolect_indexer::{CursorStore, IndexerConfig, JetstreamEventStream, drive_indexer};
use layers_indexer::LayersRecordHandler;
use layers_records::LayersFamily;
use layers_storage::{MultiSink, PostgresCursorStore, PostgresRecordSink, RecordSink};
use sqlx::PgPool;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres;

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

/// Shape of a Jetstream commit frame as documented at
/// <https://github.com/bluesky-social/jetstream>.
#[allow(
    clippy::needless_pass_by_value,
    reason = "test fixture builder takes owned JSON"
)]
fn jetstream_create_frame(
    time_us: u64,
    did: &str,
    rkey: &str,
    rev: &str,
    cid: &str,
    nsid: &str,
    body: serde_json::Value,
) -> String {
    serde_json::json!({
        "did": did,
        "time_us": time_us,
        "kind": "commit",
        "commit": {
            "rev": rev,
            "operation": "create",
            "collection": nsid,
            "rkey": rkey,
            "record": body,
            "cid": cid,
        }
    })
    .to_string()
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn jetstream_frames_index_into_postgres() {
    let (_container, pool) = boot_pg().await;

    let cursor_store = PostgresCursorStore::new(pool.clone());
    cursor_store
        .ensure_table()
        .await
        .expect("ensure cursor table");

    let sinks: Vec<Arc<dyn RecordSink>> = vec![Arc::new(PostgresRecordSink::new(pool.clone()))];
    let handler = LayersRecordHandler::new(MultiSink::new(sinks));

    let frames = vec![
        jetstream_create_frame(
            1_000_001,
            "did:plc:alice",
            "rk1",
            "3kabc",
            "bafyaaaa",
            "pub.layers.corpus.corpus",
            serde_json::json!({
                "$type": "pub.layers.corpus.corpus",
                "name": "Alpha",
                "languages": ["eng"],
                "createdAt": "2026-04-30T00:00:00Z",
            }),
        ),
        jetstream_create_frame(
            1_000_002,
            "did:plc:bob",
            "rk2",
            "3kdef",
            "bafybbbb",
            "pub.layers.corpus.corpus",
            serde_json::json!({
                "$type": "pub.layers.corpus.corpus",
                "name": "Beta",
                "languages": ["fra"],
                "createdAt": "2026-04-30T00:00:00Z",
            }),
        ),
    ];

    let mut stream = JetstreamEventStream::from_lines(frames);

    drive_indexer::<LayersFamily, _, _, _>(
        &mut stream,
        &handler,
        &cursor_store,
        &IndexerConfig {
            subscription_id: "jetstream-test".into(),
        },
    )
    .await
    .expect("drive indexer");

    let row_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM corpora")
        .fetch_one(&pool)
        .await
        .expect("count corpora");
    assert_eq!(row_count, 2);

    let cursor = cursor_store
        .load("jetstream-test")
        .await
        .expect("load cursor");
    assert_eq!(cursor, Some(1_000_002));
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn out_of_family_frames_do_not_create_rows() {
    let (_container, pool) = boot_pg().await;

    let cursor_store = PostgresCursorStore::new(pool.clone());
    cursor_store
        .ensure_table()
        .await
        .expect("ensure cursor table");

    let sinks: Vec<Arc<dyn RecordSink>> = vec![Arc::new(PostgresRecordSink::new(pool.clone()))];
    let handler = LayersRecordHandler::new(MultiSink::new(sinks));

    let frames = vec![jetstream_create_frame(
        2_000_001,
        "did:plc:alice",
        "rk1",
        "3kabc",
        "bafyaaaa",
        "app.bsky.feed.post",
        serde_json::json!({"$type": "app.bsky.feed.post", "text": "hi"}),
    )];

    let mut stream = JetstreamEventStream::from_lines(frames);

    drive_indexer::<LayersFamily, _, _, _>(
        &mut stream,
        &handler,
        &cursor_store,
        &IndexerConfig {
            subscription_id: "jetstream-skip".into(),
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
