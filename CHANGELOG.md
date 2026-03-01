# Changelog

All notable changes to the Layers lexicon schemas will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [0.4.0] - 2026-03-01

### Changed

- **Breaking:** Restructured all lexicons into directory-based NSIDs for ATProto compliance. Each record type is now its own lexicon file with the record as the `main` def. Shared object types moved to namespace `defs.json` files.
  - `pub.layers.expression` → `pub.layers.expression.expression`
  - `pub.layers.annotation` → `pub.layers.annotation.annotationLayer`, `pub.layers.annotation.clusterSet`
  - `pub.layers.corpus` → `pub.layers.corpus.corpus`, `pub.layers.corpus.membership`
  - `pub.layers.ontology` → `pub.layers.ontology.ontology`, `pub.layers.ontology.typeDef`
  - `pub.layers.resource` → `pub.layers.resource.entry`, `pub.layers.resource.collection`, `pub.layers.resource.collectionMembership`, `pub.layers.resource.template`, `pub.layers.resource.filling`, `pub.layers.resource.templateComposition`
  - `pub.layers.judgment` → `pub.layers.judgment.experimentDef`, `pub.layers.judgment.judgmentSet`, `pub.layers.judgment.agreementReport`
  - `pub.layers.graph` → `pub.layers.graph.graphNode`, `pub.layers.graph.graphEdge`, `pub.layers.graph.graphEdgeSet`
  - `pub.layers.eprint` → `pub.layers.eprint.eprint`, `pub.layers.eprint.dataLink`
  - `pub.layers.segmentation` → `pub.layers.segmentation.segmentation`
  - `pub.layers.alignment` → `pub.layers.alignment.alignment`
  - `pub.layers.media` → `pub.layers.media.media`
  - `pub.layers.persona` → `pub.layers.persona.persona`
- **Breaking:** All cross-file `#localRef` references updated to fully qualified `pub.layers.<ns>.defs#name` form.
- **Breaking:** Simplified `pub.layers.segmentation` to tokenization-only. Removed `section`, `sentence`, `sectionWithSentences`, and `sentenceWithTokenizations` types from `pub.layers.segmentation.defs`. Structural hierarchy (sections, sentences, paragraphs) is now expressed via expression records with `parentRef`. Added `expressionRef` field on `tokenization` to scope tokenizations to specific sub-expressions.
- **Breaking:** Changed confidence and agreement metric scales from 0-10000 to 0-1000 across all lexicons (`annotation.defs`, `defs`, `graph.graphEdge`, `graph.defs`, `corpus.defs`, `judgment.defs`, `judgment.agreementReport`).

### Added

- XRPC query lexicons for all 25 record types: `get<Record>` and `list<Records>` queries with domain-specific filter parameters.
- Namespace `defs.json` files for shared object types in: annotation, corpus, eprint, graph, judgment, media, ontology, resource, segmentation.


## [0.3.0] - 2026-02-26

### Added

- `annotationDesign` object type on `corpus` for annotation project design metadata: annotator assignment, adjudication, and quality criteria.
- `redundancySpec` object type for annotator-per-item count and assignment strategy (`random`, `round-robin`, `stratified`, `expertise-based`).
- `adjudicationSpec` object type for disagreement resolution method (`expert`, `majority-vote`, `unanimous`, `discussion`, `dawid-skene`, `automatic-merge`, `intersection`, `union`, `none`), with dedicated adjudicator flag and agreement threshold.
- `qualityCriterion` object type for acceptance criteria: metric (`cohens-kappa`, `fleiss-kappa`, `krippendorff-alpha`, `percent-agreement`, `f1`, `smatch`, `uas`, `las`, `correlation`), threshold, and evaluation scope (`item`, `layer`, `document`, `corpus`).
- `sourceMethodUri` / `sourceMethod` field on `annotationLayer` for per-layer annotation source tracking (`manual-native`, `manual-corrected`, `automatic`, `automatic-corrected`, `converted`, `converted-corrected`, `crowd-sourced`), following UD's per-layer annotation source convention.
- Annotation Design guide with composability table across 8 project types.

## [0.2.0] - 2026-02-26

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

## [0.1.0] - 2026-02-23

### Added

- Initial draft of 15 ATProto lexicon schemas under `pub.layers.*` namespace.
- Core primitives: `objectRef`, `anchor`, `constraint`, `agentRef`, `knowledgeRef`, `featureMap`, `annotationMetadata` (`pub.layers.defs`).
- Document model with text, metadata, and source tracking (`pub.layers.communication`).
- Corpus collections with membership records (`pub.layers.corpus`).
- Tokenization strategies and token sequences (`pub.layers.segmentation`).
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
