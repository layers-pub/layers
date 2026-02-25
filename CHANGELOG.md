# Changelog

All notable changes to the Layers lexicon schemas will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-02-23

### Added

- Initial draft of 15 ATProto lexicon schemas under `pub.layers.*` namespace.
- Core primitives: `objectRef`, `anchor`, `constraint`, `agentRef`, `knowledgeRef`, `featureMap`, `annotationMetadata` (`pub.layers.defs`).
- Document model with text, metadata, and source tracking (`pub.layers.communication`).
- Corpus collections with membership records (`pub.layers.corpus`).
- Segmentation bindings linking structure to communications (`pub.layers.segmentation`).
- Structural elements: sections, sentences, tokens, tokenizations (`pub.layers.structure`).
- Annotation type systems with role slots and inheritance (`pub.layers.ontology`).
- Unified annotation model with layers, clusters, and multi-modal anchoring (`pub.layers.annotation`).
- Linguistic judgment experiments with scales and items (`pub.layers.judgment`).
- Parallel structure alignment with typed links (`pub.layers.alignment`).
- Lexical resources: entries, templates, slots, fillings, collections (`pub.layers.resource`).
- Media metadata for audio, video, and images (`pub.layers.media`).
- Annotator personas and annotation frameworks (`pub.layers.persona`).
- Knowledge graph integration with typed relations (`pub.layers.graph`).
- Chive eprint integration (`pub.layers.chive`).
- General eprint linkage (`pub.layers.eprint`).
- URI+slug flexible enum pattern across all kind/subkind fields.
- Docusaurus documentation site with lexicon reference, design principles, and subsumption analysis.
- Minimal landing page for layers.pub.
