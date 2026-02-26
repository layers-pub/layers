---
sidebar_label: "Judgment Data"
---

# Judgment Data

Layers represents the full lifecycle of linguistic judgment data, from experiment definition through stimulus construction, data collection, and agreement analysis. The [`pub.layers.judgment`](../lexicons/judgment.md) and [`pub.layers.resource`](../lexicons/resource.md) lexicons work together to support all major judgment task types used in psycholinguistics and computational linguistics.

## Judgment Types

Every judgment type uses the same `pub.layers.judgment#judgment` object, with different fields populated depending on the task. The `taskType` on the experiment definition tells consumers which response fields to expect.

### Categorical

Participants choose a label from a fixed set.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Semantic relation classification",
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

### Scalar

Participants rate on a numeric scale.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Naturalness rating study",
  "taskType": "scalar",
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

### Ordinal

Like scalar, but the distances between values are not assumed to be equal. Uses the same `scalarValue` field. The `taskType` signals ordinal interpretation to analysis tools.

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Formality level classification",
  "taskType": "ordinal",
  "scaleMin": 1,
  "scaleMax": 5,
  "labels": ["very informal", "informal", "neutral", "formal", "very formal"]
}
```

### Ranking

Participants order items by preference. Each judgment carries `rankValue` (0-indexed position):

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Paraphrase ranking",
  "taskType": "ranking",
  "guidelines": "Rank the four paraphrases from most natural (1) to least natural (4)..."
}
```

```json
[
  { "item": { "localId": "paraphrase-A" }, "rankValue": 0 },
  { "item": { "localId": "paraphrase-C" }, "rankValue": 1 },
  { "item": { "localId": "paraphrase-B" }, "rankValue": 2 },
  { "item": { "localId": "paraphrase-D" }, "rankValue": 3 }
]
```

### Span Selection

Participants select a text region in the stimulus:

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Argument span identification",
  "taskType": "span-selection",
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

### Free Text

Participants provide open-ended text responses:

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Paraphrase generation",
  "taskType": "freetext",
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

### Pairwise Comparison

Participants choose between two alternatives. Modeled as a categorical judgment over the pair:

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Translation quality comparison",
  "taskType": "pairwise-comparison",
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

### Best-Worst Scaling

Participants select the best and worst items from a set. Each judgment records both selections:

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Sentiment intensity BWS",
  "taskType": "best-worst-scaling",
  "guidelines": "Select the sentence that conveys the MOST positive sentiment and the LEAST positive sentiment..."
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/tuple-8" },
  "behavioralData": {
    "features": [
      { "key": "best", "value": "item-A" },
      { "key": "worst", "value": "item-C" }
    ]
  },
  "responseTimeMs": 5100
}
```

### Acceptability

The classic linguistics task. Participants judge whether a sentence is acceptable. Can be binary (yes/no) or gradient (scalar):

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Island constraint acceptability",
  "taskType": "acceptability",
  "scaleMin": 1,
  "scaleMax": 7,
  "guidelines": "Rate how acceptable the following sentence sounds..."
}
```

```json
{
  "item": { "recordRef": "at://did:plc:researcher/pub.layers.expression/item-42" },
  "scalarValue": 2,
  "responseTimeMs": 1890,
  "confidence": 9000
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

The `experimentDef` record specifies the full experimental design, including list construction constraints and presentation parameters.

### Full Example

```json
{
  "$type": "pub.layers.judgment#experimentDef",
  "name": "Relative clause attachment ambiguity",
  "taskType": "acceptability",
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
    "presentationMode": "random-order",
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

### Distribution and Presentation

| Field | Known Values | Description |
|-------|-------------|-------------|
| `distributionStrategy` | `latin-square`, `random`, `blocked`, `stratified`, `custom` | How items are assigned to participant lists |
| `presentationMode` | `random-order`, `fixed-order`, `blocked`, `adaptive`, `custom` | How items are ordered within a list |
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
| `cohens-kappa` | Two annotators, categorical data | 0–10000 (maps to 0.0–1.0) |
| `fleiss-kappa` | Multiple annotators, categorical data | 0–10000 |
| `krippendorff-alpha` | Any number of annotators, any scale type | 0–10000 |
| `percent-agreement` | Simple agreement percentage | 0–10000 |
| `correlation` | Scalar/ordinal judgments | 0–10000 (maps to 0.0–1.0) |
| `f1` | Span selection overlap | 0–10000 |

All metric values use the 0–10000 integer scale for consistent representation without floating-point issues. The `metricUri` field allows community-defined metrics beyond these known values.

## See Also

- [Primitives](../foundations/primitives.md): objectRef, featureMap, agentRef, constraint definitions
- [Psycholinguistic Data](./psycholinguistic-data.md): neural and physiological data integration with experiments
- [Judgment](../lexicons/judgment.md): full lexicon reference for experimentDef, judgment, judgmentSet, agreementReport
- [Resource](../lexicons/resource.md): template, slot, filling, collection, and entry definitions
- [Expression](../lexicons/expression.md): materialized stimulus expressions
- [Annotation](../lexicons/annotation.md): annotation layers for derived measures on stimuli
- [Flexible Enums](../foundations/flexible-enums.md): extending taskType, metric, and strategy values
- [bead Integration](../integration/data-models/bead.md): mapping from the bead framework
- [Decomp Integration](../integration/data-models/decomp.md): mapping from UDS scalar judgments
