//! Observation method implementations.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// One run of an observation method, ready to be wrapped in a
/// `dev.idiolect.observation` record and published to a PDS.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ObservationReport {
    /// `name` of the method that produced this report. Mirrors the
    /// `name` field in `observer-spec/methods.json`.
    pub method: String,
    /// Optional scope this report covers (e.g. corpus AT-URI).
    pub scope: Option<String>,
    /// Method-specific structured payload.
    pub payload: serde_json::Value,
}

/// AT-URI of an `pub.layers.corpus.membership` record's parent corpus,
/// paired with the AT-URI of an expression in that corpus.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CorpusMember {
    /// `pub.layers.corpus.corpus` AT-URI.
    pub corpus: String,
    /// `pub.layers.expression.expression` AT-URI.
    pub expression: String,
}

/// Annotation coverage method.
///
/// Given:
///
/// - `members`: every `pub.layers.corpus.membership` for the corpus.
/// - `annotated_targets`: every `target` AT-URI seen on a
///   `pub.layers.annotation.annotationLayer` record.
///
/// Returns the fraction of corpus members whose expression URI is the
/// `target` of at least one annotation layer, plus the absolute counts.
///
/// Returning the inputs as iterables (rather than database handles)
/// keeps the method storage-agnostic and unit-testable. The orchestrator
/// is responsible for the SQL that produces the two iterables.
#[must_use]
#[allow(
    clippy::implicit_hasher,
    reason = "called only with the default hasher"
)]
pub fn annotation_coverage(
    corpus_uri: &str,
    members: &[CorpusMember],
    annotated_targets: &HashSet<String>,
) -> ObservationReport {
    let total = members.iter().filter(|m| m.corpus == corpus_uri).count();
    let covered = members
        .iter()
        .filter(|m| m.corpus == corpus_uri && annotated_targets.contains(&m.expression))
        .count();
    let coverage = if total == 0 {
        0.0
    } else {
        covered as f64 / total as f64
    };

    ObservationReport {
        method: "annotation_coverage".to_owned(),
        scope: Some(corpus_uri.to_owned()),
        payload: serde_json::json!({
            "total_members": total,
            "covered_members": covered,
            "coverage": coverage,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn member(corpus: &str, expression: &str) -> CorpusMember {
        CorpusMember {
            corpus: corpus.to_owned(),
            expression: expression.to_owned(),
        }
    }

    #[test]
    fn full_coverage() {
        let members = vec![
            member("at://c", "at://e1"),
            member("at://c", "at://e2"),
            member("at://c", "at://e3"),
        ];
        let annotated: HashSet<String> = ["at://e1", "at://e2", "at://e3"]
            .iter()
            .map(|s| (*s).to_owned())
            .collect();
        let r = annotation_coverage("at://c", &members, &annotated);
        assert_eq!(r.payload["total_members"], 3);
        assert_eq!(r.payload["covered_members"], 3);
        assert_eq!(r.payload["coverage"], 1.0);
    }

    #[test]
    fn partial_coverage() {
        let members = vec![
            member("at://c", "at://e1"),
            member("at://c", "at://e2"),
            member("at://c", "at://e3"),
            member("at://c", "at://e4"),
        ];
        let annotated: HashSet<String> = ["at://e1", "at://e3"]
            .iter()
            .map(|s| (*s).to_owned())
            .collect();
        let r = annotation_coverage("at://c", &members, &annotated);
        assert_eq!(r.payload["total_members"], 4);
        assert_eq!(r.payload["covered_members"], 2);
        assert_eq!(r.payload["coverage"], 0.5);
    }

    #[test]
    fn ignores_other_corpora() {
        let members = vec![member("at://c", "at://e1"), member("at://other", "at://e2")];
        let annotated: HashSet<String> = ["at://e1", "at://e2"]
            .iter()
            .map(|s| (*s).to_owned())
            .collect();
        let r = annotation_coverage("at://c", &members, &annotated);
        assert_eq!(r.payload["total_members"], 1);
        assert_eq!(r.payload["covered_members"], 1);
    }

    #[test]
    fn empty_corpus_yields_zero_coverage() {
        let members = vec![];
        let annotated: HashSet<String> = HashSet::new();
        let r = annotation_coverage("at://c", &members, &annotated);
        assert_eq!(r.payload["coverage"], 0.0);
        assert_eq!(r.payload["total_members"], 0);
    }
}
