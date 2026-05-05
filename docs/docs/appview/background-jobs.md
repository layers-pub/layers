---
sidebar_label: Background Jobs
sidebar_position: 9
---

# Background Jobs

The Rust appview keeps the firehose path on a single tokio runtime
without a separate job queue. Two long-running tasks are worth naming:

## Reconnect supervisor

`ReconnectingEventStream::with_cursor` wraps the Jetstream connection
in an exponential-backoff loop. On WebSocket disconnect the supervisor
sleeps `BackoffPolicy::default()`, requests a new connection from the
factory closure (passing the most recent committed cursor), and
resumes. The `drive_indexer` loop sees the gap as a normal
`next_event` call.

## Observer

`layers-observer` runs aggregate methods on a schedule. The shipped
method `annotation_coverage` is pure (it takes input slices and
returns an `ObservationReport`) so the schedule lives in the binary's
main loop rather than a queue. A deployment that needs more methods
adds them under `crates/layers-observer/src/methods.rs` and registers
them in `observer-spec/methods.json`.

There is no separate worker tier and no DLQ. If a record requires
expensive enrichment downstream, the operator runs a second
`RecordSink` impl that performs the work in-handler or hands the
record off to an external service the operator owns.
