//! Scope model: parse and represent the `ATProto` granular scopes a request carries.
//!
//! The scope strings Layers recognises are a subset of the `ATProto` permission
//! grammar:
//!
//! - `include:pub.layers.authReadOnly` — expands to the rpc/lxm list declared
//!   in the referenced permission-set lexicon.
//! - `repo:pub.layers.<collection>` — allows write (create/update/delete) on
//!   records of that collection.
//! - `rpc:<lxm>` — allows calling the named XRPC method.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// A parsed scope token.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "value", rename_all = "kebab-case")]
pub enum Scope {
    /// Reference to a permission-set lexicon. Resolved to a [`ScopeSet`] at verification time.
    Include(String),
    /// Write access to a single collection NSID.
    Repo(String),
    /// Right to call a single XRPC method (lxm).
    Rpc(String),
}

/// Errors parsing a scope string.
#[derive(Debug, Error)]
pub enum ParseError {
    /// Scope string did not use one of the recognised `<prefix>:<value>` shapes.
    #[error("unrecognised scope: {0}")]
    Unrecognised(String),
}

impl Scope {
    /// Parse a single scope token (no whitespace).
    pub fn parse(s: &str) -> Result<Self, ParseError> {
        let (prefix, value) = s
            .split_once(':')
            .ok_or_else(|| ParseError::Unrecognised(s.to_owned()))?;
        Ok(match prefix {
            "include" => Self::Include(value.to_owned()),
            "repo" => Self::Repo(value.to_owned()),
            "rpc" => Self::Rpc(value.to_owned()),
            _ => return Err(ParseError::Unrecognised(s.to_owned())),
        })
    }
}

/// A resolved bundle of scopes granted to a principal on this request.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ScopeSet {
    /// Collections the principal may write to.
    pub repos: Vec<String>,
    /// Lxm strings the principal may invoke.
    pub rpcs: Vec<String>,
    /// Unresolved `include:` references, kept for audit logging.
    pub includes: Vec<String>,
}

impl ScopeSet {
    /// Parse a space-separated OAuth `scope` string.
    pub fn parse(scope_header: &str) -> Result<Self, ParseError> {
        let mut out = Self::default();
        for token in scope_header.split_ascii_whitespace() {
            match Scope::parse(token)? {
                Scope::Include(v) => out.includes.push(v),
                Scope::Repo(v) => out.repos.push(v),
                Scope::Rpc(v) => out.rpcs.push(v),
            }
        }
        Ok(out)
    }

    /// Check whether this scope set allows writing to a given collection NSID.
    #[must_use]
    pub fn permits_write(&self, collection: &str) -> bool {
        self.repos.iter().any(|c| c == collection)
    }

    /// Check whether this scope set allows calling a given XRPC method.
    #[must_use]
    pub fn permits_rpc(&self, lxm: &str) -> bool {
        self.rpcs.iter().any(|m| m == lxm)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_tiered_read_only() {
        let set = ScopeSet::parse("include:pub.layers.authReadOnly").unwrap();
        assert_eq!(set.includes, vec!["pub.layers.authReadOnly".to_owned()]);
    }

    #[test]
    fn parses_mixed_bundle() {
        let set = ScopeSet::parse(
            "include:pub.layers.authAnnotator repo:pub.layers.annotation.annotationLayer rpc:pub.layers.annotation.getAnnotationLayer",
        )
        .unwrap();
        assert_eq!(set.repos, vec!["pub.layers.annotation.annotationLayer"]);
        assert_eq!(set.rpcs, vec!["pub.layers.annotation.getAnnotationLayer"]);
        assert_eq!(set.includes.len(), 1);
    }

    #[test]
    fn rejects_unknown_prefix() {
        assert!(matches!(
            Scope::parse("bogus:value"),
            Err(ParseError::Unrecognised(_))
        ));
    }

    #[test]
    fn rejects_token_without_colon() {
        assert!(matches!(
            Scope::parse("include"),
            Err(ParseError::Unrecognised(_))
        ));
    }

    #[test]
    fn permits_write_matches_exact_collection() {
        let set = ScopeSet::parse("repo:pub.layers.corpus.corpus").unwrap();
        assert!(set.permits_write("pub.layers.corpus.corpus"));
        assert!(!set.permits_write("pub.layers.corpus.membership"));
    }

    #[test]
    fn permits_rpc_matches_exact_method() {
        let set = ScopeSet::parse("rpc:pub.layers.corpus.getCorpus").unwrap();
        assert!(set.permits_rpc("pub.layers.corpus.getCorpus"));
        assert!(!set.permits_rpc("pub.layers.corpus.listCorpora"));
    }

    #[test]
    fn empty_scope_string_yields_empty_set() {
        let set = ScopeSet::parse("").unwrap();
        assert!(set.repos.is_empty());
        assert!(set.rpcs.is_empty());
        assert!(set.includes.is_empty());
    }

    #[test]
    fn whitespace_only_yields_empty_set() {
        let set = ScopeSet::parse("   \t\n  ").unwrap();
        assert!(set.repos.is_empty() && set.rpcs.is_empty() && set.includes.is_empty());
    }

    #[test]
    fn single_unknown_token_aborts_parse() {
        // The parser is fail-fast: one bad token rejects the whole bundle so
        // a typo doesn't silently downgrade granted permissions.
        let err = ScopeSet::parse("rpc:pub.layers.x bogus:value rpc:pub.layers.y").unwrap_err();
        assert!(matches!(err, ParseError::Unrecognised(_)));
    }
}
