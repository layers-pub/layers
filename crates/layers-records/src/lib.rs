//! Generated Rust record types for the `pub.layers.*` lexicon family.
//!
//! All record types live under [`generated`], emitted by `layers-codegen`
//! from `layers/lexicons/pub/layers/`. The trait infrastructure
//! ([`Record`], [`RecordFamily`], [`Nsid`], etc.) is reused from
//! `idiolect-records` so this crate plugs into every family-agnostic
//! boundary in the idiolect workspace without duplicating types.
//!
//! Do not edit the contents of [`generated`] by hand. Re-run
//! `cargo run -p layers-codegen -- generate` after changing any lexicon.

#![allow(missing_docs)]

pub use idiolect_records::{
    AtUri, AtUriError, Cid, CidError, Datetime, DatetimeError, Did, DidError, DidMethod,
    Language, LanguageError, Nsid, NsidError, OrAny, OrFamily, Record, RecordFamily, Uri,
    UriError, detect_or_family_overlap,
};

/// Trait module re-export so generated `family.rs` can name `crate::family::RecordFamily`.
pub mod family {
    pub use idiolect_records::RecordFamily;
}

/// Decode-error module re-export so generated `family.rs` can name `crate::record::DecodeError`.
pub mod record {
    pub use idiolect_records::DecodeError;
}

#[path = "generated/mod.rs"]
pub mod generated;

pub use generated::family::{AnyRecord, LayersFamily, decode_record};
pub use generated::*;
