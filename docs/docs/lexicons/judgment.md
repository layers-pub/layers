---
sidebar_label: "Judgment"
---

# pub.layers.judgment

Linguistic judgment records for annotation experiments, crowdsourced judgments, and inter-annotator agreement. Inspired by bead's framework for constructing, deploying, and analyzing large-scale linguistic judgment experiments.

## Types

### experimentDef
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
| `ontologyRef` | at-uri | Reference to the ontology used. |
| `personaRef` | at-uri | Reference to the persona defining the annotation framework. |
| `corpusRef` | at-uri | Reference to the corpus. |
| `templateRefs` | array | References to pub.layers.resource#template records used to generate stimuli. Array of at-uri |
| `collectionRefs` | array | References to pub.layers.resource#collection records providing filler pools. Array of at-uri |
| `presentation` | ref | How stimuli are displayed to participants. Ref: `#presentationSpec` |
| `recordingMethods` | array | Data capture instruments used in this experiment. Array of ref: `#recordingMethod` |
| `design` | ref | Experiment design specification (list constraints, distribution, item order). Ref: `#experimentDesign` |
| `scaleMin` | integer | Minimum scale value for ordinal-scale judgments. |
| `scaleMax` | integer | Maximum scale value. |
| `labels` | array | Available labels for categorical judgments. Array of strings |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### judgmentSet
**Type:** Record

A set of judgments from a single annotator for an experiment.

| Field | Type | Description |
|-------|------|-------------|
| `experimentRef` | at-uri | Reference to the experiment. |
| `agent` | ref | The agent who produced this judgment set. Ref: `pub.layers.defs#agentRef` |
| `judgments` | array | The judgments. Array of ref: `#judgment` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features (e.g., annotator demographics, session metadata, completion time). Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### judgment
**Type:** Object

A single judgment about a linguistic item.

| Field | Type | Description |
|-------|------|-------------|
| `item` | ref | Reference to the item being judged. Ref: `pub.layers.defs#objectRef` |
| `fillingRef` | at-uri | Reference to the pub.layers.resource#filling that generated the item being judged. |
| `categoricalValue` | string | Categorical judgment label. |
| `scalarValue` | integer | Numeric response value (ordinal-scale rating, magnitude estimate, or rank position). |
| `textSpan` | ref | Selected text span for span-labeling tasks. Ref: `pub.layers.defs#span` |
| `freeText` | string | Free-text response. |
| `responseTimeMs` | integer | Response time in milliseconds. |
| `confidence` | integer | Confidence score 0-10000. |
| `behavioralData` | ref | Behavioral analytics (e.g., mouse movements, keystroke patterns, eye tracking). Ref: `pub.layers.defs#featureMap` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### experimentDesign
**Type:** Object

Experiment design specification controlling how items are distributed, ordered, and timed.

| Field | Type | Description |
|-------|------|-------------|
| `listConstraints` | array | Constraints on how items are distributed into lists. Array of ref: `#listConstraint` |
| `distributionStrategyUri` | at-uri | AT-URI of the distribution strategy definition node. Community-expandable via knowledge graph. |
| `distributionStrategy` | string | Distribution strategy slug (fallback). Known values: `latin-square`, `random`, `blocked`, `stratified`, `custom` |
| `itemOrderUri` | at-uri | AT-URI of the item order definition node. Community-expandable via knowledge graph. |
| `itemOrder` | string | How items are ordered within a list (fallback). Known values: `random-order`, `fixed-order`, `blocked`, `adaptive`, `custom` |
| `timingMs` | integer | Time limit per item in milliseconds, if applicable. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### listConstraint
**Type:** Object

A constraint on how experimental items are distributed into lists (e.g., Latin square balancing, no two items of the same condition adjacent).

| Field | Type | Description |
|-------|------|-------------|
| `kindUri` | at-uri | AT-URI of the constraint kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Constraint kind slug (fallback). Known values: `latin-square`, `no-adjacent-same-condition`, `balanced-frequency`, `min-distance`, `custom` |
| `targetProperty` | string | The property being constrained (e.g., 'condition', 'verb-type', 'length'). |
| `parameters` | ref | Ref: `pub.layers.defs#featureMap` |
| `constraint` | ref | Formal constraint expression. Ref: `pub.layers.defs#constraint` |

### presentationSpec
**Type:** Object

How stimuli are displayed to participants.

| Field | Type | Description |
|-------|------|-------------|
| `methodUri` | at-uri | AT-URI of the presentation method definition node. Community-expandable via knowledge graph. |
| `method` | string | Presentation method (fallback). Known values: `rsvp`, `self-paced`, `whole-sentence`, `auditory`, `visual-world`, `masked-priming`, `cross-modal`, `naturalistic`, `gating`, `maze`, `boundary`, `moving-window`, `custom` |
| `chunkingUnit` | string | How text is segmented for incremental presentation. Known values: `word`, `character`, `morpheme`, `phrase`, `sentence`, `region`, `custom` |
| `timingMs` | integer | Per-chunk display duration in milliseconds. |
| `isiMs` | integer | Inter-stimulus interval in milliseconds. |
| `cumulative` | boolean | Whether previous chunks remain visible during incremental presentation. |
| `maskChar` | string | Masking character for non-cumulative displays (e.g., '-', '#'). |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### recordingMethod
**Type:** Object

A data capture instrument used in an experiment.

| Field | Type | Description |
|-------|------|-------------|
| `methodUri` | at-uri | AT-URI of the recording method definition node. Community-expandable via knowledge graph. |
| `method` | string | Recording method (fallback). Known values: `button-box`, `keyboard`, `mouse-click`, `touchscreen`, `voice`, `eeg`, `meg`, `fmri`, `fnirs`, `eye-tracking`, `pupillometry`, `mouse-tracking`, `emg`, `skin-conductance`, `ecog`, `custom` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### agreementReport
**Type:** Record

An inter-annotator agreement report summarizing agreement metrics across judgment sets.

| Field | Type | Description |
|-------|------|-------------|
| `experimentRef` | at-uri | Reference to the experiment. |
| `judgmentSetRefs` | array | The judgment sets compared. Array of at-uri |
| `metricUri` | at-uri | AT-URI of the metric definition node. Community-expandable via knowledge graph. |
| `metric` | string | Metric slug (fallback). Known values: `cohens-kappa`, `fleiss-kappa`, `krippendorff-alpha`, `percent-agreement`, `correlation`, `f1`, `custom` |
| `value` | integer | Metric value scaled 0-10000. |
| `numAnnotators` | integer | Number of annotators. |
| `numItems` | integer | Number of items judged. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |
