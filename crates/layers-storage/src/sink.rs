//! [`RecordSink`] implementations for the four Layers backends.
//!
//! This module contains [`PostgresRecordSink`], the source-of-truth writer.
//! Search (Elasticsearch) and graph (Neo4j) sinks live in sibling modules
//! gated behind their respective features. A composite [`MultiSink`] fans
//! a single decoded record out to several backends concurrently.
//!
//! Schema is uniform across the 26 record-kind tables: the `record`
//! column carries the full JSON body, and the orchestrator's filter
//! predicates query JSONB via `record->>'<key>'`. This keeps schema
//! and write paths regular without losing any query reach.

#[cfg(feature = "postgres")]
mod pg {
    use idiolect_indexer::IndexerError;
    use layers_records::{AnyRecord, LayersFamily, RecordFamily};
    use serde_json::Value;
    use sqlx::PgPool;
    use sqlx::types::Json;

    use crate::RecordSink;

    /// PostgreSQL writer that upserts each `pub.layers.*` record into its
    /// per-collection table. Every table has the shape
    /// `(uri PRIMARY KEY, did, rkey, indexed_at, record JSONB)`; richer
    /// access patterns query JSONB indexes on `record`.
    #[derive(Debug, Clone)]
    pub struct PostgresRecordSink {
        pool: PgPool,
    }

    impl PostgresRecordSink {
        /// Wrap an existing pool.
        #[must_use]
        pub fn new(pool: PgPool) -> Self {
            Self { pool }
        }

        /// Borrow the underlying pool. Useful for transactional writes
        /// that span multiple tables.
        #[must_use]
        pub fn pool(&self) -> &PgPool {
            &self.pool
        }

    }

    #[async_trait::async_trait]
    impl RecordSink for PostgresRecordSink {
        async fn put_record(
            &self,
            did: &str,
            rkey: &str,
            cid: Option<&str>,
            record: &AnyRecord,
        ) -> Result<(), IndexerError> {
            let nsid = LayersFamily::nsid_str(record);
            let uri = format!("at://{did}/{nsid}/{rkey}");
            let body = serde_json::to_value(record)
                .map_err(|e| IndexerError::Handler(format!("serialize {nsid}: {e}")))?;
            upsert(&self.pool, table_for(nsid), &uri, did, rkey, cid, &body).await
        }

        async fn delete_record(
            &self,
            did: &str,
            collection: &str,
            rkey: &str,
        ) -> Result<(), IndexerError> {
            let table = table_for(collection);
            let uri = format!("at://{did}/{collection}/{rkey}");
            sqlx::query(&format!("DELETE FROM {table} WHERE uri = $1"))
                .bind(&uri)
                .execute(&self.pool)
                .await
                .map_err(|e| IndexerError::Handler(format!("delete {table}: {e}")))?;
            Ok(())
        }
    }

    /// Map a `pub.layers.<ns>.<record>` NSID to its Postgres table name.
    fn table_for(nsid: &str) -> &'static str {
        match nsid {
            "pub.layers.expression.expression" => "expressions",
            "pub.layers.corpus.corpus" => "corpora",
            "pub.layers.corpus.membership" => "corpus_memberships",
            "pub.layers.persona.persona" => "personas",
            "pub.layers.media.media" => "media_records",
            "pub.layers.eprint.eprint" => "eprints",
            "pub.layers.eprint.dataLink" => "data_links",
            "pub.layers.ontology.ontology" => "ontologies",
            "pub.layers.ontology.typeDef" => "type_defs",
            "pub.layers.segmentation.segmentation" => "segmentations",
            "pub.layers.alignment.alignment" => "alignments",
            "pub.layers.annotation.annotationLayer" => "annotation_layers",
            "pub.layers.annotation.clusterSet" => "cluster_sets",
            "pub.layers.graph.graphNode" => "graph_nodes",
            "pub.layers.graph.graphEdge" => "graph_edges",
            "pub.layers.graph.graphEdgeSet" => "graph_edge_sets",
            "pub.layers.judgment.experimentDef" => "experiment_defs",
            "pub.layers.judgment.judgmentSet" => "judgment_sets",
            "pub.layers.judgment.agreementReport" => "agreement_reports",
            "pub.layers.resource.collection" => "resource_collections",
            "pub.layers.resource.collectionMembership" => "resource_collection_memberships",
            "pub.layers.resource.entry" => "resource_entries",
            "pub.layers.resource.filling" => "resource_fillings",
            "pub.layers.resource.template" => "resource_templates",
            "pub.layers.resource.templateComposition" => "resource_template_compositions",
            "pub.layers.changelog.entry" => "changelog_entries",
            other => panic!("table_for: unknown pub.layers NSID {other}"),
        }
    }

    async fn upsert(
        pool: &PgPool,
        table: &str,
        uri: &str,
        did: &str,
        rkey: &str,
        cid: Option<&str>,
        body: &Value,
    ) -> Result<(), IndexerError> {
        let sql = format!(
            "INSERT INTO {table} (uri, did, rkey, cid, indexed_at, record)
             VALUES ($1, $2, $3, $4, NOW(), $5)
             ON CONFLICT (uri) DO UPDATE
             SET did = EXCLUDED.did,
                 rkey = EXCLUDED.rkey,
                 cid = EXCLUDED.cid,
                 indexed_at = NOW(),
                 record = EXCLUDED.record"
        );
        sqlx::query(&sql)
            .bind(uri)
            .bind(did)
            .bind(rkey)
            .bind(cid)
            .bind(Json(body))
            .execute(pool)
            .await
            .map_err(|e| IndexerError::Handler(format!("upsert {table}: {e}")))?;
        Ok(())
    }
}

#[cfg(feature = "postgres")]
pub use pg::PostgresRecordSink;
