//! Round-trip verification runner.
//!
//! For each fixture in a corpus, the runner calls `lens.get` and
//! `lens.put` and asserts the resulting value equals the input. The
//! lens is supplied as a generic [`Lens`] implementation so this crate
//! does not bind to a specific panproto runtime — wire either
//! `idiolect_lens` or a tree-sitter-driven applier here.
//!
//! On failure the runner returns the first failing fixture's label and
//! the divergence between input and round-trip output. That payload
//! becomes the `counterexample` field on the published
//! `dev.idiolect.verification` record.

use serde_json::Value;
use thiserror::Error;

use crate::corpus::{Corpus, Fixture};

/// Trait the round-trip runner consumes.
///
/// Mirrors `panproto_lens::Lens` minus the schema-typed wrapping. A
/// concrete impl can sit on top of `idiolect_lens::ResolvedLens` or a
/// hand-rolled applier for testing.
#[async_trait::async_trait]
pub trait Lens: Send + Sync {
    /// Forward direction: `get(source) -> target`.
    ///
    /// # Errors
    /// Returns the lens applier's underlying error message.
    async fn get(&self, source: &Value) -> Result<Value, String>;

    /// Backward direction: `put(target) -> source`.
    ///
    /// # Errors
    /// Returns the lens applier's underlying error message.
    async fn put(&self, target: &Value) -> Result<Value, String>;
}

/// Outcome of a round-trip run over a corpus.
#[derive(Debug, Clone)]
pub enum RoundtripOutcome {
    /// Every fixture round-tripped exactly.
    Pass {
        /// Number of fixtures the runner saw.
        sampled: usize,
    },
    /// At least one fixture failed.
    Fail {
        /// Label of the first failing fixture.
        counterexample_label: String,
        /// Original input.
        input: Value,
        /// Round-tripped output (`put(get(x))`).
        roundtrip: Value,
        /// Error reported by `get` or `put`, if any.
        error: Option<String>,
        /// Total fixtures sampled before the failure (1-indexed).
        sampled: usize,
    },
}

/// Errors raised by [`RoundtripRunner::run`] outside of fixture failure.
#[derive(Debug, Error)]
pub enum RunError {
    /// Caller passed an empty corpus. Refusing to publish a vacuously
    /// passing verification record.
    #[error("corpus is empty: refusing to publish a vacuously passing verification")]
    EmptyCorpus,
}

/// Round-trip runner.
#[derive(Debug, Default)]
pub struct RoundtripRunner;

impl RoundtripRunner {
    /// Run the lens over every fixture and return the outcome.
    ///
    /// # Errors
    /// Returns [`RunError::EmptyCorpus`] if the corpus has no fixtures.
    pub async fn run<L: Lens + ?Sized>(
        &self,
        lens: &L,
        corpus: &Corpus,
    ) -> Result<RoundtripOutcome, RunError> {
        if corpus.is_empty() {
            return Err(RunError::EmptyCorpus);
        }
        for (idx, Fixture { label, value }) in corpus.fixtures().iter().enumerate() {
            let mid = match lens.get(value).await {
                Ok(v) => v,
                Err(e) => {
                    return Ok(RoundtripOutcome::Fail {
                        counterexample_label: label.clone(),
                        input: value.clone(),
                        roundtrip: Value::Null,
                        error: Some(format!("get: {e}")),
                        sampled: idx + 1,
                    });
                }
            };
            let back = match lens.put(&mid).await {
                Ok(v) => v,
                Err(e) => {
                    return Ok(RoundtripOutcome::Fail {
                        counterexample_label: label.clone(),
                        input: value.clone(),
                        roundtrip: Value::Null,
                        error: Some(format!("put: {e}")),
                        sampled: idx + 1,
                    });
                }
            };
            if back != *value {
                return Ok(RoundtripOutcome::Fail {
                    counterexample_label: label.clone(),
                    input: value.clone(),
                    roundtrip: back,
                    error: None,
                    sampled: idx + 1,
                });
            }
        }
        Ok(RoundtripOutcome::Pass {
            sampled: corpus.len(),
        })
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    struct IdentityLens;

    #[async_trait::async_trait]
    impl Lens for IdentityLens {
        async fn get(&self, source: &Value) -> Result<Value, String> {
            Ok(source.clone())
        }
        async fn put(&self, target: &Value) -> Result<Value, String> {
            Ok(target.clone())
        }
    }

    /// `get` adds a field, `put` strips it: classic add/drop lens that
    /// round-trips exactly.
    struct AddDropLens;

    #[async_trait::async_trait]
    impl Lens for AddDropLens {
        async fn get(&self, source: &Value) -> Result<Value, String> {
            let mut v = source.clone();
            if let Some(o) = v.as_object_mut() {
                o.insert("derived".into(), Value::Bool(true));
            }
            Ok(v)
        }
        async fn put(&self, target: &Value) -> Result<Value, String> {
            let mut v = target.clone();
            if let Some(o) = v.as_object_mut() {
                o.remove("derived");
            }
            Ok(v)
        }
    }

    /// `get` drops a field; `put` cannot recover it. Round-trip fails.
    struct LossyLens;

    #[async_trait::async_trait]
    impl Lens for LossyLens {
        async fn get(&self, source: &Value) -> Result<Value, String> {
            let mut v = source.clone();
            if let Some(o) = v.as_object_mut() {
                o.remove("language");
            }
            Ok(v)
        }
        async fn put(&self, target: &Value) -> Result<Value, String> {
            Ok(target.clone())
        }
    }

    fn three_corpora() -> Corpus {
        let mut c = Corpus::new();
        c.push("a", json!({"name": "A", "language": "eng"}));
        c.push("b", json!({"name": "B", "language": "fra"}));
        c.push("c", json!({"name": "C"}));
        c
    }

    #[tokio::test]
    async fn identity_lens_passes() {
        let outcome = RoundtripRunner
            .run(&IdentityLens, &three_corpora())
            .await
            .unwrap();
        assert!(matches!(outcome, RoundtripOutcome::Pass { sampled: 3 }));
    }

    #[tokio::test]
    async fn add_drop_lens_passes() {
        let outcome = RoundtripRunner
            .run(&AddDropLens, &three_corpora())
            .await
            .unwrap();
        assert!(matches!(outcome, RoundtripOutcome::Pass { sampled: 3 }));
    }

    #[tokio::test]
    async fn lossy_lens_reports_first_counterexample() {
        let outcome = RoundtripRunner
            .run(&LossyLens, &three_corpora())
            .await
            .unwrap();
        match outcome {
            RoundtripOutcome::Fail {
                counterexample_label,
                sampled,
                ..
            } => {
                assert_eq!(counterexample_label, "a");
                assert_eq!(sampled, 1);
            }
            RoundtripOutcome::Pass { .. } => panic!("expected Fail, got Pass"),
        }
    }

    #[tokio::test]
    async fn empty_corpus_is_an_error() {
        let err = RoundtripRunner
            .run(&IdentityLens, &Corpus::new())
            .await
            .unwrap_err();
        assert!(matches!(err, RunError::EmptyCorpus));
    }
}
