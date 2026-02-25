# Layers

<p align="center">
  <img src="layers-logo.svg" alt="Layers Logo" width="200">
</p>

<p align="center">
  <strong>Composable linguistic annotation lexicons for ATProto</strong>
</p>

<p align="center">
  <a href="https://github.com/layers-pub/layers/releases"><img src="https://img.shields.io/badge/version-0.1.0-purple?style=flat-square" alt="Version"></a>
  <a href="https://github.com/layers-pub/layers/blob/main/CHANGELOG.md"><img src="https://img.shields.io/badge/status-draft-orange?style=flat-square" alt="Status: Draft"></a>
  <a href="https://docs.layers.pub"><img src="https://img.shields.io/badge/docs-docs.layers.pub-blue?style=flat-square" alt="Documentation"></a>
  <a href="https://github.com/layers-pub/layers/blob/main/LICENSE"><img src="https://img.shields.io/github/license/layers-pub/layers?style=flat-square" alt="License"></a>
  <a href="https://atproto.com/"><img src="https://img.shields.io/badge/AT%20Protocol-native-blue?style=flat-square" alt="AT Protocol"></a>
</p>

<p align="center">
  <a href="https://docs.layers.pub">Documentation</a> •
  <a href="https://github.com/layers-pub/layers/discussions">Discussions</a> •
  <a href="https://bsky.app/profile/layers.pub">Bluesky</a>
</p>

## What is Layers?

Layers is a set of [AT Protocol Lexicon v1](https://atproto.com/guides/lexicon) schemas under the `pub.layers.*` namespace. It defines a composable interchange format for annotations across text, audio, video, and image modalities.

Layers subsumes 15+ major annotation data models (CoNLL, CoNLL-U, brat, ELAN, TEI, WebVTT, Universal Dependencies, AMT, SRL, ARK, and others) while maintaining a theory-neutral, modular architecture. All annotation data lives in user-controlled Personal Data Servers (PDSes); Layers provides the schema and protocols for interoperability.

## Architecture overview

Layers is organized around a pipeline of annotation layers, each building on primitives from the layer before:

```
Expression (any linguistic unit: document, paragraph, sentence, word, morpheme)
       ↓
Segmentation (tokenization, chunking, segmentation bounds)
       ↓
Annotation (linguistic labels: POS, NER, semantic roles, etc.)
```

Parallel tracks (ontology, corpus, resource, judgment, alignment) integrate this pipeline with external systems. Integration layers (graph, eprint, media, persona) connect Layers to the broader ATProto ecosystem. See the [documentation](https://docs.layers.pub) for the full architecture.

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

## Project structure

```
layers/
├── lexicons/               # ATProto lexicon schemas (pub.layers.*)
│   └── pub/layers/         # 13 lexicon JSON files
├── docs/                   # Docusaurus documentation site (docs.layers.pub)
│   ├── docs/              # Markdown source files
│   ├── docusaurus.config.ts
│   └── sidebars.ts
└── validate-lexicons.mjs   # Lexicon validation script
```

## Validation

```bash
npm install
npm test
```

## Contributing

This project is in the design phase. Open [issues](https://github.com/layers-pub/layers/issues) or [discussions](https://github.com/layers-pub/layers/discussions) to provide feedback on the lexicon design.

## License

Copyright © 2026 Aaron Steven White. Licensed under [CC-BY-SA-4.0](LICENSE).
