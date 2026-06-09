//! Integration test for `PostgresRecordSink::ensure_tables` against a
//! real Postgres container. Verifies that the generated record-table
//! DDL (`migrations/0002_record_tables.sql`) creates exactly the tables
//! named in the generated NSID->table map, idempotently, and that a
//! record then round-trips into its mapped table.

use layers_records::tables::TABLES;
use layers_records::{AnyRecord, LayersFamily, RecordFamily};
use layers_storage::{PostgresRecordSink, RecordSink};
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

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn ensure_tables_creates_every_mapped_table_idempotently() {
    let (_pg, pool) = boot_postgres().await;
    let sink = PostgresRecordSink::new(pool.clone());

    // Called twice: must be idempotent (every statement is IF NOT EXISTS).
    sink.ensure_tables().await.expect("ensure_tables");
    sink.ensure_tables()
        .await
        .expect("ensure_tables (second call)");

    // Every table named in the generated map must now exist.
    for (nsid, table) in TABLES {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables \
             WHERE table_schema = 'public' AND table_name = $1)",
        )
        .bind(table)
        .fetch_one(&pool)
        .await
        .expect("query information_schema");
        assert!(exists, "table `{table}` for `{nsid}` was not created");
    }

    // Count matches the generated map exactly (no extra record tables).
    let public_tables: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM information_schema.tables \
         WHERE table_schema = 'public' AND table_name = ANY($1)",
    )
    .bind(
        TABLES
            .iter()
            .map(|(_, t)| (*t).to_owned())
            .collect::<Vec<_>>(),
    )
    .fetch_one(&pool)
    .await
    .expect("count");
    assert_eq!(public_tables, TABLES.len() as i64);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn record_round_trips_into_its_mapped_table() {
    let (_pg, pool) = boot_postgres().await;
    let sink = PostgresRecordSink::new(pool.clone());
    sink.ensure_tables().await.expect("ensure_tables");

    let corpus = AnyRecord::Corpus(
        serde_json::from_value(serde_json::json!({
            "createdAt": "2026-04-28T00:00:00Z",
            "name": "Alpha",
        }))
        .expect("build corpus"),
    );
    let nsid = LayersFamily::nsid_str(&corpus);
    let table = layers_records::tables::table_for(nsid).expect("table for corpus");
    assert_eq!(table, "corpora");

    sink.put_record("did:plc:alice", "rk1", Some("bafycid"), &corpus)
        .await
        .expect("put_record");

    let name: String = sqlx::query_scalar(&format!("SELECT record->>'name' FROM {table}"))
        .fetch_one(&pool)
        .await
        .expect("read back");
    assert_eq!(name, "Alpha");

    // delete_record resolves the same mapped table.
    sink.delete_record("did:plc:alice", nsid, "rk1")
        .await
        .expect("delete_record");
    let count: i64 = sqlx::query_scalar(&format!("SELECT count(*) FROM {table}"))
        .fetch_one(&pool)
        .await
        .expect("count after delete");
    assert_eq!(count, 0);
}
