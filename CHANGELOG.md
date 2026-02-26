# Changelog

All notable changes to the Layers lexicon schemas will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [0.3.0] — 2026-02-26

### Added

- `annotationDesign` object type on `corpus` for annotation project design metadata: annotator assignment, adjudication, and quality criteria.
- `redundancySpec` object type for annotator-per-item count and assignment strategy (`random`, `round-robin`, `stratified`, `expertise-based`).
- `adjudicationSpec` object type for disagreement resolution method (`expert`, `majority-vote`, `unanimous`, `discussion`, `dawid-skene`, `automatic-merge`, `intersection`, `union`, `none`), with dedicated adjudicator flag and agreement threshold.
- `qualityCriterion` object type for acceptance criteria: metric (`cohens-kappa`, `fleiss-kappa`, `krippendorff-alpha`, `percent-agreement`, `f1`, `smatch`, `uas`, `las`, `correlation`), threshold, and evaluation scope (`item`, `layer`, `document`, `corpus`).
- `sourceMethodUri` / `sourceMethod` field on `annotationLayer` for per-layer annotation source tracking (`manual-native`, `manual-corrected`, `automatic`, `automatic-corrected`, `converted`, `converted-corrected`, `crowd-sourced`), following UD's per-layer annotation source convention.
- Annotation Design guide with composability table across 8 project types.

## [0.2.0] — 2026-02-26

### Added

- `measureType` / `measureTypeUri` field on `experimentDef` for what property or behavior is measured, with known values: `acceptability`, `inference`, `similarity`, `plausibility`, `comprehension`, `preference`, `extraction`, `reading-time`, `production`, `custom`.
- `presentationSpec` object type for stimulus display method (RSVP, self-paced, whole-sentence, auditory, visual-world, masked-priming, cross-modal, naturalistic, gating, maze, boundary, moving-window), with chunking, timing, and masking parameters.
- `recordingMethod` object type for data capture instruments: behavioral input devices (`button-box`, `keyboard`, `mouse-click`, `touchscreen`, `voice`) and physiological instruments (`eeg`, `meg`, `fmri`, `fnirs`, `eye-tracking`, `pupillometry`, `mouse-tracking`, `emg`, `skin-conductance`, `ecog`).
- `presentation` field on `experimentDef` referencing `presentationSpec`.
- `recordingMethods` array field on `experimentDef` for multiple simultaneous recording instruments.
- Stimulus Presentation and Recording Methods sections in the Judgment Data guide.
- Composability table showing how four orthogonal dimensions combine across 20 experimental paradigms.

### Changed

- **Breaking:** Split `experimentDef.taskType` into two orthogonal fields: `measureType` (what is measured) and `taskType` (response instrument only). Former `taskType` values `acceptability`, `ranking`, `pairwise-comparison`, `best-worst-scaling` are removed; `scalar` and `ordinal` are unified as `ordinal-scale`.
- **Breaking:** Renamed `experimentDesign.presentationMode` / `presentationModeUri` to `itemOrder` / `itemOrderUri` to distinguish item sequencing from stimulus display method.
- Updated `taskType` known values to: `forced-choice`, `multi-select`, `ordinal-scale`, `magnitude`, `binary`, `categorical`, `free-text`, `cloze`, `span-labeling`, `custom`.

### Removed

- `rankValue` field from `judgment` object (use `scalarValue` for rank positions).

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
