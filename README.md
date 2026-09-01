# Layers

<p align="center">
  <img src="layers-logo.svg" alt="Layers logo" width="200">
</p>

<p align="center">
  <strong>Composable linguistic annotation lexicons for ATProto</strong>
</p>

<p align="center">
  <a href="https://github.com/layers-pub/layers/releases"><img src="https://img.shields.io/badge/version-0.10.0-purple?style=flat-square" alt="Version 0.10.0"></a>
  <a href="https://github.com/layers-pub/layers/blob/main/CHANGELOG.md"><img src="https://img.shields.io/badge/status-active%20development-orange?style=flat-square" alt="Status: active development"></a>
  <a href="https://docs.layers.pub"><img src="https://img.shields.io/badge/docs-docs.layers.pub-blue?style=flat-square" alt="Documentation"></a>
  <a href="https://github.com/layers-pub/layers/blob/main/LICENSE"><img src="https://img.shields.io/github/license/layers-pub/layers?style=flat-square" alt="License"></a>
  <a href="https://atproto.com/"><img src="https://img.shields.io/badge/AT%20Protocol-native-blue?style=flat-square" alt="AT Protocol"></a>
</p>

<p align="center">
  <a href="https://docs.layers.pub">Documentation</a> ·
  <a href="https://github.com/layers-pub/layers/discussions">Discussions</a> ·
  <a href="https://bsky.app/profile/layers.pub">Bluesky</a>
</p>

## What is Layers?

Layers defines [AT Protocol Lexicon](https://atproto.com/guides/lexicon) schemas under `pub.layers.*` for publishing linguistic annotations. Its records cover text, audio, video, images, experimental judgments, physiological signals, and the metadata needed to connect those materials.

The schemas provide a common target for formats such as CoNLL-U, brat, ELAN, TEI, WebVTT, Universal Dependencies, AMR, and semantic-role resources. Records remain in user-controlled Personal Data Servers (PDSes), where other ATProto services can resolve and compose them.

This repository contains the lexicon schemas and their documentation. Appview implementations, generated language bindings, and application code are versioned separately from this schema release.

## Version 0.10.0

Version 0.10.0 contains 114 `pub.layers.*` lexicon files:

- 30 record collections
- 65 query or procedure methods
- shared definition lexicons
- six OAuth permission-set lexicons

This release adds one field. `pub.layers.judgment.defs#judgment` gains an optional `regionResponses` array, one entry per region of the presented stimulus, for self-paced-reading, eye-tracking-while-reading, and maze tasks. Each `regionResponse` names its region and analysis role and carries the standard reading and eye-movement measures (reading time, first-fixation and gaze duration, go-past and total time, regression counts, and fixation count). The change is additive and backward compatible: existing judgments omit the field, and the previously unreferenced `regionResponse` definition now has a referrer. See the [changelog](CHANGELOG.md) for the full notes.

## Data model

The central dependency chain is:

```text
Expression -> Segmentation -> Annotation
```

Expressions identify linguistic material. Segmentations identify units within that material. Annotation layers assign typed values to anchored spans or units. Other record families add reusable ontologies, corpora, resources, judgments, alignments, graphs, personas, media, scholarly provenance, acquisition sessions, catalogs, and change histories.

| Schema group | Purpose |
| --- | --- |
| `pub.layers.defs` | Shared references, anchors, selectors, metadata, and provenance |
| `pub.layers.expression` | Recursive documents and linguistic expressions |
| `pub.layers.segmentation` | Tokenization strategies and token sequences |
| `pub.layers.annotation` | Annotation layers and cluster sets |
| `pub.layers.ontology` | Type systems, roles, and theoretical frameworks |
| `pub.layers.corpus` | Corpora and corpus membership |
| `pub.layers.resource` | Lexical entries, templates, fillings, and collections |
| `pub.layers.judgment` | Experiments, judgment sets, and agreement reports |
| `pub.layers.alignment` | Cross-lingual and cross-modal correspondences |
| `pub.layers.graph` | Typed graph nodes, edges, and edge sets |
| `pub.layers.persona` | Annotator personas and annotation frameworks |
| `pub.layers.media` | Audio, video, image, and signal metadata |
| `pub.layers.eprint` | Scholarly metadata and data provenance links |
| `pub.layers.acquisition` | Participants and data-collection sessions |
| `pub.layers.catalog` | Collections and memberships across record families |
| `pub.layers.changelog` | Structured changes with sub-record targeting |
| `pub.layers.integration` | Foreign-record lookup and panproto lens application |
| `pub.layers.auth*` | OAuth permission sets for appview operations |

See the [documentation](https://docs.layers.pub) for field references, design guidance, and data-model mappings.

## Repository structure

```text
layers/
├── lexicons/
│   ├── pub/layers/       # Released pub.layers.* schemas
│   ├── foreign/          # Vendored source schemas used by cross-app lenses
│   ├── lenses/           # Panproto mappings from foreign records to Layers
│   └── upstream/         # Typed source-format theories and projections
├── docs/                 # Docusaurus documentation site
├── CHANGELOG.md          # Schema release history and compatibility notes
└── validate-lexicons.mjs # Lexicon and cross-reference validator
```

The JSON files in `lexicons/pub/layers/` are the source of truth for the released schema. Supporting foreign schemas and mappings do not change the meaning of the `pub.layers.*` records.

## Validate

Run the schema validator from the repository root:

```bash
npm ci
npm test
```

Build the documentation separately:

```bash
npm --prefix docs ci
npm --prefix docs run build
```

The validator parses every `pub.layers.*` lexicon, registers the complete family, and checks that all references resolve.

## Contributing

Open an [issue](https://github.com/layers-pub/layers/issues) for a concrete defect or proposal. Use [discussions](https://github.com/layers-pub/layers/discussions) for schema design and interoperability questions.

## License

Licensed under [CC-BY-SA-4.0](LICENSE).
