//! Test-fixture corpus a verification runner consumes.
//!
//! A corpus is an ordered list of `(label, value)` records. The label
//! identifies the fixture in error messages and verification record
//! counterexamples; the value is the JSON the runner feeds through the
//! lens. Corpora are typically built from
//! `pub.layers.corpus.corpus` records via the orchestrator's catalog,
//! but the type makes no assumption about provenance so handcrafted
//! fixtures (e.g. round-trip regression tests) work too.

use serde_json::Value;

/// One fixture with a stable identifier.
#[derive(Debug, Clone)]
pub struct Fixture {
    /// Human-readable label, surfaced in error messages and the
    /// `counterexample` field of the published verification record.
    pub label: String,
    /// Record body the lens runs against.
    pub value: Value,
}

/// Ordered collection of fixtures.
#[derive(Debug, Clone, Default)]
pub struct Corpus {
    fixtures: Vec<Fixture>,
}

impl Corpus {
    /// Empty corpus.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Append a fixture.
    pub fn push(&mut self, label: impl Into<String>, value: Value) {
        self.fixtures.push(Fixture {
            label: label.into(),
            value,
        });
    }

    /// Borrow the fixtures in order.
    #[must_use]
    pub fn fixtures(&self) -> &[Fixture] {
        &self.fixtures
    }

    /// Number of fixtures.
    #[must_use]
    pub fn len(&self) -> usize {
        self.fixtures.len()
    }

    /// True when the corpus is empty.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.fixtures.is_empty()
    }
}
