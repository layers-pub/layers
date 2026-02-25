---
sidebar_position: 1
slug: /
---

# Introduction

## What is Layers?

Layers is a set of ATProto Lexicon v1 schemas for representing, sharing, and interlinking linguistic annotation data in a decentralized network. It defines a composable interchange format for annotations across text, audio, video, and image modalities.

Layers subsumes 15+ major annotation data models—including CoNLL, CoNLL-U, brat, ELAN, TEI, WebVTT, VTT, Universal Dependencies, AMT, SRL, ARK, and others—while maintaining a theory-neutral, modular architecture. All annotation data lives in user-controlled Personal Data Servers (PDSes); Layers provides the schema and protocols for interoperability.

## Why Layers?

Linguistic annotation data is fragmented across incompatible formats, stored in centralized repositories, and lacks a common interchange layer:

- **Fragmentation**: Each annotation task (part-of-speech tagging, dependency parsing, discourse analysis, etc.) has its own format—CoNLL, brat, ELAN, TEI, WebVTT—with no common schema for translation or composition.
- **Centralization**: Datasets live in centralized repositories (Linguistic Data Consortium, GitHub, institutional servers) or isolated research databases. Users have no control over data access, licensing, or portability.
- **Lock-in**: Annotations created in one tool cannot be easily imported into another. Interoperability requires custom conversion scripts that fail on edge cases.
- **Isolation**: There is no standard way to link annotations to publications, relate annotations across records, or discover related work.

Layers solves this by:

1. **Defining shared primitives** that all annotation types compose from (anchors, constraints, agents, metadata).
2. **Staying theory-neutral** by representing all linguistic labels, categories, and formalisms as data values, not schema.
3. **Using ATProto for decentralization**: all user data lives in their PDSes; annotations are ATProto records that users publish and control.
4. **Providing tight integration** with publication metadata, knowledge bases (Wikidata, FrameNet, SRL databases), and existing tools (via W3C Web Annotation selectors).
5. **Supporting composition** across modalities and annotation types through recursive cross-referencing. See the [Multimodal Annotation guide](./guides/multimodal-annotation.md) for examples.

## Status

Layers is in **v0.1.0 draft** status, in active development and accepting comments and discussion. File issues or participate on GitHub: https://github.com/layers-pub/layers

## Architecture Overview

Layers is organized around a **pipeline** of annotation layers, each building on primitives from the layer before:

```
Expression (any linguistic unit: document, paragraph, sentence, word, morpheme)
       ↓
Segmentation (tokenization, chunking, segmentation bounds)
       ↓
Annotation (linguistic labels: POS, NER, semantic roles, etc.)
```

Expressions are recursive: a document contains paragraphs, which contain sentences, which contain words, which contain morphemes. Each Expression can reference its parent via `parentRef`, and Segmentation records define the ordered decomposition of a parent Expression into child Expressions.

**Parallel tracks** integrate this pipeline with external systems:

- **Ontology**: authority records for label definitions, linguistic categories, frameworks.
- **Corpus**: corpus metadata, membership, and statistics.
- **Resource**: lexical entries, stimulus templates, and fillings.
- **Judgment**: human and model judgments, confidence scores, disagreement metadata.
- **Alignment**: cross-record linking, token sequence correspondence, equivalence.

**Integration layers** connect Layers to the ATProto ecosystem:

- **Graph**: generic typed property graph for knowledge representation and cross-referencing.
- **Eprint**: scholarly metadata, publication links, and data provenance.
- **Media**: rich media attachments (audio, video, image references).
- **Persona**: persona/agent metadata for attribution and tool tracking.

## License

Copyright © 2025 Aaron Steven White. Layers is licensed under **CC-BY-4.0**.

## Next Steps

- Read [Foundations](./foundations.md) for design principles, primitives, and the flexible enum pattern.
- See [Lexicon Overview](./lexicon-overview.md) for the full list of schemas.
- Explore the [Guides](./guides/index.md) for in-depth coverage of temporal, spatial, multimodal, and knowledge grounding topics.
