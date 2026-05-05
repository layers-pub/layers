//! Entry point for the `layers-orchestrator` binary.
//!
//! Environment:
//!
//! | var               | meaning                                        | default                |
//! | ----------------- | ---------------------------------------------- | ---------------------- |
//! | `LAYERS_DB_URL`   | PostgreSQL connection URL                      | required               |
//! | `LAYERS_BIND`     | `<host>:<port>` to listen on                   | `0.0.0.0:8080`         |
//! | `LAYERS_DID`      | Service DID (used as `aud` for service-auth)   | `did:web:layers.pub`   |
//! | `LAYERS_PLC_DIRECTORY` | `did:plc` directory base URL              | `https://plc.directory`|
//! | `LAYERS_REDIS_URL`     | Redis URL (enables the rate limiter)      | unset                  |
//! | `LAYERS_RATE_LIMIT`    | Allowed requests per window (with Redis)  | `120`                  |
//! | `LAYERS_RATE_WINDOW_S` | Rate-limit window in seconds              | `60`                   |
//! | `LAYERS_DB_MAX_CONN`   | Postgres pool max connections             | `8`                    |
//! | `LAYERS_TRUST_FORWARDED_FOR` | Honour `X-Forwarded-For` / `Forwarded` | `false`              |
//! | `LAYERS_PUBLIC_ORIGIN` | Public origin URL the appview is reachable at | unset (no OAuth metadata) |
//! | `LAYERS_OAUTH_REDIRECT` | Comma-separated OAuth redirect URIs       | `<origin>/oauth/callback` |
//! | `LAYERS_LOG`      | Tracing filter                                 | `layers_orchestrator=info` |

use std::sync::Arc;

use anyhow::{Context, Result};
use layers_auth::did::{DidResolverConfig, DidResolverImpl};
use layers_orchestrator::{AppState, build_router};
use layers_orchestrator::metrics::install_recorder;
use tokio::signal::unix::{SignalKind, signal};

#[tokio::main]
async fn main() -> Result<()> {
    init_tracing();

    let db_url = std::env::var("LAYERS_DB_URL").context("LAYERS_DB_URL is required")?;
    let bind = std::env::var("LAYERS_BIND").unwrap_or_else(|_| "0.0.0.0:8080".to_owned());
    let service_did =
        std::env::var("LAYERS_DID").unwrap_or_else(|_| "did:web:layers.pub".to_owned());
    let plc_directory = std::env::var("LAYERS_PLC_DIRECTORY")
        .unwrap_or_else(|_| "https://plc.directory".to_owned());

    let db_max_conn: u32 = parse_env("LAYERS_DB_MAX_CONN", 8);
    let trust_forwarded_for = parse_bool_env("LAYERS_TRUST_FORWARDED_FOR", false);

    let pool = layers_storage::postgres::connect(&db_url, db_max_conn)
        .await
        .context("connecting to postgres")?;
    let external_sink: std::sync::Arc<dyn layers_storage::ExternalRecordSink> =
        std::sync::Arc::new(layers_storage::PostgresExternalSink::new(pool.clone()));
    if let Err(e) = layers_storage::PostgresExternalSink::new(pool.clone())
        .ensure_table()
        .await
    {
        tracing::warn!(error = %e, "failed to ensure external_records table");
    }

    let metrics = install_recorder().context("installing prometheus recorder")?;
    let resolver = Arc::new(DidResolverImpl::with_config(DidResolverConfig {
        plc_directory,
        ..DidResolverConfig::default()
    }));

    let mut state_builder = AppState::builder(pool, service_did)
        .resolver(resolver)
        .metrics(metrics)
        .trust_forwarded_for(trust_forwarded_for)
        .external_sink(external_sink)
        .ready(true);

    if let Ok(public_origin) = std::env::var("LAYERS_PUBLIC_ORIGIN") {
        let mut cfg = layers_orchestrator::oauth::OAuthClientConfig::defaults_for(public_origin);
        if let Ok(redirects) = std::env::var("LAYERS_OAUTH_REDIRECT") {
            cfg.redirect_uris = redirects
                .split(',')
                .map(|s| s.trim().to_owned())
                .filter(|s| !s.is_empty())
                .collect();
        }
        state_builder = state_builder.oauth_metadata(cfg.into_metadata());
    }

    if let Ok(redis_url) = std::env::var("LAYERS_REDIS_URL") {
        let conn = layers_storage::redis_cache::connect(&redis_url)
            .await
            .context("connecting to redis")?;
        let limit: u64 = parse_env("LAYERS_RATE_LIMIT", 120);
        let window_secs: u64 = parse_env("LAYERS_RATE_WINDOW_S", 60);
        let limiter = layers_storage::SlidingWindow::new(
            conn.clone(),
            limit,
            std::time::Duration::from_secs(window_secs),
        );
        tracing::info!(limit, window_secs, "rate limiter configured");
        state_builder = state_builder.rate_limiter(limiter).redis(conn);
    }

    let state = state_builder.build();
    let app = build_router(state);

    let listener = tokio::net::TcpListener::bind(&bind)
        .await
        .with_context(|| format!("binding {bind}"))?;
    tracing::info!(bind = %bind, "layers-orchestrator listening");
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await
    .context("axum serve loop")?;

    tracing::info!("layers-orchestrator stopped");
    Ok(())
}

async fn shutdown_signal() {
    let mut sigterm = signal(SignalKind::terminate()).expect("install SIGTERM handler");
    let mut sigint = signal(SignalKind::interrupt()).expect("install SIGINT handler");
    tokio::select! {
        _ = sigterm.recv() => tracing::info!("received SIGTERM, draining"),
        _ = sigint.recv()  => tracing::info!("received SIGINT, draining"),
    }
}

fn parse_env<T: std::str::FromStr>(key: &str, default: T) -> T {
    std::env::var(key)
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(default)
}

fn parse_bool_env(key: &str, default: bool) -> bool {
    match std::env::var(key) {
        Ok(s) => matches!(s.to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"),
        Err(_) => default,
    }
}

fn init_tracing() {
    let filter = std::env::var("LAYERS_LOG")
        .unwrap_or_else(|_| "layers_orchestrator=info,axum=info,tower_http=info".to_owned());
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::new(filter))
        .json()
        .init();
}
