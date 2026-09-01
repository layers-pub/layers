---
sidebar_label: "Judgment"
---

# pub.layers.judgment

The record `main`s declare `key: any` (Scheme A): rkeys may be arbitrary strings rather than TIDs. An `experimentDef` is a type-level protocol; the token event that runs it is a [`pub.layers.acquisition.session`](./acquisition.md), which links back via `session.experimentRef`. Neural, eye-tracking, and other instrument data captured during a judgment task live in [`pub.layers.media`](./media.md) signal records placed on the session clock.

Linguistic judgment records for annotation experiments, crowdsourced judgments, and inter-annotator agreement. Inspired by bead's framework for constructing, deploying, and analyzing large-scale linguistic judgment experiments.

## Types

### experimentDef
**NSID:** `pub.layers.judgment.experimentDef`
**Type:** Record

Definition of an annotation or judgment experiment.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Experiment name. |
| `description` | string | Detailed description. |
| `measureTypeUri` | at-uri | AT-URI of the measure type definition node. Community-expandable via knowledge graph. |
| `measureType` | string | What property or behavior is being measured (fallback). Known values: `acceptability`, `inference`, `similarity`, `plausibility`, `comprehension`, `preference`, `extraction`, `reading-time`, `production`, `custom` |
| `taskTypeUri` | at-uri | AT-URI of the response instrument definition node. Community-expandable via knowledge graph. |
| `taskType` | string | Response instrument: how the response is collected (fallback). Known values: `forced-choice`, `multi-select`, `ordinal-scale`, `magnitude`, `binary`, `categorical`, `free-text`, `cloze`, `span-labeling`, `custom` |
| `guidelines` | string | Task guidelines and instructions. |
| `guidelinesFormat` | string | Format of the guidelines text, so consumers can render it safely without sniffing. Defaults to `plain` when omitted. Known values: `plain`, `html`, `markdown` |
| `ontologyRef` | at-uri | Reference to the ontology used. |
| `personaRef` | at-uri | Reference to the persona defining the annotation framework. |
| `corpusRef` | at-uri | Reference to the corpus. |
| `templateRefs` | array | References to `pub.layers.resource.template` records used to generate stimuli. Array of at-uri |
| `collectionRefs` | array | References to `pub.layers.resource.collection` records providing filler pools. Array of at-uri |
| `presentation` | ref | How stimuli are displayed to participants. Ref: `pub.layers.judgment.defs#presentationSpec` |
| `recordingMethods` | array | Data capture instruments used in this experiment. Array of ref: `pub.layers.judgment.defs#recordingMethod` |
| `design` | ref | Experiment design specification (list constraints, distribution, item order). Ref: `pub.layers.judgment.defs#experimentDesign` |
| `scaleMin` | integer | Minimum scale value for ordinal-scale judgments. |
| `scaleMax` | integer | Maximum scale value. |
| `labels` | array | Available labels for categorical judgments. Array of strings |
| `stimulusExpressionRefs` | array | References to `pub.layers.expression.expression` records used as stimuli (text stimuli). Array of at-uri |
| `stimulusMediaRefs` | array | References to `pub.layers.media.media` records used as stimuli (audio, video, image, signal, and other carrier stimuli). Array of at-uri |
| `languages` | array | BCP-47 language tags of the stimuli. Empty when unspecified. Array of strings (item max 32). No array-level cap. |
| `languageRefs` | array | Grounded language references for the stimuli, carrying canonical BCP-47 tag, script/region codes, variety label, and a knowledge-graph source (glottolog, iso639-3, cldr). Use both. Array of ref: `pub.layers.defs#languageRef` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `licensing` | ref | Licensing terms governing this experiment definition (supports dual/multi/component licensing). Ref: `pub.layers.defs#licensing` |
| `eprintRefs` | array | Eprint records (papers/preprints) describing or associated with this experiment. Array of at-uri (max 64) |
| `reproducibility` | ref | How this experiment dataset was produced (code, commit, command, environment, seed). Ref: `pub.layers.defs#reproducibilityInfo` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

Stimuli split into two type-discriminated arrays (`stimulusExpressionRefs` for text, `stimulusMediaRefs` for carriers) rather than one polymorphic ref, so a renderer dispatches on the array without resolving each AT-URI.

### judgmentSet
**NSID:** `pub.layers.judgment.judgmentSet`
**Type:** Record

A set of judgments from a single annotator for an experiment.

| Field | Type | Description |
|-------|------|-------------|
| `experimentRef` | at-uri | Reference to the experiment. |
| `agent` | ref | The agent who produced this judgment set. Ref: `pub.layers.defs#agentRef` |
| `judgments` | array | The judgments. Array of ref: `pub.layers.judgment.defs#judgment` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features (e.g., annotator demographics, session metadata, completion time). Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### judgment
**NSID:** `pub.layers.judgment.defs#judgment`
**Type:** Object

A single judgment about a linguistic item.

| Field | Type | Description |
|-------|------|-------------|
| `item` | ref | Reference to the item being judged. Ref: `pub.layers.defs#objectRef` |
| `fillingRef` | at-uri | Reference to the `pub.layers.resource.filling` that generated the item being judged. |
| `categoricalValue` | string | Categorical judgment label. |
| `scalarValue` | integer | Numeric response value (ordinal-scale rating, magnitude estimate, or rank position). |
| `textSpan` | ref | Selected text span for span-labeling tasks. Ref: `pub.layers.defs#span` |
| `freeText` | string | Free-text response. |
| `responseTimeMs` | integer | Response time in milliseconds. |
| `confidence` | integer | Confidence score 0-1000. |
| `behavioralData` | ref | Behavioral analytics (e.g., mouse movements, keystroke patterns, eye tracking). Ref: `pub.layers.defs#featureMap` |
| `regionResponses` | array | Per-region reading-time and eye-movement measures for incremental-presentation tasks (self-paced reading, eye-tracking-while-reading, maze), one entry per region. Array of ref: `pub.layers.judgment.defs#regionResponse` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### experimentDesign
**NSID:** `pub.layers.judgment.defs#experimentDesign`
**Type:** Object

Experiment design specification controlling how items are distributed, ordered, and timed.

| Field | Type | Description |
|-------|------|-------------|
| `listConstraints` | array | Constraints on how items are distributed into lists. Array of ref: `pub.layers.judgment.defs#listConstraint` |
| `distributionStrategyUri` | at-uri | AT-URI of the distribution strategy definition node. Community-expandable via knowledge graph. |
| `distributionStrategy` | string | Distribution strategy slug (fallback). Known values: `latin-square`, `random`, `blocked`, `stratified`, `custom` |
| `itemOrderUri` | at-uri | AT-URI of the item order definition node. Community-expandable via knowledge graph. |
| `itemOrder` | string | How items are ordered within a list (fallback). Known values: `random-order`, `fixed-order`, `blocked`, `adaptive`, `custom` |
| `timingMs` | integer | Time limit per item in milliseconds, if applicable. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### listConstraint
**NSID:** `pub.layers.judgment.defs#listConstraint`
**Type:** Object

A constraint on how experimental items are distributed into lists (e.g., Latin square balancing, no two items of the same condition adjacent).

| Field | Type | Description |
|-------|------|-------------|
| `kindUri` | at-uri | AT-URI of the constraint kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Constraint kind slug (fallback). Known values: `latin-square`, `no-adjacent-same-condition`, `balanced-frequency`, `minimum-distance`, `custom` |
| `targetProperty` | string | The property being constrained (e.g., 'condition', 'verb-type', 'length'). |
| `parameters` | ref | Ref: `pub.layers.defs#featureMap` |
| `constraint` | ref | Formal constraint expression. Ref: `pub.layers.defs#constraint` |

### presentationSpec
**NSID:** `pub.layers.judgment.defs#presentationSpec`
**Type:** Object

How stimuli are displayed to participants.

| Field | Type | Description |
|-------|------|-------------|
| `methodUri` | at-uri | AT-URI of the presentation method definition node. Community-expandable via knowledge graph. |
| `method` | string | Presentation method (fallback). Known values: `rsvp`, `self-paced`, `whole-sentence`, `auditory`, `visual-world`, `masked-priming`, `cross-modal`, `naturalistic`, `gating`, `maze`, `boundary`, `moving-window`, `custom` |
| `chunkingUnitUri` | at-uri | AT-URI of the chunking unit definition node. Community-expandable via knowledge graph. |
| `chunkingUnit` | string | How text is segmented for incremental presentation (fallback when chunkingUnitUri unavailable). Known values: `word`, `character`, `morpheme`, `phrase`, `clause`, `sentence`, `region`, `sign`, `gesture-phrase`, `custom` |
| `timingMs` | integer | Per-chunk display duration in milliseconds. |
| `isiMs` | integer | Inter-stimulus interval in milliseconds. |
| `cumulative` | boolean | Whether previous chunks remain visible during incremental presentation. |
| `maskChar` | string | Masking character for non-cumulative displays (e.g., '-', '#'). |
| `screenWidthPx` / `screenHeightPx` | integer | Display width and height in pixels. |
| `screenWidthMm` / `screenHeightMm` | integer | Physical display width and height in millimeters. |
| `viewingDistanceMm` | integer | Participant eye-to-screen distance in millimeters. |
| `refreshRateMilliHz` | integer | Display refresh rate in millihertz (e.g., 60000 for 60 Hz). |
| `pixelsPerDegree` | integer | Pixels subtending one degree of visual angle at the stated viewing distance. |
| `sessionRef` | at-uri | AT-URI of the `pub.layers.acquisition.session` whose clock and setup this presentation was delivered under. |
| `participantRefs` | array | AT-URIs of `pub.layers.acquisition.participant` records presented under this specification. Array of at-uri |
| `mediaRefs` | array | AT-URIs of `pub.layers.media.media` records delivered as stimuli under this specification. Array of at-uri |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

The screen-geometry fields are what gaze-on-screen eye-tracking requires (a pixel gaze sample means nothing without screen size, viewing distance, and pixels-per-degree); BIDS keeps them in the events sidecar `StimulusPresentation` object.

### regionResponse
**NSID:** `pub.layers.judgment.defs#regionResponse`
**Type:** Object

A per-region reading-time or response record, for self-paced reading, eye-tracking-while-reading, and maze tasks. Carries the standard eye-movement measures and a region-role axis (`critical`, `spillover`, `precritical`) for analysis. Required: `region`.

| Field | Type | Description |
|-------|------|-------------|
| `region` | ref | Reference to the region being measured. Use `recordRef` for the stimulus record, `objectId` for a specific region object within it. Ref: `pub.layers.defs#objectRef` |
| `regionIndex` | integer | Zero-indexed position of this region within the stimulus presentation order. |
| `regionRoleUri` / `regionRole` | at-uri / string | Analysis role of this region. Known values: `critical`, `spillover`, `precritical`, `pretarget`, `target`, `posttarget`, `filler`, `custom`. |
| `readingTimeMs` | integer | Total reading time on this region. |
| `firstFixationMs` | integer | First-fixation duration on this region. |
| `gazeDurationMs` | integer | Gaze (first-pass) duration on this region. |
| `goPastMs` | integer | Go-past (regression-path) duration on this region. |
| `totalTimeMs` | integer | Total dwell time across all fixations on this region. |
| `regressionsOut` / `regressionsIn` | integer | Count of regressions launched out of / landing in this region. |
| `fixationCount` | integer | Number of fixations on this region. |
| `responseTimeMs` | integer | Response time for a per-region response task (maze, grammaticality-at-region). |
| `scalarValue` | integer | Numeric per-region response value (e.g., rating at this region). |
| `categoricalValue` | string | Categorical per-region response label. |
| `features` | ref | Open key-value map for per-region measures not covered by the named fields. Ref: `pub.layers.defs#featureMap` |

### recordingMethod
**NSID:** `pub.layers.judgment.defs#recordingMethod`
**Type:** Object

A data capture instrument used in an experiment. `methodUri` resolves into the shared `modality` node set in `layers-acquisition.ontology.layers.pub`, the same nodes backing `media.signalInfo.modalityUri` and `catalog.contentSummary.modalityUri`, so an instrument named in a protocol joins the recording it produced and the catalogue entry advertising it.

| Field | Type | Description |
|-------|------|-------------|
| `methodUri` | at-uri | AT-URI of the recording method definition node, resolving into the shared modality node set. Community-expandable via knowledge graph. |
| `method` | string | Recording method (fallback). Known values: `button-box`, `keyboard`, `mouse-click`, `touchscreen`, `voice`, `eeg`, `meg`, `fmri`, `fnirs`, `eye-tracking`, `pupillometry`, `mouse-tracking`, `emg`, `skin-conductance`, `ecog`, `custom` |
| `sessionRef` | at-uri | AT-URI of the `pub.layers.acquisition.session` whose clock this recording was captured on. |
| `participantRefs` | array | AT-URIs of `pub.layers.acquisition.participant` records this recording captured. Array of at-uri |
| `mediaRefs` | array | AT-URIs of `pub.layers.media.media` records produced by this recording instrument. Array of at-uri |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### agreementReport
**NSID:** `pub.layers.judgment.agreementReport`
**Type:** Record

An inter-annotator agreement report summarizing agreement metrics across judgment sets.

| Field | Type | Description |
|-------|------|-------------|
| `experimentRef` | at-uri | Reference to the experiment. |
| `judgmentSetRefs` | array | The judgment sets compared. Array of at-uri |
| `metricUri` | at-uri | AT-URI of the metric definition node. Community-expandable via knowledge graph. |
| `metric` | string | Metric slug (fallback). Known values: `cohens-kappa`, `fleiss-kappa`, `krippendorff-alpha`, `percent-agreement`, `correlation`, `f1`, `custom` |
| `value` | integer | Metric value scaled 0-1000. |
| `numAnnotators` | integer | Number of annotators. |
| `numItems` | integer | Number of items judged. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

## XRPC Queries

### getExperimentDef
**NSID:** `pub.layers.judgment.getExperimentDef`

Retrieve a single experiment definition record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the experiment definition record. |

**Output**: The experiment definition record object.

### listExperimentDefs
**NSID:** `pub.layers.judgment.listExperimentDefs`

List experiment definition records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | at-identifier (required) | The handle or DID of the repository. |
| `measureType` | string | Filter by measure type. |
| `taskType` | string | Filter by task type. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: experimentDef[], cursor?: string }`

### getJudgmentSet
**NSID:** `pub.layers.judgment.getJudgmentSet`

Retrieve a single judgment set record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the judgment set record. |

**Output**: The judgment set record object.

### listJudgmentSets
**NSID:** `pub.layers.judgment.listJudgmentSets`

List judgment set records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `experimentRef` | at-uri (required) | The AT-URI of the experiment whose judgment sets to list. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: judgmentSet[], cursor?: string }`

### getAgreementReport
**NSID:** `pub.layers.judgment.getAgreementReport`

Retrieve a single agreement report record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the agreement report record. |

**Output**: The agreement report record object.

### listAgreementReports
**NSID:** `pub.layers.judgment.listAgreementReports`

List agreement report records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `experimentRef` | at-uri (required) | The AT-URI of the experiment whose agreement reports to list. |
| `metric` | string | Filter by metric slug. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: agreementReport[], cursor?: string }`
