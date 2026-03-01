---
sidebar_label: "Segmentation"
---

# pub.layers.segmentation

A segmentation record that binds one or more tokenizations to an expression. Each tokenization can cover the whole expression or a specific sub-expression (e.g., a sentence). Multiple segmentations can coexist for the same expression, enabling alternative tokenization strategies.

Structural hierarchy (sections, sentences, paragraphs, turns) is expressed via expression records with `parentRef` and appropriate `kind` values. The segmentation record provides the token-level decomposition only.

## Types

### segmentation
**NSID:** `pub.layers.segmentation.segmentation`
**Type:** Record

A segmentation of an expression into tokenizations.

| Field | Type | Description |
|-------|------|-------------|
| `expression` | at-uri | Reference to the expression this segmentation applies to. |
| `tokenizations` | array | The tokenizations in this segmentation. Each can optionally scope to a sub-expression via `expressionRef`. Array of ref: `pub.layers.segmentation.defs#tokenization` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `knowledgeRefs` | array | Knowledge graph references (e.g., tokenizer algorithm, sentence splitting model). Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features (e.g., tokenizer version, parameters, language model used). Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### tokenization
**NSID:** `pub.layers.segmentation.defs#tokenization`
**Type:** Object

An ordered sequence of tokens for an expression or sub-expression. Multiple tokenizations can coexist for the same expression (e.g., whitespace vs. BPE vs. morphological), enabling interlinear glossing, alternative segmentation strategies, or multi-granularity analysis. Use `pub.layers.alignment.alignment` to map between tokenizations.

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | ref | Ref: `pub.layers.defs#uuid` |
| `kindUri` | at-uri | AT-URI of the tokenization kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Tokenization kind slug (fallback when kindUri unavailable). Known values: `whitespace`, `penn-treebank`, `bpe`, `sentencepiece`, `character`, `morphological`, `custom` |
| `expressionRef` | at-uri | Reference to the specific sub-expression this tokenization covers (e.g., a sentence-level expression). If absent, covers the entire expression referenced by the segmentation record. |
| `tokens` | array | The ordered token sequence. Array of ref: `pub.layers.segmentation.defs#token` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |

### token
**NSID:** `pub.layers.segmentation.defs#token`
**Type:** Object

A single token within a tokenization.

| Field | Type | Description |
|-------|------|-------------|
| `tokenIndex` | integer | Position of this token in the tokenization (0-based). |
| `text` | string | The surface form of the token. |
| `textSpan` | ref | Character offsets into the expression text. Ref: `pub.layers.defs#span` |
| `temporalSpan` | ref | Temporal span for audio/video-grounded tokens. Ref: `pub.layers.defs#temporalSpan` |

## XRPC Queries

### getSegmentation
**NSID:** `pub.layers.segmentation.getSegmentation`

Retrieve a single segmentation record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the segmentation record. |

**Output**: The segmentation record object.

### listSegmentations
**NSID:** `pub.layers.segmentation.listSegmentations`

List segmentation records for a given expression.

| Parameter | Type | Description |
|-----------|------|-------------|
| `expression` | at-uri (required) | The expression to list segmentations for. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: segmentation[], cursor?: string }`
