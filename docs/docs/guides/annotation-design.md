---
sidebar_label: "Annotation Design"
---

# Annotation Design

Annotation projects (treebanks, sembanks, NER corpora, discourse annotation) have design metadata that is orthogonal to the linguistic content of the annotations themselves. Just as [`experimentDef`](../lexicons/judgment.md) captures four independent dimensions of experiment design, Layers captures annotation project design through composable, independent dimensions.

## Orthogonal Dimensions

Every annotation project can be described along four independent axes:

**`sourceMethod`** (per-layer): How the annotations were produced. A UD treebank might have manually annotated POS tags but automatically predicted lemmas. This varies per layer, so it lives on [`annotationLayer`](../lexicons/annotation.md).

**`redundancy`** (project-level): How many annotators work on each item, and how they are assigned. OntoNotes double-annotates; a silver treebank has zero human annotators.

**`adjudication`** (project-level): How disagreements between annotators are resolved into a final annotation. Expert adjudication, majority vote, discussion, automatic merge, or no adjudication at all.

**`qualityCriteria`** (project-level): What acceptance criteria the project enforces. Agreement thresholds, evaluation metrics, scope of measurement.

These are fully independent. A manually annotated treebank can use single annotation with no adjudication, or double annotation with expert adjudication and a kappa threshold. A crowd-sourced NER corpus can use 5-way redundancy with majority vote and F1-based quality control. The source method, redundancy, adjudication, and quality criteria compose freely.

| Project Type | `sourceMethod` | Redundancy | Adjudication | Quality |
|---|---|---|---|---|
| UD treebank (native) | `manual-native` | 1 annotator | `none` | per-release review |
| OntoNotes NER | `manual-native` | 2 annotators, round-robin | `expert` | kappa >= 0.90 |
| AMR sembank | `manual-native` | 1-2 annotators | `expert` | SMATCH |
| Silver treebank | `automatic` | 0 (model only) | `none` | confidence threshold |
| Gold-from-silver | `automatic-corrected` | 1 corrector | `none` | spot-check |
| Crowd-sourced NER | `crowd-sourced` | 5 annotators, random | `majority-vote` | kappa + qualification |
| Converted treebank | `converted-corrected` | 1 corrector | `none` | validation script |
| Sembank (double) | `manual-native` | 2 annotators | `discussion` | SMATCH >= 0.80 |

## Source Method

The `sourceMethod` field on `annotationLayer` records how that specific layer was produced. This follows Universal Dependencies' practice of tracking annotation source per layer (e.g., UPOS: `manual native`, Lemmas: `automatic with corrections`).

| Value | Description |
|-------|-------------|
| `manual-native` | Annotated from scratch by human annotators |
| `manual-corrected` | Human-corrected output from another source |
| `automatic` | Fully automatic (model output, no human review) |
| `automatic-corrected` | Automatic annotation with human corrections |
| `converted` | Converted from another format or formalism (no human review) |
| `converted-corrected` | Converted with human corrections |
| `crowd-sourced` | Produced by crowd workers (e.g., Mechanical Turk, Prolific) |

All values are community-expandable via `sourceMethodUri`.

```json
{
  "$type": "pub.layers.annotation.annotationLayer",
  "expression": "at://did:plc:corpus/pub.layers.expression.expression/sent-42",
  "kind": "token-tag",
  "subkind": "pos",
  "formalism": "universal-dependencies",
  "sourceMethod": "manual-native",
  "annotations": ["..."]
}
```

Different layers on the same expression can have different source methods:

```json
[
  {
    "kind": "token-tag", "subkind": "pos",
    "sourceMethod": "manual-native"
  },
  {
    "kind": "token-tag", "subkind": "lemma",
    "sourceMethod": "automatic-corrected"
  },
  {
    "kind": "tree", "subkind": "dependency",
    "sourceMethod": "manual-native"
  }
]
```

## Annotation Design

The project-level design dimensions live in the `annotationDesign` field on [`corpus`](../lexicons/corpus.md). This is analogous to how `experimentDef.design` captures distribution strategy, item order, and list constraints.

### Redundancy

The `redundancy` field specifies how annotators are assigned to items.

| Field | Description |
|-------|-------------|
| `count` | Number of independent annotators per item (0 for fully automatic, 1 for single annotation, 2+ for multi-annotation) |
| `assignmentStrategy` | How annotators are assigned: `random`, `round-robin`, `stratified`, `expertise-based`, `custom` |
| `annotatorPool` | Total number of annotators in the project |
| `features` | Additional parameters (e.g., annotator qualification requirements, language requirements) |

All values are community-expandable via `assignmentStrategyUri`.

```json
{
  "redundancy": {
    "count": 2,
    "assignmentStrategy": "round-robin",
    "annotatorPool": 8
  }
}
```

### Adjudication

The `adjudication` field specifies how disagreements are resolved.

| Value | Description |
|-------|-------------|
| `expert` | A designated expert reviews and resolves all disagreements |
| `majority-vote` | The majority label wins (requires odd redundancy or tie-breaking rule) |
| `unanimous` | Only items with full agreement are accepted; others are re-annotated or discarded |
| `discussion` | Annotators discuss and reach consensus |
| `dawid-skene` | Probabilistic aggregation modeling annotator reliability |
| `automatic-merge` | Algorithmic merge (e.g., union of spans, intersection of labels) |
| `intersection` | Only annotations agreed on by all annotators are kept |
| `union` | All annotations from all annotators are kept |
| `none` | No adjudication (single-annotator or independent annotations preserved) |

All values are community-expandable via `methodUri`.

```json
{
  "adjudication": {
    "method": "expert",
    "dedicatedAdjudicator": true,
    "agreementThreshold": 9000
  }
}
```

The `agreementThreshold` (0-1000 scale) specifies the agreement level above which adjudication is skipped. Items with agreement above this threshold are accepted automatically; only disagreements below the threshold trigger adjudication.

### Quality Criteria

The `qualityCriteria` array specifies acceptance criteria, analogous to how `experimentDesign.listConstraints` specifies structural constraints on item lists. A project can have multiple criteria.

| Field | Description |
|-------|-------------|
| `metric` | Agreement or quality metric: `cohens-kappa`, `fleiss-kappa`, `krippendorff-alpha`, `percent-agreement`, `f1`, `smatch`, `uas`, `las`, `correlation`, `custom` |
| `threshold` | Minimum acceptable value (0-1000 scale) |
| `scope` | Evaluation scope: `item`, `layer`, `document`, `corpus`, `custom` |
| `features` | Additional parameters (e.g., label subset, confidence interval) |

All metric and scope values are community-expandable via `metricUri` and `scopeUri`.

```json
{
  "qualityCriteria": [
    {
      "metric": "cohens-kappa",
      "threshold": 8000,
      "scope": "corpus"
    },
    {
      "metric": "f1",
      "threshold": 9000,
      "scope": "layer"
    }
  ]
}
```

### Guidelines Reference

The `guidelinesRef` field points to the annotation guidelines document. This can be a `pub.layers.persona.persona` record (which has `guidelines` text and `guidelinesBlob` fields), an eprint, or any AT-URI. The `guidelinesVersion` field tracks which version of the guidelines annotators followed.

```json
{
  "guidelinesRef": "at://did:plc:project/pub.layers.persona.persona/ud-v2-guidelines",
  "guidelinesVersion": "2.14"
}
```

## Full Example

A UD-style treebank with double annotation and expert adjudication:

```json
{
  "$type": "pub.layers.corpus.corpus",
  "name": "English Web Treebank",
  "version": "2.14",
  "language": "en",
  "domain": "web",
  "license": "CC-BY-SA-4.0",
  "ontologyRefs": [
    "at://did:plc:ud/pub.layers.ontology.ontology/universal-dependencies-v2"
  ],
  "annotationDesign": {
    "redundancy": {
      "count": 2,
      "assignmentStrategy": "round-robin",
      "annotatorPool": 6
    },
    "adjudication": {
      "method": "expert",
      "dedicatedAdjudicator": true
    },
    "qualityCriteria": [
      {
        "metric": "uas",
        "threshold": 9500,
        "scope": "corpus"
      },
      {
        "metric": "las",
        "threshold": 9200,
        "scope": "corpus"
      }
    ],
    "guidelinesRef": "at://did:plc:ud/pub.layers.persona.persona/ud-guidelines",
    "guidelinesVersion": "2.14",
    "annotationRounds": 2
  }
}
```

A crowd-sourced NER corpus with majority vote:

```json
{
  "$type": "pub.layers.corpus.corpus",
  "name": "CoNLL-2003 NER Annotations",
  "language": "en",
  "domain": "news",
  "annotationDesign": {
    "redundancy": {
      "count": 5,
      "assignmentStrategy": "random",
      "annotatorPool": 50
    },
    "adjudication": {
      "method": "majority-vote"
    },
    "qualityCriteria": [
      {
        "metric": "fleiss-kappa",
        "threshold": 8000,
        "scope": "corpus"
      }
    ],
    "annotationRounds": 1
  }
}
```

An AMR sembank with discussion-based reconciliation:

```json
{
  "$type": "pub.layers.corpus.corpus",
  "name": "AMR 3.0",
  "language": "en",
  "domain": "news",
  "license": "LDC-User-Agreement",
  "annotationDesign": {
    "redundancy": {
      "count": 2,
      "assignmentStrategy": "stratified"
    },
    "adjudication": {
      "method": "discussion",
      "dedicatedAdjudicator": false
    },
    "qualityCriteria": [
      {
        "metric": "smatch",
        "threshold": 8000,
        "scope": "document"
      }
    ],
    "annotationRounds": 2
  }
}
```
