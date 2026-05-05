//! Data sources the scheduler hands to observation methods.
//!
//! A `ReportSource` produces every report the scheduler should publish
//! on a single tick. The Postgres source pulls every corpus and runs
//! `annotation_coverage` for each. Future sources plug into the same
//! trait, so the scheduler stays method-agnostic.

use std::collections::HashSet;

use sqlx::{PgPool, Row};

use crate::methods::{CorpusMember, ObservationReport, annotation_coverage};

/// Trait the scheduler consumes.
#[async_trait::async_trait]
pub trait ReportSource: Send + Sync {
    /// Produce every report this source emits on a single scheduler
    /// tick. Returning an empty Vec is fine; returning an error
    /// causes the scheduler to log and skip this tick.
    async fn collect(&self) -> Result<Vec<ObservationReport>, sqlx::Error>;
}

/// Postgres-backed source that runs the shipped methods over every
/// corpus in the indexed set.
#[derive(Debug, Clone)]
pub struct PostgresSource {
    pool: PgPool,
}

impl PostgresSource {
    /// Wrap an existing pool.
    #[must_use]
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait::async_trait]
impl ReportSource for PostgresSource {
    async fn collect(&self) -> Result<Vec<ObservationReport>, sqlx::Error> {
        let corpus_rows = sqlx::query("SELECT uri FROM corpora ORDER BY uri")
            .fetch_all(&self.pool)
            .await?;
        if corpus_rows.is_empty() {
            return Ok(Vec::new());
        }

        let memberships = sqlx::query(
            "SELECT
                 record->>'corpus'     AS corpus_uri,
                 record->>'expression' AS expression_uri
             FROM corpus_memberships
             WHERE record->>'corpus' IS NOT NULL
               AND record->>'expression' IS NOT NULL",
        )
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .filter_map(|row| {
            let corpus: Option<String> = row.try_get("corpus_uri").ok();
            let expression: Option<String> = row.try_get("expression_uri").ok();
            match (corpus, expression) {
                (Some(c), Some(e)) => Some(CorpusMember { corpus: c, expression: e }),
                _ => None,
            }
        })
        .collect::<Vec<_>>();

        let annotated_targets: HashSet<String> = sqlx::query(
            "SELECT record->>'target' AS target
             FROM annotation_layers
             WHERE record->>'target' IS NOT NULL",
        )
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .filter_map(|row| row.try_get::<Option<String>, _>("target").ok().flatten())
        .collect();

        let mut reports = Vec::with_capacity(corpus_rows.len());
        for row in corpus_rows {
            let corpus_uri: String = row.try_get("uri")?;
            reports.push(annotation_coverage(
                &corpus_uri,
                &memberships,
                &annotated_targets,
            ));
        }
        Ok(reports)
    }
}
