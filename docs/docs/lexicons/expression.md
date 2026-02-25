---
sidebar_label: "Expression"
---

# pub.layers.expression

An Expression is any linguistic unit in Layers — from a single morpheme to a full document. Expressions are recursive: a word is part of a phrase, which is part of a sentence, which is part of a paragraph, which is part of a document. Top-level expressions (documents, recordings) have no parent; all other expressions reference their containing expression via `parentRef`. Segmentation records define how a parent expression is broken into child expressions.

## Types

### main
**Type:** Record

An expression record representing any linguistic unit — from a full document to a single morpheme — with optional recursive nesting.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | A corpus-level unique identifier (headline, URL, document ID, etc.). |
| `kindUri` | at-uri | AT-URI of the expression kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Expression kind slug (fallback when kindUri unavailable). Known values: `document`, `transcript`, `dialogue`, `social-media`, `email`, `article`, `recording`, `video`, `multimodal`, `code`, `section`, `paragraph`, `chapter`, `turn`, `utterance`, `heading`, `list`, `sentence`, `clause`, `phrase`, `word`, `morpheme`, `character`, `other` |
| `text` | string | The full raw text of the expression. All character-offset spans reference this string. |
| `mediaRef` | at-uri | Reference to an associated media record (audio, video, image). |
| `mediaBlob` | blob | Optional inline media blob. |
| `language` | string | BCP-47 language tag for the primary language. |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `features` | ref | Arbitrary document-level features and metadata. Ref: `pub.layers.defs#featureMap` |
| `sourceUrl` | uri | URL of the external web resource this expression was derived from or annotates. |
| `sourceRef` | at-uri | AT-URI of an external ATProto record this expression is derived from or annotates (e.g., a standard.site Leaflet post, a com.whtwnd blog entry, an app.bsky.feed.post, an at.margin.bookmark). |
| `eprintRef` | at-uri | Reference to an eprint record that this expression is associated with. |
| `knowledgeRefs` | array | References to knowledge base entries relevant to this expression. Array of ref: `pub.layers.defs#knowledgeRef` |
| `parentRef` | at-uri | Reference to the parent expression this one is nested within. Absent for top-level expressions (documents, recordings, etc.). |
| `anchor` | ref | How this expression attaches to its parent (character span, temporal span, etc.). Ref: `pub.layers.defs#anchor` |
| `languages` | array | Additional BCP-47 language tags for multilingual or code-switching expressions. Array of strings |
| `createdAt` | datetime | Record creation timestamp. |
