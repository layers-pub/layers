//! Granular OAuth scope and service-auth enforcement for the Layers appview.
//!
//! Six tiered permission-set lexicons under
//! `layers/lexicons/pub/layers/auth*.json` define the scope grammar:
//!
//! - `authReadOnly` — read-only access to every `pub.layers.*` query method.
//! - `authCorpusManager` — reader + writes on corpora, expressions, media, resources.
//! - `authAnnotator` — corpus manager + annotation, segmentation, alignment, judgment writes.
//! - `authOntologyEditor` — reader + ontology, graph, typeDef writes.
//! - `authExperimenter` — annotator + experimentDef, judgmentSet, agreementReport writes.
//! - `authFull` — every collection + every query.
//!
//! This crate parses those lexicons, materialises them into the scope
//! normal form consumed by `ATProto` OAuth servers (`include:pub.layers.auth*`
//! references plus `rpc:` / `repo:` expansions), and exposes:
//!
//! - [`scope::ScopeSet`] — a granted-scope bundle extracted from a JWT.
//! - [`verify::verify_service_auth`] — validates the `lxm` claim on a service-auth
//!   JWT against the method the gateway is about to dispatch.
//! - [`did::DidWebResolver`] — resolves `did:web:<host>` to its signing
//!   key set by fetching `https://<host>/.well-known/did.json`.
//! - [`jwt::verify_jwt`] — verifies the signature on a JWT against a
//!   resolved key set, returning the decoded claims.

#![cfg_attr(docsrs, feature(doc_cfg))]

pub mod did;
pub mod jwt;
pub mod scope;
pub mod sign;
pub mod verify;
