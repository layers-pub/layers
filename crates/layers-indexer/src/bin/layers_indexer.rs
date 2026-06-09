//! Entry point for the `layers-indexer` binary.
//!
//! Reads configuration from environment variables (12-factor style),
//! wires up the firehose transport, cursor store, and storage sinks,
//! and runs `idiolect_indexer::drive_indexer` until shutdown.
//!
//! Environment:
//!
//! | var                       | meaning                                                              | default                                                                  |
//! | ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
//! | `LAYERS_DB_URL`           | PostgreSQL connection URL                                            | required                                                                 |
//! | `LAYERS_JETSTREAM_URL`    | Jetstream subscribe URL                                              | `wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=pub.layers.*` |
//! | `LAYERS_ES_URL`           | Elasticsearch base URL (enables ES sink when set)                    | unset                                                                    |
//! | `LAYERS_ES_AUTH`          | `Authorization` header value sent to ES                              | unset                                                                    |
//! | `LAYERS_NEO4J_URL`        | Neo4j base URL (enables Neo4j sink when set)                         | unset                                                                    |
//! | `LAYERS_NEO4J_DB`         | Neo4j database name                                                  | `neo4j`                                                                  |
//! | `LAYERS_NEO4J_AUTH`       | `Authorization` header value sent to Neo4j                           | unset                                                                    |
//! | `LAYERS_SUBSCRIPTION`     | Subscription id used as the cursor key                               | `layers-default`                                                         |
//! | `LAYERS_HEALTH_BIND`      | `<host>:<port>` for the indexer's health HTTP surface                | `0.0.0.0:8081`                                                           |
//! | `LAYERS_DB_MAX_CONN`      | Postgres pool max connections                                        | `8`                                                                      |
//! | `LAYERS_FOREIGN_PREFIXES` | Comma-separated NSID prefixes for the foreign-record pipeline       | `dev.idiolect.,pub.leaflet.,at.margin.,pub.semble.`                      |
//! | `LAYERS_FOREIGN_JETSTREAM` | Jetstream subscribe URL for the foreign pipeline                    | `wss://jetstream2.us-east.bsky.network/subscribe`                        |
//! | `LAYERS_LOG`              | Tracing filter                                                       | `layers_indexer=info,idiolect_indexer=info`                              |

use std::sync::Arc;

use anyhow::{Context, Result};
use idiolect_indexer::{
    BackoffPolicy, CursorStore, IndexerConfig, JetstreamEventStream, ReconnectingEventStream,
    drive_indexer,
};
use layers_indexer::LayersRecordHandler;
use layers_indexer::foreign::drive_external;
use layers_indexer::health::{HealthState, serve as serve_health};
use layers_records::LayersFamily;
use layers_storage::{
    DEFAULT_FOREIGN_PREFIXES, MultiSink, PostgresCursorStore, PostgresExternalSink,
    PostgresRecordSink, RecordSink,
};
use tokio::sync::oneshot;

const DEFAULT_JETSTREAM: &str =
    "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=pub.layers.*";

#[tokio::main]
#[allow(
    clippy::too_many_lines,
    reason = "linear startup wiring reads better as one function"
)]
async fn main() -> Result<()> {
    init_tracing();

    let db_url = std::env::var("LAYERS_DB_URL").context("LAYERS_DB_URL is required")?;
    let subscription_id =
        std::env::var("LAYERS_SUBSCRIPTION").unwrap_or_else(|_| "layers-default".to_owned());
    let jetstream_url =
        std::env::var("LAYERS_JETSTREAM_URL").unwrap_or_else(|_| DEFAULT_JETSTREAM.to_owned());

    tracing::info!(subscription = %subscription_id, jetstream = %jetstream_url, "layers-indexer starting");

    let db_max_conn: u32 = std::env::var("LAYERS_DB_MAX_CONN")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8);
    let pool = layers_storage::postgres::connect(&db_url, db_max_conn)
        .await
        .context("connecting to postgres")?;

    let cursor_store = PostgresCursorStore::new(pool.clone());
    cursor_store
        .ensure_table()
        .await
        .context("ensuring firehose_cursors table")?;

    let starting_cursor = cursor_store
        .load(&subscription_id)
        .await
        .context("loading firehose cursor")?;
    if let Some(c) = starting_cursor {
        tracing::info!(cursor = c, "resuming from cursor");
    }

    let mut sinks: Vec<Arc<dyn RecordSink>> = Vec::new();
    let record_sink = PostgresRecordSink::new(pool.clone());
    record_sink
        .ensure_tables()
        .await
        .context("ensuring pub.layers.* record tables")?;
    sinks.push(Arc::new(record_sink));

    #[cfg(feature = "elasticsearch")]
    if let Ok(url) = std::env::var("LAYERS_ES_URL") {
        let mut sink = layers_storage::ElasticsearchRecordSink::new(url)
            .context("building Elasticsearch sink")?;
        if let Ok(auth) = std::env::var("LAYERS_ES_AUTH") {
            sink = sink
                .with_header("authorization", &auth)
                .context("attaching ES Authorization header")?;
        }
        sinks.push(Arc::new(sink));
    }

    #[cfg(feature = "neo4j")]
    if let Ok(url) = std::env::var("LAYERS_NEO4J_URL") {
        let db = std::env::var("LAYERS_NEO4J_DB").unwrap_or_else(|_| "neo4j".to_owned());
        let mut sink =
            layers_storage::Neo4jRecordSink::new(url, db).context("building Neo4j sink")?;
        if let Ok(auth) = std::env::var("LAYERS_NEO4J_AUTH") {
            sink = sink
                .with_header("authorization", &auth)
                .context("attaching Neo4j Authorization header")?;
        }
        sinks.push(Arc::new(sink));
    }

    let multi = MultiSink::new(sinks);
    tracing::info!(sinks = multi.len(), "storage sinks configured");
    let handler = LayersRecordHandler::new(multi);

    let health_bind =
        std::env::var("LAYERS_HEALTH_BIND").unwrap_or_else(|_| "0.0.0.0:8081".to_owned());
    let health_addr: std::net::SocketAddr = health_bind
        .parse()
        .with_context(|| format!("parsing LAYERS_HEALTH_BIND={health_bind}"))?;
    let (health_shutdown_tx, health_shutdown_rx) = oneshot::channel::<()>();
    let health_state =
        HealthState::new(pool.clone(), cursor_store.clone(), subscription_id.clone());
    let (bound, health_join) = serve_health(health_addr, health_state, async move {
        let _ = health_shutdown_rx.await;
    })
    .await
    .context("starting health server")?;
    tracing::info!(bound = %bound, "indexer health server listening");

    let foreign_prefixes: Vec<String> = std::env::var("LAYERS_FOREIGN_PREFIXES").ok().map_or_else(
        || {
            DEFAULT_FOREIGN_PREFIXES
                .iter()
                .map(|s| (*s).to_owned())
                .collect()
        },
        |s| {
            s.split(',')
                .map(|p| p.trim().to_owned())
                .filter(|p| !p.is_empty())
                .collect()
        },
    );
    let foreign_external = PostgresExternalSink::new(pool.clone());
    foreign_external
        .ensure_table()
        .await
        .context("ensuring external_records table")?;
    let foreign_jetstream_base = std::env::var("LAYERS_FOREIGN_JETSTREAM")
        .unwrap_or_else(|_| "wss://jetstream2.us-east.bsky.network/subscribe".to_owned());
    let foreign_url = build_foreign_url(&foreign_jetstream_base, &foreign_prefixes);
    tracing::info!(
        prefixes = ?foreign_prefixes,
        url = %foreign_url,
        "foreign-record pipeline configured"
    );
    let foreign_prefixes_owned = foreign_prefixes.clone();
    let foreign_join = tokio::spawn(async move {
        let prefix_strs: Vec<&str> = foreign_prefixes_owned.iter().map(String::as_str).collect();
        match JetstreamEventStream::connect(&foreign_url).await {
            Ok(mut stream) => {
                if let Err(e) = drive_external(&mut stream, &foreign_external, &prefix_strs).await {
                    tracing::warn!(error = %e, "foreign pipeline terminated");
                }
            }
            Err(e) => tracing::warn!(error = %e, "foreign Jetstream connect failed"),
        }
    });

    let config = IndexerConfig { subscription_id };

    let factory = {
        let base = jetstream_url.clone();
        move |cursor: Option<u64>| {
            let base = base.clone();
            async move {
                let url = match cursor {
                    Some(c) => format!("{base}{}cursor={c}", sep(&base)),
                    None => base,
                };
                JetstreamEventStream::connect(&url).await
            }
        }
    };
    let mut stream =
        ReconnectingEventStream::with_cursor(factory, BackoffPolicy::default(), starting_cursor);

    let driver =
        drive_indexer::<LayersFamily, _, _, _>(&mut stream, &handler, &cursor_store, &config);

    tokio::select! {
        result = driver => {
            result.context("indexer loop terminated with error")?;
        }
        () = shutdown_signal() => {
            tracing::info!("shutting down");
        }
    }

    let _ = health_shutdown_tx.send(());
    let _ = health_join.await;

    foreign_join.abort();
    let _ = foreign_join.await;

    tracing::info!("layers-indexer exiting");
    Ok(())
}

/// Build the Jetstream URL for the foreign pipeline by appending one
/// `wantedCollections=<prefix>*` parameter per requested prefix. The
/// upstream Jetstream supports glob suffix matching on collections,
/// which keeps the foreign-pipeline transport narrow even when the
/// indexer is configured for many prefixes.
fn build_foreign_url(base: &str, prefixes: &[String]) -> String {
    let mut url = base.trim_end_matches('?').trim_end_matches('&').to_owned();
    let mut sep = if url.contains('?') { '&' } else { '?' };
    for prefix in prefixes {
        url.push(sep);
        url.push_str("wantedCollections=");
        url.push_str(prefix);
        url.push('*');
        sep = '&';
    }
    url
}

async fn shutdown_signal() {
    use tokio::signal::unix::{SignalKind, signal};
    let mut sigterm = signal(SignalKind::terminate()).expect("install SIGTERM handler");
    let mut sigint = signal(SignalKind::interrupt()).expect("install SIGINT handler");
    tokio::select! {
        _ = sigterm.recv() => tracing::info!("received SIGTERM"),
        _ = sigint.recv()  => tracing::info!("received SIGINT"),
    }
}

fn sep(url: &str) -> &'static str {
    if url.contains('?') { "&" } else { "?" }
}

fn init_tracing() {
    let filter = std::env::var("LAYERS_LOG")
        .unwrap_or_else(|_| "layers_indexer=info,idiolect_indexer=info".to_owned());
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::new(filter))
        .json()
        .init();
}
