//! Entry point for the `layers-observer` binary.
//!
//! Connects to Postgres, builds the [`PostgresSource`] over the indexed
//! tables, wires an [`NdjsonPublisher`] writing to the configured
//! output, and runs the scheduler on a fixed cadence until SIGTERM.
//!
//! Environment:
//!
//! | var                    | meaning                                           | default                |
//! | ---------------------- | ------------------------------------------------- | ---------------------- |
//! | `LAYERS_DB_URL`        | Postgres connection URL                           | required               |
//! | `LAYERS_OBSERVER_OUT`  | NDJSON output file (`-` for stdout)               | `-`                    |
//! | `LAYERS_OBSERVER_INTERVAL_S` | Tick interval in seconds                     | `300`                  |
//! | `LAYERS_DB_MAX_CONN`   | Postgres pool max connections                     | `4`                    |
//! | `LAYERS_LOG`           | Tracing filter                                    | `layers_observer=info` |

use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result};
use layers_observer::{NdjsonPublisher, PostgresSource, Scheduler, SchedulerConfig, run};
use tokio::signal::unix::{SignalKind, signal};

#[tokio::main]
async fn main() -> Result<()> {
    init_tracing();

    let db_url = std::env::var("LAYERS_DB_URL").context("LAYERS_DB_URL is required")?;
    let out = std::env::var("LAYERS_OBSERVER_OUT").unwrap_or_else(|_| "-".to_owned());
    let interval_s: u64 = std::env::var("LAYERS_OBSERVER_INTERVAL_S")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(300);
    let db_max_conn: u32 = std::env::var("LAYERS_DB_MAX_CONN")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(4);

    let pool = layers_storage::postgres::connect(&db_url, db_max_conn)
        .await
        .context("connecting to postgres")?;

    let source = Arc::new(PostgresSource::new(pool));

    let writer: Box<dyn std::io::Write + Send> = if out == "-" {
        Box::new(std::io::stdout())
    } else {
        Box::new(
            std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&out)
                .with_context(|| format!("opening {out}"))?,
        )
    };
    let publisher = Arc::new(NdjsonPublisher::new(writer));

    let scheduler = Scheduler {
        source,
        publisher,
        config: SchedulerConfig {
            interval: Duration::from_secs(interval_s),
        },
    };

    tracing::info!(interval_s, out = %out, "layers-observer starting");
    let total = run(scheduler, Box::pin(shutdown_signal())).await;
    tracing::info!(total, "layers-observer exiting");
    Ok(())
}

async fn shutdown_signal() {
    let mut sigterm = signal(SignalKind::terminate()).expect("SIGTERM");
    let mut sigint = signal(SignalKind::interrupt()).expect("SIGINT");
    tokio::select! {
        _ = sigterm.recv() => tracing::info!("received SIGTERM"),
        _ = sigint.recv()  => tracing::info!("received SIGINT"),
    }
}

fn init_tracing() {
    let filter = std::env::var("LAYERS_LOG")
        .unwrap_or_else(|_| "layers_observer=info".to_owned());
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::new(filter))
        .json()
        .init();
}
