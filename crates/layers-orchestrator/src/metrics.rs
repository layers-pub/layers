//! Prometheus metrics surface for the orchestrator.
//!
//! Exposes a [`PrometheusHandle`] the `/metrics` route renders, plus a
//! pair of axum middleware fns (`record_request`) that emit per-route
//! counters and latency histograms via the `metrics` facade.
//!
//! Counter and histogram naming follows the Prometheus + OpenMetrics
//! conventions: `layers_<subsystem>_<unit>` for counters,
//! `layers_<subsystem>_<unit>_seconds` for histograms.

use std::time::Instant;

use axum::extract::{MatchedPath, Request};
use axum::middleware::Next;
use axum::response::Response;
use metrics::{counter, histogram};
use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};

/// Metric name for the per-route request counter.
pub const REQUEST_TOTAL: &str = "layers_orchestrator_requests_total";

/// Metric name for the per-route request latency histogram.
pub const REQUEST_LATENCY: &str = "layers_orchestrator_request_duration_seconds";

/// Build a Prometheus exporter and return its rendering handle.
///
/// Latency histograms use Prometheus' default exponential buckets,
/// capped to 10s — anything slower than that is a hung request and
/// shows up in the `+Inf` bucket.
///
/// # Errors
/// Returns the exporter's underlying error when the recorder cannot
/// be installed (e.g. when one was already installed in the process).
pub fn install_recorder() -> Result<PrometheusHandle, metrics_exporter_prometheus::BuildError> {
    PrometheusBuilder::new()
        .set_buckets_for_metric(
            metrics_exporter_prometheus::Matcher::Suffix("_seconds".into()),
            &[
                0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
            ],
        )?
        .install_recorder()
}

/// axum middleware that records a per-route request counter and
/// latency histogram. Tags every metric with the matched route
/// (e.g. `/xrpc/pub.layers.corpus.getCorpus`) and the response status.
pub async fn record_request(req: Request, next: Next) -> Response {
    let route = req
        .extensions()
        .get::<MatchedPath>()
        .map_or_else(|| "<unknown>".to_owned(), |m| m.as_str().to_owned());
    let method = req.method().clone();
    let started = Instant::now();
    let response = next.run(req).await;
    let elapsed = started.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();
    counter!(
        REQUEST_TOTAL,
        "route" => route.clone(),
        "method" => method.to_string(),
        "status" => status.clone(),
    )
    .increment(1);
    histogram!(
        REQUEST_LATENCY,
        "route" => route,
        "method" => method.to_string(),
        "status" => status,
    )
    .record(elapsed);
    response
}
