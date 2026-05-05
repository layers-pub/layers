//! Scheduler unit tests against in-memory source + publisher.

use std::sync::Arc;
use std::sync::Mutex;
use std::time::Duration;

use layers_observer::{
    methods::ObservationReport, publisher::{PublishError, Publisher}, scheduler::{run, Scheduler, SchedulerConfig},
    sources::ReportSource,
};
use tokio::sync::oneshot;

#[derive(Default)]
struct FakeSource {
    pub batches: Mutex<Vec<Vec<ObservationReport>>>,
}

#[async_trait::async_trait]
impl ReportSource for FakeSource {
    async fn collect(&self) -> Result<Vec<ObservationReport>, sqlx::Error> {
        let mut guard = self.batches.lock().unwrap();
        if guard.is_empty() {
            Ok(Vec::new())
        } else {
            Ok(guard.remove(0))
        }
    }
}

#[derive(Default)]
struct CapturingPublisher {
    pub published: Mutex<Vec<ObservationReport>>,
}

#[async_trait::async_trait]
impl Publisher for CapturingPublisher {
    async fn publish(&self, report: &ObservationReport) -> Result<(), PublishError> {
        self.published.lock().unwrap().push(report.clone());
        Ok(())
    }
}

fn report(method: &str, scope: &str, payload: serde_json::Value) -> ObservationReport {
    ObservationReport {
        method: method.into(),
        scope: Some(scope.into()),
        payload,
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn scheduler_publishes_each_batch_until_shutdown() {
    let source = Arc::new(FakeSource::default());
    *source.batches.lock().unwrap() = vec![
        vec![
            report("annotation_coverage", "at://a/c/1", serde_json::json!({"covered": 1})),
            report("annotation_coverage", "at://a/c/2", serde_json::json!({"covered": 0})),
        ],
        vec![
            report("annotation_coverage", "at://a/c/1", serde_json::json!({"covered": 2})),
        ],
    ];

    let publisher = Arc::new(CapturingPublisher::default());

    let scheduler = Scheduler {
        source: source.clone(),
        publisher: publisher.clone(),
        config: SchedulerConfig {
            interval: Duration::from_millis(20),
        },
    };

    let (tx, rx) = oneshot::channel::<()>();
    let scheduler_handle = tokio::spawn(async move {
        run(scheduler, Box::pin(async move { let _ = rx.await; })).await
    });

    // Wait long enough for both batches to be drained.
    tokio::time::sleep(Duration::from_millis(150)).await;
    let _ = tx.send(());
    let total = scheduler_handle.await.unwrap();

    let captured = publisher.published.lock().unwrap();
    assert_eq!(captured.len(), 3, "expected 3 reports, got {captured:?}");
    assert_eq!(total, 3);
}

#[derive(Default)]
struct FailingPublisher {
    pub attempts: Mutex<u64>,
}

#[async_trait::async_trait]
impl Publisher for FailingPublisher {
    async fn publish(&self, _: &ObservationReport) -> Result<(), PublishError> {
        *self.attempts.lock().unwrap() += 1;
        Err(PublishError::Remote("nope".into()))
    }
}

#[derive(Default)]
struct FailingSource {
    pub attempts: Mutex<u64>,
}

#[async_trait::async_trait]
impl ReportSource for FailingSource {
    async fn collect(&self) -> Result<Vec<ObservationReport>, sqlx::Error> {
        *self.attempts.lock().unwrap() += 1;
        Err(sqlx::Error::Configuration("induced".into()))
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn scheduler_skips_tick_when_source_errors() {
    let source = Arc::new(FailingSource::default());
    let publisher = Arc::new(CapturingPublisher::default());

    let scheduler = Scheduler {
        source: source.clone(),
        publisher: publisher.clone(),
        config: SchedulerConfig {
            interval: Duration::from_millis(20),
        },
    };

    let (tx, rx) = oneshot::channel::<()>();
    let handle = tokio::spawn(async move {
        run(scheduler, Box::pin(async move {
            let _ = rx.await;
        }))
        .await
    });
    tokio::time::sleep(Duration::from_millis(120)).await;
    let _ = tx.send(());
    let total = handle.await.unwrap();

    let attempts = *source.attempts.lock().unwrap();
    assert!(
        attempts >= 2,
        "scheduler should keep ticking despite source errors; saw {attempts}"
    );
    let captured = publisher.published.lock().unwrap();
    assert!(captured.is_empty(), "no reports should reach the publisher");
    assert_eq!(total, 0);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn scheduler_swallows_publish_errors_and_keeps_running() {
    let source = Arc::new(FakeSource::default());
    *source.batches.lock().unwrap() = vec![
        vec![report("annotation_coverage", "at://a/c/1", serde_json::json!({}))],
        vec![report("annotation_coverage", "at://a/c/2", serde_json::json!({}))],
    ];
    let publisher = Arc::new(FailingPublisher::default());

    let scheduler = Scheduler {
        source: source.clone(),
        publisher: publisher.clone(),
        config: SchedulerConfig {
            interval: Duration::from_millis(20),
        },
    };

    let (tx, rx) = oneshot::channel::<()>();
    let handle = tokio::spawn(async move {
        run(scheduler, Box::pin(async move { let _ = rx.await; })).await
    });
    tokio::time::sleep(Duration::from_millis(150)).await;
    let _ = tx.send(());
    let total = handle.await.unwrap();

    let attempts = *publisher.attempts.lock().unwrap();
    assert!(attempts >= 2, "publisher should have been called for each report; saw {attempts}");
    assert_eq!(total, 0, "no successful publishes when publisher always errors");
}
