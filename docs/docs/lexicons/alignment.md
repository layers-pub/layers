---
sidebar_label: "Alignment"
---

# pub.layers.alignment

Alignment records for parallel structure correspondence. Handles interlinear glossing (Leipzig glossing rules), parallel text alignment (translation), cross-tokenization mapping (word-to-morpheme), audio-text forced alignment, and any many-to-many correspondence between annotation elements or sequences.

## Types

### alignment
**NSID:** `pub.layers.alignment.alignment`
**Type:** Record

An alignment between two parallel sequences. The sequences can be tokenizations, annotation layers, expressions (for parallel text), or tiers. Links establish many-to-many correspondence between elements indexed by position.

| Field | Type | Description |
|-------|------|-------------|
| `expression` | at-uri | Primary expression context (for within-document alignments). |
| `kindUri` | at-uri | AT-URI of the alignment kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Alignment kind slug (fallback). Known values: `tokenization-to-tokenization`, `interlinear`, `parallel-text`, `audio-to-text`, `layer-to-layer`, `error-to-correction`, `custom` |
| `subkindUri` | at-uri | AT-URI of the alignment subkind definition node. Community-expandable via knowledge graph. |
| `subkind` | string | Alignment subkind slug (fallback). Known values: `word-to-morpheme`, `word-to-word`, `sentence-to-sentence`, `phrase-to-phrase`, `morpheme-to-gloss`, `forced-alignment`, `manual-alignment`, `custom` |
| `source` | ref | Reference to the source sequence. Ref: `pub.layers.defs#objectRef` |
| `target` | ref | Reference to the target sequence. Ref: `pub.layers.defs#objectRef` |
| `sourceLang` | string | BCP-47 language tag for the source (for parallel text alignment). |
| `targetLang` | string | BCP-47 language tag for the target. |
| `links` | array | The alignment links. Array of ref: `pub.layers.defs#alignmentLink` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `licensing` | ref | Licensing terms governing this alignment (supports dual/multi/component licensing). Ref: `pub.layers.defs#licensing` |
| `eprintRefs` | array | Eprint records (papers/preprints) describing or associated with this alignment. Array of at-uri (max 64) |
| `reproducibility` | ref | How this alignment was produced (code, commit, command, environment, seed). Ref: `pub.layers.defs#reproducibilityInfo` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

## XRPC Queries

### getAlignment
**NSID:** `pub.layers.alignment.getAlignment`

Retrieve a single alignment record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the alignment record. |

**Output**: `{ uri, cid, value }` where `value` is the alignment record object.

### listAlignments
**NSID:** `pub.layers.alignment.listAlignments`

List alignments for a given expression context (required `expression` AT-URI) with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `expression` | at-uri (required) | The AT-URI of the expression context to list alignments for. |
| `kind` | string | Filter by alignment kind slug (maxLength 128). |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: { uri, cid, value }[], cursor?: string }` where `value` is the alignment record.
