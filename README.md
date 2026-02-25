# Layers

Composable [ATProto](https://atproto.com) lexicons for representing, sharing, and interlinking linguistic annotation data in a decentralized network.

**Status:** v0.1.0 draft — in active development, accepting comments and discussion.

**Documentation:** [docs.layers.pub](https://docs.layers.pub)

## What is Layers?

Layers is a set of [AT Protocol Lexicon v1](https://atproto.com/guides/lexicon) schemas under the `pub.layers.*` namespace. It defines a composable interchange format for annotations across text, audio, video, and image modalities.

Layers subsumes 15+ major annotation data models—including CoNLL, CoNLL-U, brat, ELAN, TEI, WebVTT, Universal Dependencies, AMT, SRL, ARK, and others—while maintaining a theory-neutral, modular architecture. All annotation data lives in user-controlled Personal Data Servers (PDSes); Layers provides the schema and protocols for interoperability.

## Why Layers?

Linguistic annotation data is fragmented across incompatible formats, stored in centralized repositories, and lacks a common interchange layer:

- **Fragmentation**: Each annotation task has its own format (CoNLL, brat, ELAN, TEI, WebVTT) with no common schema for translation or composition.
- **Centralization**: Datasets live in centralized repositories with no user control over data access, licensing, or portability.
- **Lock-in**: Annotations created in one tool cannot be easily imported into another.
- **Isolation**: No standard way to link annotations to publications, relate annotations across records, or discover related work.

Layers solves this by defining shared primitives, staying theory-neutral, using ATProto for decentralization, providing tight integration with publication metadata and knowledge bases, and supporting composition across modalities.

## Architecture Overview

Layers is organized around a pipeline of annotation layers:

```
Expression (any linguistic unit: document, paragraph, sentence, word, morpheme)
       ↓
Segmentation (tokenization, chunking, segmentation bounds)
       ↓
Annotation (linguistic labels: POS, NER, semantic roles, etc.)
```

Parallel tracks integrate this pipeline with ontologies, corpora, lexical resources, human judgments, alignment, knowledge graphs, scholarly metadata, media, and personas. See the [full documentation](https://docs.layers.pub) for details.

## Repository Structure

```
lexicons/pub/layers/   ATProto lexicon schema JSON files
docs/                  Docusaurus documentation site (docs.layers.pub)
validate-lexicons.mjs  Lexicon validation script
```

## Lexicons

| Lexicon | Purpose |
|---------|---------|
| `pub.layers.defs` | Shared primitives: anchors, selectors, metadata, cross-references |
| `pub.layers.expression` | Primary document/expression model |
| `pub.layers.segmentation` | Section/sentence/tokenization binding |
| `pub.layers.annotation` | Unified abstract annotation model |
| `pub.layers.ontology` | Annotation type systems and role slots |
| `pub.layers.corpus` | Named corpus collections |
| `pub.layers.resource` | Lexical entries, templates, fillings |
| `pub.layers.judgment` | Linguistic judgment experiments |
| `pub.layers.alignment` | Parallel structure correspondence |
| `pub.layers.graph` | Knowledge graph integration |
| `pub.layers.persona` | Annotator personas and frameworks |
| `pub.layers.media` | Audio, video, image metadata |
| `pub.layers.eprint` | Scholarly metadata and eprint linkage |

## Contributing

This project is in the design phase. Please open [issues](https://github.com/layers-pub/layers/issues) or [discussions](https://github.com/layers-pub/layers/discussions) to provide feedback on the lexicon design.

## License

Copyright © 2025 Aaron Steven White. Licensed under [CC-BY-4.0](LICENSE).
