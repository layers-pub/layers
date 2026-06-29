---
sidebar_label: "Expression"
---

# pub.layers.expression

An Expression is any linguistic unit in Layers, from a single morpheme to a full document. Expressions are recursive: a word is part of a phrase, which is part of a sentence, which is part of a paragraph, which is part of a document. Top-level expressions (documents, recordings) have no parent; all other expressions reference their containing expression via `parentRef`. Segmentation records define how a parent expression is broken into child expressions.

## Types

### expression
**NSID:** `pub.layers.expression.expression`
**Type:** Record

An expression record representing any linguistic unit, from a full document to a single morpheme, with optional recursive nesting.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | A corpus-level unique identifier (headline, URL, document ID, etc.). (required, max 1024) |
| `kindUri` | at-uri | AT-URI of the expression kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Expression kind slug (fallback when kindUri unavailable). (required) Known values: `document`, `transcript`, `dialogue`, `social-media`, `email`, `article`, `recording`, `video`, `multimodal`, `code`, `section`, `paragraph`, `chapter`, `turn`, `utterance`, `heading`, `list`, `sentence`, `clause`, `phrase`, `word`, `morpheme`, `character`, `other` |
| `text` | string | The full raw text of the expression. All byte-offset spans reference this string. (max 10000000) |
| `mediaRef` | at-uri | Reference to an associated media record (audio, video, image). |
| `mediaBlob` | blob | Optional inline media blob. Accepts `audio/*`, `video/*`, `image/*` (max size 52428800). |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `features` | ref | Arbitrary document-level features and metadata. Ref: `pub.layers.defs#featureMap` |
| `sourceUrl` | uri | URL of the external web resource this expression was derived from or annotates. |
| `sourceRef` | at-uri | AT-URI of an external ATProto record this expression is derived from or annotates (e.g., a standard.site Leaflet post, a com.whtwnd blog entry, an app.bsky.feed.post, an at.margin.bookmark). |
| `eprintRefs` | array | Eprint records (papers/preprints) describing or associated with this expression. Array of at-uri (max 64) |
| `knowledgeRefs` | array | References to knowledge base entries relevant to this expression. Array of ref: `pub.layers.defs#knowledgeRef` |
| `parentRef` | at-uri | Reference to the parent expression this one is nested within. Absent for top-level expressions (documents, recordings, etc.). |
| `anchor` | ref | How this expression attaches to its parent (character span, temporal span, etc.). Ref: `pub.layers.defs#anchor` |
| `languages` | array | BCP-47 language tags this record covers. Empty when language is unspecified or unknown. Array of strings (max 128) |
| `createdAt` | datetime | Record creation timestamp. (required) |

## XRPC Queries

### getExpression
**NSID:** `pub.layers.expression.getExpression`

Retrieve a single expression record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the expression record. |

**Output**: `{ uri: at-uri, cid: cid, value: expression }` where `value` is the expression record.

### listExpressions
**NSID:** `pub.layers.expression.listExpressions`

List expression records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | at-identifier (required) | The handle or DID of the repository. |
| `kind` | string | Filter by expression kind slug. |
| `parentRef` | at-uri | Filter to expressions nested within this parent. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |
| `languages` | array | Filter to records covering any of these BCP-47 language tags. Array of strings |

**Output**: `{ records: { uri: at-uri, cid: cid, value: expression }[], cursor?: string }` (each record is a recordView wrapping the expression in `value`).
