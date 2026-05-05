---
sidebar_label: Observability
sidebar_position: 10
---

# Observability

The Rust crates emit structured tracing through the `tracing` crate
and a JSON `tracing-subscriber` formatter. Both binaries pick their
filter from the `LAYERS_LOG` environment variable (defaults:
`layers_indexer=info,idiolect_indexer=info` for the indexer,
`layers_orchestrator=info,axum=info` for the orchestrator).

## Trace fields

Each binary attaches a stable set of fields to its top-level span:

- `subscription` (indexer): cursor key.
- `jetstream` (indexer): subscribe URL.
- `bind` (orchestrator): listen address.
- `sinks` (indexer): number of configured `RecordSink` backends.

Per-event fields surface the `seq` and `did` of the firehose commit
being processed, so a downstream span filter can correlate handler
errors with the specific record that triggered them.

## OpenTelemetry

The crates support optional OpenTelemetry export via
`tracing-opentelemetry` + `opentelemetry-otlp`. Enable in a binary by
swapping `tracing_subscriber::fmt()` for the OTLP layer; the
defaults emit JSON to stdout for log collectors to scrape.

## Metrics

`/metrics` is served by the orchestrator on port 8080 by default.
Counters are exposed in Prometheus exposition format.

## Observation methods

`layers-observer` runs aggregate methods declared in
`observer-spec/methods.json` and publishes the results as
`dev.idiolect.observation` records to a configured PDS. The shipped
method `annotation_coverage` reports the fraction of corpus members
that have at least one annotation layer targeting them; new methods
plug in as `fn(...) -> ObservationReport` implementations under
`crates/layers-observer/src/methods.rs`.
