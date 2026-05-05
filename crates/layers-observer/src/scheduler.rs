//! Fixed-interval scheduler that drives a [`ReportSource`] through a
//! [`Publisher`] until shutdown.
//!
//! Operators construct a `Scheduler`, hand it the source + publisher
//! + cadence, and call [`run`] to drive it until the supplied
//! shutdown future resolves. Each tick:
//!
//! 1. Calls `source.collect()` to gather every report this tick.
//! 2. Publishes each report; logs and continues on individual errors.
//! 3. Sleeps until the next tick or the shutdown future resolves,
//!    whichever is first.

use std::sync::Arc;
use std::time::Duration;

use crate::publisher::Publisher;
use crate::sources::ReportSource;

/// Configuration for a [`Scheduler`].
#[derive(Debug, Clone)]
pub struct SchedulerConfig {
    /// How often to poll the source.
    pub interval: Duration,
}

impl Default for SchedulerConfig {
    fn default() -> Self {
        Self {
            interval: Duration::from_secs(300),
        }
    }
}

/// Owning value that bundles a source, a publisher, and a config.
pub struct Scheduler {
    /// Source the scheduler polls each tick.
    pub source: Arc<dyn ReportSource>,
    /// Publisher each produced report flows through.
    pub publisher: Arc<dyn Publisher>,
    /// Cadence + tunables.
    pub config: SchedulerConfig,
}

/// Run the scheduler until `shutdown` resolves. Returns the count of
/// successfully-published reports across the whole run.
pub async fn run(
    scheduler: Scheduler,
    mut shutdown: impl std::future::Future<Output = ()> + Unpin,
) -> u64 {
    let mut total: u64 = 0;
    let mut interval = tokio::time::interval(scheduler.config.interval);
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    loop {
        tokio::select! {
            _ = &mut shutdown => {
                tracing::info!(total, "scheduler shutting down");
                return total;
            }
            _ = interval.tick() => {
                let collected = match scheduler.source.collect().await {
                    Ok(reports) => reports,
                    Err(e) => {
                        tracing::warn!(error = %e, "source.collect failed; skipping tick");
                        continue;
                    }
                };
                tracing::info!(count = collected.len(), "scheduler tick: publishing reports");
                for report in &collected {
                    match scheduler.publisher.publish(report).await {
                        Ok(()) => total += 1,
                        Err(e) => tracing::warn!(error = %e, method = %report.method, "publish failed"),
                    }
                }
            }
        }
    }
}
