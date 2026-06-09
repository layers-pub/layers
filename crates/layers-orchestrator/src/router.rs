//! axum router assembly.
//!
//! Mounts the XRPC route table from [`crate::generated_routes`] under
//! `/xrpc/<nsid>` and adds operational endpoints (`/healthz`,
//! `/readyz`, `/metrics`) at the router root. The middleware stack
//! attaches a request id, structured tracing, CORS, and Prometheus
//! request metrics.

use std::time::Duration;

use axum::Router;
use axum::extract::State;
use axum::http::{HeaderName, StatusCode};
use axum::middleware;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use tower_http::cors::CorsLayer;
use tower_http::request_id::{
    MakeRequestId, PropagateRequestIdLayer, RequestId, SetRequestIdLayer,
};
use tower_http::trace::{DefaultMakeSpan, DefaultOnFailure, DefaultOnResponse, TraceLayer};
use tracing::Level;

use crate::generated_routes;
use crate::metrics::record_request;
use crate::rate_limit::enforce as enforce_rate_limit;
use crate::state::AppState;

const REQUEST_ID_HEADER: HeaderName = HeaderName::from_static("x-request-id");

/// Build the orchestrator's full axum router.
pub fn build_router(state: AppState) -> Router {
    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
        .on_response(
            DefaultOnResponse::new()
                .level(Level::INFO)
                .latency_unit(tower_http::LatencyUnit::Millis),
        )
        .on_failure(DefaultOnFailure::new().level(Level::WARN));

    let xrpc = generated_routes::xrpc_routes(state.clone()).layer(middleware::from_fn_with_state(
        state.clone(),
        enforce_rate_limit,
    ));

    Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        .route("/metrics", get(metrics))
        .route(
            "/oauth/client-metadata.json",
            get(crate::oauth::client_metadata),
        )
        .route(
            "/xrpc/pub.layers.integration.getExternal",
            get(crate::import::get_external),
        )
        .route(
            "/xrpc/pub.layers.integration.applyLens",
            get(crate::lens::apply_lens_route),
        )
        .merge(xrpc)
        .layer(middleware::from_fn(record_request))
        // Inner layer runs after SetRequestId on inbound and writes the
        // captured id onto the response on outbound, so PropagateRequestId
        // must wrap *inside* SetRequestId to see the freshly-generated id.
        .layer(PropagateRequestIdLayer::new(REQUEST_ID_HEADER.clone()))
        .layer(SetRequestIdLayer::new(REQUEST_ID_HEADER.clone(), MakeUuid))
        .layer(trace_layer)
        .layer(cors_layer())
        .with_state(state)
}

#[derive(Clone, Copy)]
struct MakeUuid;

impl MakeRequestId for MakeUuid {
    fn make_request_id<B>(&mut self, _: &axum::http::Request<B>) -> Option<RequestId> {
        let id = uuid::Uuid::new_v4().to_string();
        id.parse().ok().map(RequestId::new)
    }
}

fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_methods([axum::http::Method::GET, axum::http::Method::OPTIONS])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
        ])
        .allow_origin(tower_http::cors::Any)
        .max_age(Duration::from_hours(24))
}

async fn healthz() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

async fn readyz(State(state): State<AppState>) -> Response {
    if !state.is_ready() {
        return (StatusCode::SERVICE_UNAVAILABLE, "warming").into_response();
    }
    let pg_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(state.pool())
        .await
        .is_ok();
    let redis_ok = if let Some(mut conn) = state.redis() {
        redis::cmd("PING")
            .query_async::<()>(&mut conn)
            .await
            .is_ok()
    } else {
        true
    };

    let body = serde_json::json!({
        "ready": pg_ok && redis_ok,
        "pg": pg_ok,
        "redis": redis_ok,
    });
    if pg_ok && redis_ok {
        (StatusCode::OK, axum::Json(body)).into_response()
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, axum::Json(body)).into_response()
    }
}

async fn metrics(State(state): State<AppState>) -> impl IntoResponse {
    if let Some(handle) = state.metrics() {
        (
            StatusCode::OK,
            [(
                axum::http::header::CONTENT_TYPE,
                "text/plain; version=0.0.4",
            )],
            handle.render(),
        )
            .into_response()
    } else {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            "metrics recorder not installed",
        )
            .into_response()
    }
}

/// Re-exported metric names so external dashboards / alerts can pin
/// to a stable identifier.
pub use crate::metrics::{REQUEST_LATENCY, REQUEST_TOTAL};
