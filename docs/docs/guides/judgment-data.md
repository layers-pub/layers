---
sidebar_label: "Judgment Data"
---

# Judgment Data

Layers represents the full lifecycle of linguistic judgment data, from experiment definition through stimulus construction, data collection, and agreement analysis. The [`pub.layers.judgment`](../lexicons/judgment.md) and [`pub.layers.resource`](../lexicons/resource.md) lexicons work together to support all major judgment paradigms used in psycholinguistics and computational linguistics.

## Four Orthogonal Dimensions

Following [bead](../integration/data-models/bead.md)'s design, every experiment definition can specify four independent fields:

**`measureType`**: What property or behavior is being measured.

**`taskType`**: What behavioral response instrument collects explicit responses. Omit for passive paradigms.

**`presentation`**: How stimuli are displayed (RSVP, self-paced, whole-sentence, auditory, etc.), including chunking and timing parameters.

**`recordingMethods`**: What instruments capture data (keyboard, button-box, EEG, eye-tracking, etc.). An experiment can use multiple simultaneous recording methods.

These are fully independent. An acceptability experiment can use an ordinal scale, a binary yes/no, or a magnitude estimate. The same RSVP presentation can be used with EEG, MEG, or behavioral-only recording. A preference experiment can use forced choice (pairwise comparison), multi-select (best-worst scaling), or ordinal scale (direct ranking). The measure type tells consumers what the data represents; the task type tells them how explicit responses were collected; the presentation tells them how stimuli were shown; the recording methods tell them what instruments captured data.

| Paradigm | `measureType` | `taskType` | `presentation.method` | `recordingMethods` |
|----------|---------------|------------|-----------------------|--------------------|
| Likert-scale acceptability rating | `acceptability` | `ordinal-scale` | `whole-sentence` | `keyboard` |
| Binary grammaticality judgment | `acceptability` | `binary` | `whole-sentence` | `button-box` |
| EEG + RSVP, passive reading | `acceptability` | | `rsvp` | `eeg` |
| EEG + RSVP + button press | `acceptability` | `binary` | `rsvp` | `eeg`, `button-box` |
| Self-paced reading | `reading-time` | | `self-paced` | `keyboard` |
| Eye-tracking natural reading | `reading-time` | | `whole-sentence` | `eye-tracking` |
| EEG + eye-tracking co-registration | `reading-time` | | `whole-sentence` | `eeg`, `eye-tracking` |
| fMRI + auditory narrative | `comprehension` | | `naturalistic` | `fmri` |
| Visual world paradigm | `comprehension` | | `visual-world` | `eye-tracking` |
| Masked priming + lexical decision + EEG | `similarity` | `binary` | `masked-priming` | `eeg`, `button-box` |
| Maze task | `reading-time` | `forced-choice` | `maze` | `keyboard` |
| NLI classification | `inference` | `categorical` | `whole-sentence` | `keyboard` |
| Pairwise translation comparison | `preference` | `forced-choice` | `whole-sentence` | `mouse-click` |
| Best-worst scaling for sentiment | `preference` | `multi-select` | `whole-sentence` | `mouse-click` |
| Semantic similarity rating | `similarity` | `ordinal-scale` | `whole-sentence` | `mouse-click` |
| Magnitude estimation | `acceptability` | `magnitude` | `whole-sentence` | `keyboard` |
| Cloze probability | `comprehension` | `cloze` | `whole-sentence` | `keyboard` |
| Named entity span annotation | `extraction` | `span-labeling` | `whole-sentence` | `mouse-click` |
| Sentence completion | `production` | `free-text` | `whole-sentence` | `keyboard` |
| MEG + auditory + passive listening | `comprehension` | | `auditory` | `meg` |

## Measure Types

The `measureType` field identifies what property or behavior is being measured.

| Value | Description |
|-------|-------------|
| `acceptability` | Linguistic acceptability, naturalness, or grammaticality |
| `inference` | Semantic relationship (entailment, contradiction, neutral) |
| `similarity` | Semantic similarity, distance, or relatedness |
| `plausibility` | Likelihood or plausibility of events or statements |
| `comprehension` | Understanding or recall of content |
| `preference` | Subjective preference between alternatives |
| `extraction` | Extracting structured information (labeled spans) from text |
| `reading-time` | Processing time per word or region (self-paced reading, eye tracking) |
| `production` | Language production (sentence completion, word generation) |

All values are community-expandable via `measureTypeUri`.

## Task Types (Response Instruments)

The `taskType` field identifies how responses are collected, independent of what is being measured.

### Ordinal Scale

Participants rate on a bounded discrete scale (Likert, slider). Responses go in `scalarValue`.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Naturalness rating study",
  "measureType": "acceptability",
  "taskType": "ordinal-scale",
  "scaleMin": 1,
  "scaleMax": 7,
  "guidelines": "Rate how natural the sentence sounds on a scale from 1 (very unnatural) to 7 (perfectly natural)..."
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/item-42" },
  "scalarValue": 5,
  "responseTimeMs": 1560
}
```

### Categorical

Participants choose a label from a fixed set of unordered categories. Responses go in `categoricalValue`.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Semantic relation classification",
  "measureType": "inference",
  "taskType": "categorical",
  "labels": ["cause", "effect", "precondition", "none"],
  "guidelines": "Select the relation that best describes how the two events are connected..."
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/pair-15" },
  "categoricalValue": "cause",
  "responseTimeMs": 2340,
  "confidence": 8000
}
```

### Forced Choice

Participants pick exactly one option from a small set (2AFC, NAFC). Responses go in `categoricalValue`. This is the instrument behind pairwise comparison experiments.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Translation quality comparison",
  "measureType": "preference",
  "taskType": "forced-choice",
  "labels": ["a", "b", "tie"],
  "guidelines": "Which translation better conveys the meaning of the source?"
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/pair-15" },
  "categoricalValue": "a",
  "responseTimeMs": 4200,
  "confidence": 7500
}
```

### Multi-Select

Participants pick one or more options from a set. Responses go in `behavioralData` features. This is the instrument behind best-worst scaling experiments.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Sentiment intensity BWS",
  "measureType": "preference",
  "taskType": "multi-select",
  "guidelines": "Select the sentence that conveys the MOST positive sentiment and the LEAST positive sentiment..."
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/tuple-8" },
  "behavioralData": {
    "features": [
      { "key": "best", "value": "item-a" },
      { "key": "worst", "value": "item-c" }
    ]
  },
  "responseTimeMs": 5100
}
```

### Binary

Participants give a yes/no response. Responses go in `categoricalValue`.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Grammaticality judgment",
  "measureType": "acceptability",
  "taskType": "binary",
  "labels": ["yes", "no"],
  "guidelines": "Is the following sentence grammatically acceptable?"
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/item-42" },
  "categoricalValue": "yes",
  "responseTimeMs": 980
}
```

### Free Text

Participants provide open-ended text responses. Responses go in `freeText`.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Paraphrase generation",
  "measureType": "similarity",
  "taskType": "free-text",
  "guidelines": "Write a paraphrase of the following sentence that preserves its meaning..."
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/item-42" },
  "freeText": "The mouse was chased by the cat through the garden",
  "responseTimeMs": 8450
}
```

### Span Labeling

Participants select and optionally label text regions. Responses go in `textSpan`.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Argument span identification",
  "measureType": "extraction",
  "taskType": "span-labeling",
  "guidelines": "Highlight the text span that answers: who performed the action?"
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/item-42" },
  "textSpan": { "start": 0, "end": 7 },
  "responseTimeMs": 3200
}
```

### Magnitude

Participants provide an unbounded numeric value (magnitude estimation). Responses go in `scalarValue`. Unlike ordinal-scale, there are no `scaleMin`/`scaleMax` bounds.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Magnitude estimation of naturalness",
  "measureType": "acceptability",
  "taskType": "magnitude",
  "guidelines": "Assign a number reflecting how natural the sentence sounds. Use any positive number; the reference sentence has a value of 100..."
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/item-42" },
  "scalarValue": 230,
  "responseTimeMs": 2100
}
```

### Cloze

Participants fill in blanks in a stimulus. Responses go in `freeText`.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Cloze probability estimation",
  "measureType": "comprehension",
  "taskType": "cloze",
  "guidelines": "Complete the sentence by filling in the blank with the first word that comes to mind..."
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/item-42" },
  "freeText": "dog",
  "responseTimeMs": 1200
}
```

## Stimulus Presentation

The `presentation` field on `experimentDef` specifies how individual stimuli are displayed to participants. This is independent of what is being measured, what response is collected, and what instruments record data.

### Presentation Methods

| Value | Description |
|-------|-------------|
| `rsvp` | Rapid Serial Visual Presentation: chunks shown one at a time at a fixed rate |
| `self-paced` | Participant controls advancement (button press to reveal next chunk) |
| `whole-sentence` | Entire stimulus displayed at once |
| `auditory` | Spoken stimulus (natural speech, synthesized, or rate-controlled) |
| `visual-world` | Visual scene displayed alongside auditory stimulus |
| `masked-priming` | Forward mask, brief prime, then target |
| `cross-modal` | Stimulus in one modality, probe in another (e.g., auditory sentence + visual word) |
| `naturalistic` | Extended narrative (audiobook, story) for continuous processing |
| `gating` | Incremental portions of a spoken word revealed in successive gates |
| `maze` | Two-alternative forced choice at each word position |
| `boundary` | Invisible boundary triggers parafoveal preview change during saccade |
| `moving-window` | Only a window around fixation is visible; rest is masked |

All values are community-expandable via `methodUri`.

### Chunking and Timing

For incremental presentation methods (RSVP, self-paced), additional fields control segmentation and timing:

```json
{
  "presentation": {
    "method": "rsvp",
    "chunkingUnit": "word",
    "timingMs": 300,
    "isiMs": 200,
    "cumulative": false
  }
}
```

```json
{
  "presentation": {
    "method": "self-paced",
    "chunkingUnit": "word",
    "cumulative": false,
    "maskChar": "-"
  }
}
```

| Field | Description |
|-------|-------------|
| `chunkingUnit` | How text is segmented: `word`, `character`, `morpheme`, `phrase`, `sentence`, `region`, `custom` |
| `timingMs` | Per-chunk display duration in milliseconds (for timed presentations like RSVP) |
| `isiMs` | Inter-stimulus interval in milliseconds |
| `cumulative` | Whether previous chunks remain visible (true for cumulative self-paced reading, false for non-cumulative) |
| `maskChar` | Masking character replacing hidden text (e.g., `-` for dashes, `#` for hashes) |
| `features` | Additional method-specific parameters (e.g., prime duration for masked priming, gate size for gating) |

## Recording Methods

The `recordingMethods` array on `experimentDef` declares what instruments capture data. An experiment can use multiple simultaneous recording methods (e.g., EEG + eye-tracking co-registration).

### Behavioral Input Devices

| Value | Description |
|-------|-------------|
| `button-box` | Dedicated response box (e.g., Cedrus, PST) with hardware-level timing |
| `keyboard` | Standard keyboard keypress |
| `mouse-click` | Mouse button click |
| `touchscreen` | Touchscreen tap |
| `voice` | Voice key or microphone onset detection |

### Physiological Instruments

| Value | Description |
|-------|-------------|
| `eeg` | Electroencephalography (scalp electrodes, ERPs) |
| `meg` | Magnetoencephalography |
| `fmri` | Functional magnetic resonance imaging |
| `fnirs` | Functional near-infrared spectroscopy |
| `eye-tracking` | Eye tracker (fixation-based reading measures, visual world) |
| `pupillometry` | Pupil diameter recording |
| `mouse-tracking` | Continuous mouse cursor trajectory |
| `emg` | Electromyography |
| `skin-conductance` | Galvanic skin response |
| `ecog` | Intracranial EEG / electrocorticography |

All values are community-expandable via `methodUri`. Detailed acquisition parameters (sample rate, channel count, montage) belong on `pub.layers.media` records, not the experiment definition. See the [Psycholinguistic Data guide](./psycholinguistic-data.md) for media record examples.

### Examples

EEG study with RSVP and a behavioral task:

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "N400 semantic violation study",
  "measureType": "acceptability",
  "taskType": "binary",
  "presentation": {
    "method": "rsvp",
    "chunkingUnit": "word",
    "timingMs": 300,
    "isiMs": 200,
    "cumulative": false
  },
  "recordingMethods": [
    { "method": "eeg" },
    { "method": "button-box" }
  ],
  "labels": ["acceptable", "unacceptable"],
  "guidelines": "After each sentence, press the left button if acceptable or the right button if unacceptable..."
}
```

Eye-tracking natural reading with no explicit task:

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Garden-path reading study",
  "measureType": "reading-time",
  "presentation": {
    "method": "whole-sentence"
  },
  "recordingMethods": [
    { "method": "eye-tracking" }
  ],
  "guidelines": "Read each sentence silently at your own pace..."
}
```

Self-paced reading:

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Garden-path SPR study",
  "measureType": "reading-time",
  "presentation": {
    "method": "self-paced",
    "chunkingUnit": "word",
    "cumulative": false,
    "maskChar": "-"
  },
  "recordingMethods": [
    { "method": "keyboard" }
  ],
  "guidelines": "Press the spacebar to reveal each word..."
}
```

fMRI with auditory narrative (passive):

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Narrative comprehension fMRI",
  "measureType": "comprehension",
  "presentation": {
    "method": "naturalistic"
  },
  "recordingMethods": [
    { "method": "fmri" }
  ],
  "guidelines": "Listen to the story and try to understand what is happening..."
}
```

## The Stimulus Pipeline

Layers provides a full pipeline from parameterized templates to materialized stimuli.

### Template Definition

A template contains text with `{slotName}` placeholders, plus slot definitions that constrain what can fill each position:

```json
{
  "$type": "pub.layers.resource#template",
  "name": "Transitive sentence template",
  "text": "{subject} {verb} {object} {adjunct}",
  "language": "en",
  "slots": [
    {
      "name": "subject",
      "required": true,
      "collectionRef": "at://did:plc:researcher/pub.layers.resource.collection/animate-nouns",
      "constraints": [{ "expressionFormat": "python-expr", "expression": "self.features.animacy == 'animate'", "scope": "slot" }]
    },
    {
      "name": "verb",
      "required": true,
      "collectionRef": "at://did:plc:researcher/pub.layers.resource.collection/transitive-verbs"
    },
    {
      "name": "object",
      "required": true,
      "collectionRef": "at://did:plc:researcher/pub.layers.resource.collection/nouns"
    },
    {
      "name": "adjunct",
      "required": false,
      "defaultValue": ""
    }
  ],
  "constraints": [
    {
      "expressionFormat": "python-expr",
      "expression": "subject.features.number == verb.features.number",
      "scope": "template"
    }
  ],
  "experimentRef": "at://did:plc:researcher/pub.layers.judgment.experimentDef/spr-study"
}
```

### Slot Filling

A filling maps each slot to a specific filler and records the rendered text:

```json
{
  "$type": "pub.layers.resource#filling",
  "templateRef": "at://did:plc:researcher/pub.layers.resource.template/transitive-template",
  "slotFillings": [
    {
      "slotName": "subject",
      "entryRef": "at://did:plc:researcher/pub.layers.resource.entry/the-cat",
      "renderedForm": "The cat"
    },
    {
      "slotName": "verb",
      "entryRef": "at://did:plc:researcher/pub.layers.resource.entry/chased",
      "renderedForm": "chased"
    },
    {
      "slotName": "object",
      "entryRef": "at://did:plc:researcher/pub.layers.resource.entry/the-mouse",
      "renderedForm": "the mouse"
    },
    {
      "slotName": "adjunct",
      "literalValue": "across the garden",
      "renderedForm": "across the garden"
    }
  ],
  "renderedText": "The cat chased the mouse across the garden",
  "strategy": "exhaustive",
  "expressionRef": "at://did:plc:researcher/pub.layers.expression/item-42"
}
```

### Template Composition

Multi-part stimuli (context + target + question) use template compositions:

```json
{
  "$type": "pub.layers.resource#templateComposition",
  "name": "Reading comprehension item",
  "compositionType": "sequence",
  "members": [
    {
      "templateRef": "at://did:plc:researcher/pub.layers.resource.template/context-paragraph",
      "label": "context",
      "ordinal": 0,
      "required": true
    },
    {
      "templateRef": "at://did:plc:researcher/pub.layers.resource.template/target-sentence",
      "label": "target",
      "ordinal": 1,
      "required": true
    },
    {
      "templateRef": "at://did:plc:researcher/pub.layers.resource.template/comprehension-question",
      "label": "question",
      "ordinal": 2,
      "required": true
    }
  ],
  "experimentRef": "at://did:plc:researcher/pub.layers.judgment.experimentDef/spr-study"
}
```

### Materialization

The filling's `renderedText` becomes an expression's `text`. The `expressionRef` on the filling links them bidirectionally. Annotations on the materialized expression can mark labeled spans (e.g., the critical region in a self-paced reading study).

## Experiment Design

The `experimentDef` record specifies the full experimental design, including list construction constraints and item ordering.

### Full Example

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Relative clause attachment ambiguity",
  "measureType": "acceptability",
  "taskType": "ordinal-scale",
  "presentation": {
    "method": "whole-sentence"
  },
  "recordingMethods": [
    { "method": "keyboard" }
  ],
  "scaleMin": 1,
  "scaleMax": 7,
  "guidelines": "Read each sentence and rate how natural it sounds...",
  "ontologyRef": "at://did:plc:researcher/pub.layers.ontology/rc-attachment-types",
  "templateRefs": [
    "at://did:plc:researcher/pub.layers.resource.template/rc-high-attach",
    "at://did:plc:researcher/pub.layers.resource.template/rc-low-attach"
  ],
  "collectionRefs": [
    "at://did:plc:researcher/pub.layers.resource.collection/fillers"
  ],
  "design": {
    "distributionStrategy": "latin-square",
    "itemOrder": "random-order",
    "timingMs": 30000,
    "listConstraints": [
      {
        "kind": "latin-square",
        "targetProperty": "condition",
        "parameters": {
          "features": [
            { "key": "numConditions", "value": 4 },
            { "key": "numLists", "value": 4 }
          ]
        }
      },
      {
        "kind": "no-adjacent-same-condition",
        "targetProperty": "condition",
        "parameters": {
          "features": [{ "key": "minDistance", "value": 2 }]
        }
      },
      {
        "kind": "balanced-frequency",
        "targetProperty": "itemType",
        "parameters": {
          "features": [
            { "key": "experimental", "value": 24 },
            { "key": "filler", "value": 48 }
          ]
        }
      }
    ]
  }
}
```

### List Constraints

| Constraint Kind | Purpose | Parameters |
|----------------|---------|------------|
| `latin-square` | Each participant sees one condition per item; all conditions equally represented | `numConditions`, `numLists` |
| `no-adjacent-same-condition` | Prevent consecutive items from the same condition | `minDistance` |
| `balanced-frequency` | Control the ratio of experimental to filler items | Per-type counts |
| `min-distance` | Minimum distance between items of the same type | `minDistance`, `targetProperty` |

### Distribution and Item Order

| Field | Known Values | Description |
|-------|-------------|-------------|
| `distributionStrategy` | `latin-square`, `random`, `blocked`, `stratified`, `custom` | How items are assigned to participant lists |
| `itemOrder` | `random-order`, `fixed-order`, `blocked`, `adaptive`, `custom` | How items are ordered within a list |
| `timingMs` | integer | Maximum time per item in milliseconds |

## Behavioral Data

Every judgment can carry `responseTimeMs` and a `behavioralData` feature map for rich behavioral signals.

### Response Times

The `responseTimeMs` field captures reaction time in milliseconds. For multi-region tasks (self-paced reading), per-region times go in `behavioralData`:

```json
{
  "item": { "recordRef": "at://..." },
  "scalarValue": 5,
  "responseTimeMs": 1842,
  "behavioralData": {
    "features": [
      { "key": "region.0.rt", "value": 312 },
      { "key": "region.1.rt", "value": 287 },
      { "key": "region.2.rt", "value": 445 },
      { "key": "region.3.rt", "value": 398 }
    ]
  }
}
```

### Eye-Tracking During Judgment

Eye-tracking data collected during a judgment task can be stored alongside the judgment:

```json
{
  "behavioralData": {
    "features": [
      { "key": "eyetracking.totalFixationTime", "value": 2340 },
      { "key": "eyetracking.numFixations", "value": 8 },
      { "key": "eyetracking.numRegressions", "value": 2 },
      { "key": "eyetracking.firstFixationDuration", "value": 245 },
      { "key": "eyetracking.gazeDataRef", "value": "at://did:plc:researcher/pub.layers.media/et-session-017" }
    ]
  }
}
```

For detailed fixation-level data, see the [Psycholinguistic Data guide](./psycholinguistic-data.md#eye-tracking-reading).

### Mouse and Keystroke Tracking

Interaction data captured during web-based experiments:

```json
{
  "behavioralData": {
    "features": [
      { "key": "mouse.numClicks", "value": 1 },
      { "key": "mouse.trajectory", "value": "[[0,400],[50,380],[120,350],[200,320]]" },
      { "key": "mouse.maxDeviation", "value": 45 },
      { "key": "keystroke.numBackspaces", "value": 3 },
      { "key": "keystroke.typingSpeed", "value": 42 }
    ]
  }
}
```

## Agreement Analysis

The `agreementReport` record summarizes inter-annotator agreement across judgment sets.

### Example: Cohen's Kappa

```json
{
  "$type": "pub.layers.judgment#agreementReport",
  "experimentRef": "at://did:plc:researcher/pub.layers.judgment.experimentDef/ner-study",
  "judgmentSetRefs": [
    "at://did:plc:annotator1/pub.layers.judgment.judgmentSet/ner-batch1",
    "at://did:plc:annotator2/pub.layers.judgment.judgmentSet/ner-batch1"
  ],
  "metric": "cohens-kappa",
  "value": 8200,
  "numAnnotators": 2,
  "numItems": 500
}
```

### Example: Krippendorff's Alpha

```json
{
  "$type": "pub.layers.judgment#agreementReport",
  "experimentRef": "at://did:plc:researcher/pub.layers.judgment.experimentDef/naturalness-study",
  "judgmentSetRefs": [
    "at://did:plc:annotator1/pub.layers.judgment.judgmentSet/nat-batch1",
    "at://did:plc:annotator2/pub.layers.judgment.judgmentSet/nat-batch1",
    "at://did:plc:annotator3/pub.layers.judgment.judgmentSet/nat-batch1"
  ],
  "metric": "krippendorff-alpha",
  "value": 7100,
  "numAnnotators": 3,
  "numItems": 200
}
```

### Metrics

| Metric | Use Case | Scale |
|--------|----------|-------|
| `cohens-kappa` | Two annotators, categorical data | 0-10000 (maps to 0.0-1.0) |
| `fleiss-kappa` | Multiple annotators, categorical data | 0-10000 |
| `krippendorff-alpha` | Any number of annotators, any scale type | 0-10000 |
| `percent-agreement` | Simple agreement percentage | 0-10000 |
| `correlation` | Ordinal-scale judgments | 0-10000 (maps to 0.0-1.0) |
| `f1` | Span labeling overlap | 0-10000 |

All metric values use the 0-10000 integer scale for consistent representation without floating-point issues. The `metricUri` field allows community-defined metrics beyond these known values.

## See Also

- [Primitives](../foundations/primitives.md): objectRef, featureMap, agentRef, constraint definitions
- [Psycholinguistic Data](./psycholinguistic-data.md): neural and physiological data integration with experiments
- [Judgment](../lexicons/judgment.md): full lexicon reference for experimentDef, judgment, judgmentSet, agreementReport
- [Resource](../lexicons/resource.md): template, slot, filling, collection, and entry definitions
- [Expression](../lexicons/expression.md): materialized stimulus expressions
- [Annotation](../lexicons/annotation.md): annotation layers for derived measures on stimuli
- [Flexible Enums](../foundations/flexible-enums.md): extending measureType, taskType, presentation method, recording method, and other values
- [bead Integration](../integration/data-models/bead.md): mapping from the bead framework
- [Decomp Integration](../integration/data-models/decomp.md): mapping from UDS scalar judgments
