//! Observation methods + scheduler for the Layers appview.
//!
//! Each method folds firehose-derived state into a structured aggregate
//! that the operator publishes to their PDS as a
//! `dev.idiolect.observation` record. Methods are registered in
//! `observer-spec/methods.json` and exposed here as plain functions
//! returning an [`ObservationReport`]. The [`scheduler`] module runs
//! them on a fixed cadence; the [`publisher`] module emits the
//! resulting reports to a configured destination (a PDS HTTP endpoint
//! or a local JSON-lines sink).

#![cfg_attr(docsrs, feature(doc_cfg))]

pub mod methods;
pub mod publisher;
pub mod scheduler;
pub mod sources;

pub use methods::{ObservationReport, annotation_coverage};
pub use publisher::{NdjsonPublisher, Publisher, RecordedReport};
pub use scheduler::{Scheduler, SchedulerConfig, run};
pub use sources::{PostgresSource, ReportSource};
