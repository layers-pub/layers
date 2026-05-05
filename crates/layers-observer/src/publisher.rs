//! Publish observation reports to a destination.
//!
//! [`Publisher`] is the trait the scheduler calls on each report.
//! [`NdjsonPublisher`] writes each report as a single JSON line to a
//! file-like sink (stdout, a log file, or a process pipe), suitable
//! for forwarding into the operator's PDS by an external sidecar.
//! Operators that want direct PDS publication ship their own
//! `Publisher` impl that calls
//! `com.atproto.repo.createRecord` against their service-auth-signed
//! HTTP client.

use std::io::Write;
use std::sync::Mutex;
use std::time::SystemTime;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use time::format_description::well_known::Rfc3339;

use crate::methods::ObservationReport;

/// Errors a [`Publisher`] can raise.
#[derive(Debug, Error)]
pub enum PublishError {
    /// The underlying writer returned an I/O error.
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    /// Serialising the report failed.
    #[error("serialize: {0}")]
    Serialize(#[from] serde_json::Error),
    /// Publishing to a remote endpoint failed.
    #[error("remote: {0}")]
    Remote(String),
}

/// Trait the scheduler calls on each produced report.
#[async_trait::async_trait]
pub trait Publisher: Send + Sync {
    /// Persist or forward a report.
    async fn publish(&self, report: &ObservationReport) -> Result<(), PublishError>;
}

/// Wire shape written to disk by [`NdjsonPublisher`]: the report plus
/// its emission timestamp in RFC 3339, one record per line.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordedReport {
    /// Emission timestamp.
    pub recorded_at: String,
    /// Report payload.
    pub report: ObservationReport,
}

/// File-backed publisher that appends one JSON line per report.
pub struct NdjsonPublisher {
    writer: Mutex<Box<dyn Write + Send>>,
}

impl std::fmt::Debug for NdjsonPublisher {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("NdjsonPublisher").finish()
    }
}

impl NdjsonPublisher {
    /// Wrap an arbitrary writer. Common choices: a `std::fs::File`
    /// opened with `OpenOptions::new().append(true).create(true)`, or
    /// `io::stdout()`.
    #[must_use]
    pub fn new(writer: Box<dyn Write + Send>) -> Self {
        Self {
            writer: Mutex::new(writer),
        }
    }
}

#[async_trait::async_trait]
impl Publisher for NdjsonPublisher {
    async fn publish(&self, report: &ObservationReport) -> Result<(), PublishError> {
        let recorded_at = time::OffsetDateTime::from(SystemTime::now())
            .format(&Rfc3339)
            .map_err(|e| PublishError::Remote(format!("rfc3339: {e}")))?;
        let line = serde_json::to_string(&RecordedReport {
            recorded_at,
            report: report.clone(),
        })?;
        let mut guard = self.writer.lock().expect("ndjson writer poisoned");
        guard.write_all(line.as_bytes())?;
        guard.write_all(b"\n")?;
        guard.flush()?;
        Ok(())
    }
}
