# Changelog

All notable changes to the Layers lexicon schemas will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [0.8.0] - 2026-06-22

### Added

- Shared licensing model: `pub.layers.defs#licensing` (dual and multi licensing via an SPDX license `expression` plus a structured `licenseRef[]` array with component `appliesTo`) and `pub.layers.defs#licenseRef` (`spdx`/`spdxUri` URI+slug pair, `name`, `url`, `attribution`, `notes`). Mirrors a DataCite rightsList.
- Structured bibliographic citation: `pub.layers.eprint.defs#citation` (a raw formatted string and/or structured fields following CSL-JSON and DataCite), `pub.layers.eprint.defs#creator` (CSL name parts, DataCite `nameType`/`affiliation`, and ORCID/ROR/OpenAlex grounding via `agent`/`knowledgeRef`), and `pub.layers.eprint.defs#date` (a CSL-style date).
- Flat `licensing` and always-array `eprintRefs` on every top-level produce: corpus, ontology, resource.collection, judgment.experimentDef, annotation.annotationLayer, annotation.clusterSet, segmentation, alignment, media, graph.graphEdgeSet. The expression record gains `eprintRefs`; the persona record gains `licensing`.
- `reproducibility` (the shared `pub.layers.defs#reproducibilityInfo`) on data-producing produces: corpus, judgment.experimentDef, annotation.annotationLayer, annotation.clusterSet, segmentation, alignment, graph.graphEdgeSet.
- `knowledgeRef.source` known values `orcid`, `ror`, `openalex`, `crossref`, `dblp`, `semantic-scholar` for bibliographic and identity grounding.
- Six `pub.layers.auth*` OAuth permission-set lexicons: authReadOnly, authAnnotator, authExperimenter, authCorpusManager, authOntologyEditor, authFull.
- `pub.layers.integration` appview method lexicons: `applyLens`, `getExternal`, `listExternal`.
- Cross-app transform layer: vendored third-party app lexicons under `foreign/` (beaconbits, cosmik, dropanchor, grain, greengale, idiolect, leaflet, mapped, margin, site-standard, streamplace, tangled, voxport) and hand-authored panproto lens specs under `lenses/` that map their records into Layers.
- Upstream format theory and lens modules under `upstream/` (AMR, CHILDES, PMB, UCCA, UDS, UMR) for converting established annotation corpora into Layers.
- Expanded integration documentation, including a new CSL-JSON, BibTeX, and DataCite citation-interchange reference.

### Changed (Breaking)

- `pub.layers.corpus.corpus.license` (free string) is replaced by `licensing` (`pub.layers.defs#licensing`).
- `pub.layers.expression.expression.eprintRef` (single at-uri) is replaced by `eprintRefs` (array of at-uri). All eprint references are now arrays.
- `pub.layers.eprint.eprint.citation` (free string) is replaced by a ref to `pub.layers.eprint.defs#citation`; `platformEprintRef` (single) is replaced by `platformEprintRefs` (array).
- `reproducibilityInfo` moves from `pub.layers.eprint.defs` to `pub.layers.defs`; `pub.layers.eprint.dataLink.reproducibility` now references it there.
- Singular `language` fields are replaced by `languages` (arrays of BCP-47 tags) across records, including corpus, expression, resource.collection, the annotation layers, and media.

## [0.7.0] - 2026-06-10

### Added

- `guidelinesFormat` optional field on `pub.layers.persona.persona` and `pub.layers.judgment.experimentDef` (`knownValues`: `plain`, `html`, `markdown`), so consumers can render guideline text safely without content sniffing. Defaults to `plain` when omitted.

### Changed

- `pub.layers.defs#annotationMetadata.digest` now specifies a `<algorithm>:<lowercase-hex>` convention (e.g. `sha256:9f86d081...`); sha256 is recommended and verifiers dispatch on the algorithm prefix. `maxLength` raised from 128 to 160 to fit prefixed digests (a backward-compatible constraint widening).
- Corrected `foundations/primitives.md` to match the lexicons: `feature.value` is a `string` (max 4096) and `featureMap` uses an `entries` array; `agentRef` carries only producer identity (`did`/`id`/`name`/`knowledgeRef`); `annotationMetadata` requires `tool` and uses `personaRef` plus a string `digest`.
- Corrected `featureMap` examples across the judgment-data, knowledge-grounding, and psycholinguistic-data guides to the `entries` array of string-valued features.
- Added a recommended anonymized crowd-worker id convention (salted keyed hash) to the judgment-data guide.
- Updated the `defs`, `judgment`, and `persona` lexicon reference docs for the `digest` convention and the `guidelinesFormat` field.
- Comprehensive accuracy audit of all 71 documentation pages against the lexicons, correcting 188 verified discrepancies across 54 files: stale field names (e.g. `record.lang` -> `language`, `segmentation`/`sourceUrl` -> `expression`/`tokenizationId`), wrong types and scales (confidence is an integer 0-1000, not a 0-1 float), incorrect `knownValues` (uppercase/underscore link types corrected to kebab-case; non-existent enum members removed), the `anchor` primitive's true polymorphic shape, and out-of-date counts and cross-references.

## [0.6.0] - 2026-03-19

### Changed

- **Breaking:** Switch `pub.layers.defs#span` and `pub.layers.defs#textPositionSelector` from character offsets to UTF-8 byte offsets. Required fields are now `byteStart`/`byteEnd`; optional `charStart`/`charEnd` fields added for compatibility with character-offset datasets.
- Update `pub.layers.segmentation.defs#token.textSpan` description to reference byte offsets.
- Update `pub.layers.expression.expression#text` description to reference byte offsets.
- Update all integration data model docs (BRAT, CoNLL-U, NAF, NIF, UIMA, LAF/GrAF, PAULA, W3C Web Annotation, Concrete) to reflect byte-offset field names.
- Update guides (multimodal annotation, judgment data, psycholinguistic data) with byte-offset examples.
- Update appview plan docs (firehose ingestion, indexing strategy) with byte-offset validation rules and queries.

## [0.5.0] - 2026-03-03

### Added

- `pub.layers.changelog` namespace for structured change tracking across all Layers record types.
  - `pub.layers.changelog.entry` record type with subject targeting (any `pub.layers.*` record), categorized change sections, and optional semantic versioning.
  - `pub.layers.changelog.defs` with shared object types: `semanticVersion`, `changeSection`, `changeItem`.
  - `changeItem.targets` uses `objectRef` for machine-readable sub-record targeting (e.g., a specific annotation within a layer, a specific typeDef within an ontology).
  - `changeItem.fieldPath` for field-level change tracking within targeted objects.
  - 14 change categories: `annotations`, `segmentation`, `text`, `ontology`, `corpus`, `alignment`, `graph`, `experiment`, `resource`, `media`, `provenance`, `references`, `corrections`, `other`.
  - 5 change types: `added`, `changed`, `removed`, `fixed`, `deprecated`.
  - XRPC queries: `getEntry`, `listEntries` (by subject record), `listByCollection` (by collection NSID).
- Comprehensive AppView Plans documentation (13 pages): technology stack, database design, firehose ingestion, indexing strategy, API design, query and discovery, background jobs, caching strategy, observability, testing strategy, deployment, security, and plugin system.
- Seams.so ATProto ecosystem integration documentation.

### Changed

- Updated XRPC query count from 25 to 26 record types across all documentation.
- Updated lexicon namespace count from 13 to 14 across all documentation.

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
