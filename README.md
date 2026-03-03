# Layers

<p align="center">
  <img src="layers-logo.svg" alt="Layers Logo" width="200">
</p>

<p align="center">
  <strong>Composable linguistic annotation lexicons for ATProto</strong>
</p>

<p align="center">
  <a href="https://github.com/layers-pub/layers/releases"><img src="https://img.shields.io/badge/version-0.5.0-purple?style=flat-square" alt="Version"></a>
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

Layers is a set of [AT Protocol Lexicon](https://atproto.com/guides/lexicon) schemas under the `pub.layers.*` namespace. It defines a composable interchange format for linguistic annotations across text, audio, video, and image modalities, psycholinguistic and neurolinguistic signals, and offline judgment and experiment data.

Layers subsumes 15+ major annotation data models (CoNLL, CoNLL-U, brat, ELAN, TEI, WebVTT, Universal Dependencies, AMT, SRL, ARK, and others) while maintaining a theory-neutral, modular architecture. All data lives in user-controlled Personal Data Servers (PDSes); Layers provides the schema and protocols for interoperability.

## Architecture overview

Layers is organized around a core pipeline of annotation layers, with parallel tracks for experimental and analytical workflows and integration layers connecting to the ATProto ecosystem:

```
Core Pipeline
  Expression (any linguistic unit: document, paragraph, sentence, word, morpheme)
         ↓
  Segmentation (tokenization strategies, token sequences)
         ↓
  Annotation (linguistic labels: POS, NER, semantic roles, etc.)

Parallel Tracks
  Ontology · Corpus · Resource · Judgment · Alignment

Integration Layers
  Graph · Eprint · Media · Persona · Changelog
```

See the [documentation](https://docs.layers.pub) for the full architecture, including dependency graphs and cross-referencing patterns.

## Lexicons

14 lexicon namespaces define 26 record types and 90 lexicon schemas:

| Namespace | Purpose |
|-----------|---------|
| `pub.layers.defs` | Shared primitives: anchors, selectors, metadata, cross-references |
| `pub.layers.expression` | Recursive document and expression model |
| `pub.layers.segmentation` | Tokenization strategies and token sequences |
| `pub.layers.annotation` | Annotation layers and cluster sets |
| `pub.layers.ontology` | Annotation type systems, role slots, and theoretical frameworks |
| `pub.layers.corpus` | Corpus collections with annotation design metadata |
| `pub.layers.resource` | Lexical entries, stimulus templates, fillings, and collections |
| `pub.layers.judgment` | Experiment definitions, judgment sets, and agreement reports |
| `pub.layers.alignment` | Cross-lingual and cross-modal structure correspondence |
| `pub.layers.graph` | Typed property graph nodes, edges, and edge sets |
| `pub.layers.persona` | Annotator personas and annotation frameworks |
| `pub.layers.media` | Audio, video, image, and signal metadata |
| `pub.layers.eprint` | Scholarly metadata and data provenance links |
| `pub.layers.changelog` | Structured change tracking with sub-record targeting |

## Project structure

```
layers/
├── lexicons/               # ATProto lexicon schemas (pub.layers.*)
│   └── pub/layers/         # 14 namespace directories, 90 JSON files
│       ├── defs.json        # Shared primitives
│       ├── expression/      # Record types, queries, and namespace defs
│       ├── annotation/
│       ├── ...
│       └── changelog/
├── docs/                   # Docusaurus documentation site (docs.layers.pub)
│   ├── docs/               # Markdown source files
│   ├── docusaurus.config.ts
│   └── sidebars.ts
├── CHANGELOG.md
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

Licensed under [CC-BY-SA-4.0](LICENSE).
