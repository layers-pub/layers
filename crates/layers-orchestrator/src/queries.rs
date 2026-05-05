//! Per-NSID query handlers.
//!
//! The handler functions and the route table are emitted from
//! `orchestrator-spec/queries.json` by `layers-codegen` into
//! [`crate::generated_routes`]. This module owns the shared helpers
//! every handler builds on: shape types, pagination, and the two
//! generic SQL paths `fetch_one` and `list_table_filtered`.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::Row;

use crate::error::{ApiError, Result};
use crate::state::AppState;

/// Default page size when the caller does not pass `limit`.
pub const DEFAULT_LIMIT: i64 = 50;

/// Hard cap on `limit` to bound memory and database work per request.
pub const MAX_LIMIT: i64 = 200;

/// `?uri=<at-uri>` query string consumed by every `get_*` handler.
#[derive(Debug, Deserialize)]
pub struct ByUri {
    /// AT-URI of the record to fetch.
    pub uri: String,
}

/// Generic list-pagination params. Per-method filters layer on top via
/// custom param structs declared in [`crate::generated_routes`].
#[derive(Debug, Default, Deserialize)]
pub struct ListParams {
    /// Optional `did` filter applied to the record's owning repo.
    #[serde(default)]
    pub did: Option<String>,
    /// Opaque pagination cursor returned by a previous list call.
    #[serde(default)]
    pub cursor: Option<String>,
    /// Maximum results to return. Capped at [`MAX_LIMIT`].
    #[serde(default)]
    pub limit: Option<i64>,
}

/// Wire shape of a list response.
#[derive(Debug, Serialize)]
pub struct ListResponse {
    /// Records matching the query.
    pub records: Vec<RecordView>,
    /// Cursor for the next page; absent when fully consumed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

/// Wire shape of a single record view, matching the ATProto
/// `com.atproto.repo.getRecord` convention (`uri`, `cid`, `value`).
#[derive(Debug, Serialize)]
pub struct RecordView {
    /// AT-URI of the record.
    pub uri: String,
    /// Content-addressed identifier of the record body, when known.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cid: Option<String>,
    /// Full record body as stored.
    pub value: Value,
}

/// Clamp a caller-supplied `limit` to the allowed range.
pub fn clamp_limit(req: Option<i64>) -> i64 {
    req.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
}

/// Fetch a single record by AT-URI from `table`.
///
/// # Errors
/// Returns [`ApiError::NotFound`] when no row matches and
/// [`ApiError::Internal`] for any underlying SQL error.
pub async fn fetch_one(state: &AppState, table: &str, uri: &str) -> Result<RecordView> {
    let row = sqlx::query(&format!(
        "SELECT uri, cid, record FROM {table} WHERE uri = $1"
    ))
    .bind(uri)
    .fetch_optional(state.pool())
    .await?
    .ok_or_else(|| ApiError::NotFound(format!("{uri} not found in {table}")))?;
    Ok(RecordView {
        uri: row.try_get("uri")?,
        cid: row.try_get("cid")?,
        value: row.try_get::<sqlx::types::Json<Value>, _>("record")?.0,
    })
}

/// One filter clause: matches `record->>'<json_path>' = $bind` (or
/// `did = $bind` for the special-cased "did" filter). Filters compose
/// with `AND`. Filters whose value is `None` are skipped.
#[derive(Debug, Clone)]
pub struct Filter<'a> {
    /// JSON path inside the `record` column, or the literal string
    /// `"did"` to match the indexed top-level column.
    pub path: &'a str,
    /// Filter value. `None` means "do not apply this filter".
    pub value: Option<String>,
}

impl<'a> Filter<'a> {
    /// Build a filter from an `Option<&str>`.
    #[must_use]
    pub fn opt(path: &'a str, value: Option<&str>) -> Self {
        Self {
            path,
            value: value.map(str::to_owned),
        }
    }

    /// Build a required filter from a `&str`.
    #[must_use]
    pub fn req(path: &'a str, value: &str) -> Self {
        Self {
            path,
            value: Some(value.to_owned()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_limit_uses_default_when_unset() {
        assert_eq!(clamp_limit(None), DEFAULT_LIMIT);
    }

    #[test]
    fn clamp_limit_floors_at_one() {
        assert_eq!(clamp_limit(Some(0)), 1);
        assert_eq!(clamp_limit(Some(-5)), 1);
    }

    #[test]
    fn clamp_limit_ceils_at_max() {
        assert_eq!(clamp_limit(Some(MAX_LIMIT + 1)), MAX_LIMIT);
        assert_eq!(clamp_limit(Some(10_000)), MAX_LIMIT);
    }

    #[test]
    fn clamp_limit_passes_through_in_range_value() {
        assert_eq!(clamp_limit(Some(75)), 75);
    }

    #[test]
    fn filter_opt_carries_none_when_value_absent() {
        let f = Filter::opt("kind", None);
        assert_eq!(f.path, "kind");
        assert!(f.value.is_none());
    }

    #[test]
    fn filter_opt_takes_value_when_present() {
        let f = Filter::opt("kind", Some("document"));
        assert_eq!(f.path, "kind");
        assert_eq!(f.value.as_deref(), Some("document"));
    }

    #[test]
    fn filter_req_always_has_value() {
        let f = Filter::req("kind", "document");
        assert_eq!(f.value.as_deref(), Some("document"));
    }
}

/// List records from `table`, applying every active filter and a
/// keyset-paginated `(uri >  cursor) ORDER BY uri ASC` window.
///
/// # Errors
/// Returns [`ApiError::Internal`] for any underlying SQL error.
pub async fn list_table_filtered(
    state: &AppState,
    table: &str,
    filters: &[Filter<'_>],
    cursor: Option<&str>,
    limit: i64,
) -> Result<ListResponse> {
    let mut sql = format!("SELECT uri, cid, record FROM {table} WHERE 1=1");
    let mut binds: Vec<String> = Vec::new();
    let mut next_param = 1usize;

    for f in filters {
        let Some(value) = &f.value else {
            continue;
        };
        if f.path == "did" {
            sql.push_str(&format!(" AND did = ${next_param}"));
        } else {
            sql.push_str(&format!(" AND record->>'{}' = ${next_param}", f.path));
        }
        binds.push(value.clone());
        next_param += 1;
    }

    sql.push_str(&format!(" AND (${next_param}::TEXT IS NULL OR uri > ${next_param})"));
    binds.push(cursor.unwrap_or_default().to_owned());
    let cursor_is_none = cursor.is_none();
    next_param += 1;

    sql.push_str(&format!(" ORDER BY uri ASC LIMIT ${next_param}"));
    let fetch_limit = limit + 1;
    let limit_param = next_param;

    let mut q = sqlx::query(&sql);
    for (i, b) in binds.iter().enumerate() {
        if i + 1 == limit_param - 1 && cursor_is_none {
            q = q.bind::<Option<String>>(None);
        } else {
            q = q.bind(b);
        }
    }
    q = q.bind(fetch_limit);

    let rows = q.fetch_all(state.pool()).await?;

    let mut records: Vec<RecordView> = rows
        .into_iter()
        .map(|row| {
            Ok::<_, ApiError>(RecordView {
                uri: row.try_get("uri")?,
                cid: row.try_get("cid")?,
                value: row.try_get::<sqlx::types::Json<Value>, _>("record")?.0,
            })
        })
        .collect::<Result<_>>()?;

    let next_cursor = if records.len() as i64 == fetch_limit {
        records.pop().map(|r| r.uri)
    } else {
        None
    };

    Ok(ListResponse {
        records,
        cursor: next_cursor,
    })
}

