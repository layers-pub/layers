---
sidebar_label: "Alignment"
---

# pub.layers.alignment

Alignment records for parallel structure correspondence. Handles interlinear glossing (Leipzig glossing rules), parallel text alignment (translation), cross-tokenization mapping (word-to-morpheme), audio-text forced alignment, and any many-to-many correspondence between annotation elements or sequences.

## Types

### alignment
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
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |
