//! Firehose indexer for the Layers appview.
//!
//! Wires `idiolect-indexer`'s family-parameterised event loop to a
//! [`LayersRecordHandler`] that fans decoded `pub.layers.*` records out
//! to per-record-type writers. The transport, cursor store, and reconnect
//! logic are reused from `idiolect-indexer` unchanged; only the dispatch
//! rule in [`handler::LayersRecordHandler::handle`] is Layers-specific.

#![cfg_attr(docsrs, feature(doc_cfg))]

pub mod foreign;
pub mod handler;
pub mod health;

pub use handler::LayersRecordHandler;
pub use layers_storage::RecordSink;
pub use idiolect_indexer::{IndexerAction, IndexerConfig, IndexerError, drive_indexer};
pub use layers_records::LayersFamily;
