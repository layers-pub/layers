---
sidebar_label: "Segmentation"
---

# pub.layers.segmentation

A segmentation record that binds a hierarchical document structure (sections containing sentences containing tokenizations) to an expression. Multiple segmentations can coexist for the same expression.

## Types

### main
**Type:** Record

A complete segmentation of an expression into sections, sentences, and tokenizations.

| Field | Type | Description |
|-------|------|-------------|
| `expression` | at-uri | Reference to the expression this segmentation applies to. |
| `sections` | array | The ordered sections of the expression. Array of ref: `#sectionWithSentences` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `knowledgeRefs` | array | Knowledge graph references (e.g., segmentation algorithm, sentence splitting model). Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features (e.g., segmenter version, parameters, language model used). Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### sectionWithSentences
**Type:** Object

A section paired with its constituent sentences and their tokenizations.

| Field | Type | Description |
|-------|------|-------------|
| `section` | ref | Ref: `pub.layers.expression#section`. Section, sentence, token, and tokenization are `kind` values on Expression records. |
| `sentences` | array | Sentences within this section. Array of ref: `#sentenceWithTokenizations` |

### sentenceWithTokenizations
**Type:** Object

A sentence paired with one or more tokenizations. Multiple tokenizations support interlinear glossing (word-level + morpheme-level), alternative segmentation strategies, or multi-granularity analysis. Use pub.layers.alignment to map between tokenizations.

| Field | Type | Description |
|-------|------|-------------|
| `sentence` | ref | Ref: `pub.layers.expression#sentence` |
| `tokenizations` | array | One or more tokenizations of this sentence. The first is conventionally the primary/word-level tokenization. Array of ref: `pub.layers.expression#tokenization` |
