//! Verification runners for Layers-published lenses.
//!
//! A `pub.layers.*` lens (a `dev.idiolect.PanprotoLens` whose source or
//! target schema is a Layers record type) makes a property claim:
//! either round-trip stability (`put(get(x)) == x` over a corpus) or
//! static well-typedness against the source/target schemas. This crate
//! exposes runners that exercise those claims and emit signed
//! `dev.idiolect.verification` records describing the result.
//!
//! Two runners ship today:
//!
//! - [`roundtrip::RoundtripRunner`] — exercises `put∘get` against a
//!   corpus of test fixtures, returning the first counterexample's
//!   index when the law fails.
//! - [`static_check::StaticCheckRunner`] — defers to
//!   `idiolect_verify`'s wrapper around `panproto::check::validate`,
//!   adding a `pub.layers.*`-aware schema resolver.
//!
//! The runners are wired through `verify-spec/runners.json`; codegen
//! emits the registry, hand-written impls live in [`runners`].

#![cfg_attr(docsrs, feature(doc_cfg))]

pub mod corpus;
pub mod roundtrip;

pub use corpus::Corpus;
pub use roundtrip::{RoundtripOutcome, RoundtripRunner};
