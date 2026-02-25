---
sidebar_label: "Corpus"
---

# pub.layers.corpus

Corpus records. A corpus is a named, versioned collection of expressions with shared metadata, annotation guidelines, and ontologies.

## Types

### main
**Type:** Record

A corpus: a curated collection of expressions.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Corpus name. |
| `description` | string | Detailed description of the corpus. |
| `version` | string | Version string for the corpus release. |
| `language` | string | Primary BCP-47 language tag. |
| `languages` | array | All languages represented. Array of strings |
| `domainUri` | at-uri | AT-URI of the domain definition node. Community-expandable via knowledge graph. |
| `domain` | string | Domain slug (fallback when domainUri unavailable). Known values: `news`, `biomedical`, `legal`, `social-media`, `dialogue`, `literary`, `scientific`, `web`, `spoken`, `custom` |
| `license` | string | License identifier (e.g., 'CC-BY-4.0', 'LDC-User-Agreement'). |
| `ontologyRefs` | array | Ontologies used in this corpus. Array of at-uri |
| `eprintRefs` | array | Eprint links for this corpus. Array of at-uri |
| `expressionCount` | integer | Number of expressions in the corpus. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### membership
**Type:** Record

A record indicating that an expression belongs to a corpus, with optional split assignment.

| Field | Type | Description |
|-------|------|-------------|
| `corpusRef` | at-uri | AT-URI of the corpus. |
| `expressionRef` | at-uri | AT-URI of the expression. |
| `splitUri` | at-uri | AT-URI of the split definition node. Community-expandable via knowledge graph. |
| `split` | string | Split slug (fallback when splitUri unavailable). Known values: `train`, `dev`, `test`, `unlabeled` |
| `ordinal` | integer | Ordering index within the corpus. |
| `metadata` | ref | Provenance: who assigned this expression to this corpus, when, with what tool. Ref: `pub.layers.defs#annotationMetadata` |
| `features` | ref | Open-ended features for this membership (e.g., source file, import batch, quality flags). Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |
