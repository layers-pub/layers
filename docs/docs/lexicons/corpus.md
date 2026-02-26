---
sidebar_label: "Corpus"
---

# pub.layers.corpus

Corpus records. A corpus is a named, versioned collection of expressions with shared metadata, annotation guidelines, and ontologies.

## Types

### main
**Type:** Record

A corpus: a curated collection of expressions.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Corpus name. |
| `description` | string | Detailed description of the corpus. |
| `version` | string | Version string for the corpus release. |
| `language` | string | Primary BCP-47 language tag. |
| `languages` | array | All languages represented. Array of strings |
| `domainUri` | at-uri | AT-URI of the domain definition node. Community-expandable via knowledge graph. |
| `domain` | string | Domain slug (fallback when domainUri unavailable). Known values: `news`, `biomedical`, `legal`, `social-media`, `dialogue`, `literary`, `scientific`, `web`, `spoken`, `custom` |
| `license` | string | License identifier (e.g., 'CC-BY-4.0', 'LDC-User-Agreement'). |
| `ontologyRefs` | array | Ontologies used in this corpus. Array of at-uri |
| `eprintRefs` | array | Eprint links for this corpus. Array of at-uri |
| `expressionCount` | integer | Number of expressions in the corpus. |
| `annotationDesign` | ref | Annotation project design: annotator assignment, adjudication, and quality criteria. Ref: `#annotationDesign` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### annotationDesign
**Type:** Object

Annotation project design parameters: annotator assignment, adjudication, and quality criteria.

| Field | Type | Description |
|-------|------|-------------|
| `redundancy` | ref | How annotators are assigned to items. Ref: `#redundancySpec` |
| `adjudication` | ref | How disagreements are resolved. Ref: `#adjudicationSpec` |
| `qualityCriteria` | array | Acceptance criteria for annotation quality. Array of ref: `#qualityCriterion` |
| `guidelinesRef` | at-uri | AT-URI of the annotation guidelines document (e.g., a pub.layers.persona or external resource). |
| `guidelinesVersion` | string | Version identifier for the annotation guidelines. |
| `annotationRounds` | integer | Number of annotation passes in the project workflow. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### redundancySpec
**Type:** Object

How many annotators work on each item and how they are assigned.

| Field | Type | Description |
|-------|------|-------------|
| `count` | integer | Number of independent annotators per item. |
| `assignmentStrategyUri` | at-uri | AT-URI of the assignment strategy definition node. Community-expandable via knowledge graph. |
| `assignmentStrategy` | string | How annotators are assigned to items (fallback when assignmentStrategyUri unavailable). Known values: `random`, `round-robin`, `stratified`, `expertise-based`, `custom` |
| `annotatorPool` | integer | Total number of annotators in the project. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### adjudicationSpec
**Type:** Object

How disagreements between annotators are resolved into a final annotation.

| Field | Type | Description |
|-------|------|-------------|
| `methodUri` | at-uri | AT-URI of the adjudication method definition node. Community-expandable via knowledge graph. |
| `method` | string | Adjudication method (fallback when methodUri unavailable). Known values: `expert`, `majority-vote`, `unanimous`, `discussion`, `dawid-skene`, `automatic-merge`, `intersection`, `union`, `none`, `custom` |
| `dedicatedAdjudicator` | boolean | Whether a separate adjudicator (not one of the annotators) resolves disagreements. |
| `agreementThreshold` | integer | Agreement level (0-10000) above which adjudication is skipped. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### qualityCriterion
**Type:** Object

An acceptance criterion for annotation quality.

| Field | Type | Description |
|-------|------|-------------|
| `metricUri` | at-uri | AT-URI of the metric definition node. Community-expandable via knowledge graph. |
| `metric` | string | Agreement or quality metric (fallback when metricUri unavailable). Known values: `cohens-kappa`, `fleiss-kappa`, `krippendorff-alpha`, `percent-agreement`, `f1`, `smatch`, `uas`, `las`, `correlation`, `custom` |
| `threshold` | integer | Minimum acceptable metric value (0-10000). |
| `scopeUri` | at-uri | AT-URI of the evaluation scope definition node. Community-expandable via knowledge graph. |
| `scope` | string | Evaluation scope (fallback when scopeUri unavailable). Known values: `item`, `layer`, `document`, `corpus`, `custom` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### membership
**Type:** Record

A record indicating that an expression belongs to a corpus, with optional split assignment.

| Field | Type | Description |
|-------|------|-------------|
| `corpusRef` | at-uri | AT-URI of the corpus. |
| `expressionRef` | at-uri | AT-URI of the expression. |
| `splitUri` | at-uri | AT-URI of the split definition node. Community-expandable via knowledge graph. |
| `split` | string | Split slug (fallback when splitUri unavailable). Known values: `train`, `dev`, `test`, `unlabeled` |
| `ordinal` | integer | Ordering index within the corpus. |
| `metadata` | ref | Provenance: who assigned this expression to this corpus, when, with what tool. Ref: `pub.layers.defs#annotationMetadata` |
| `features` | ref | Open-ended features for this membership (e.g., source file, import batch, quality flags). Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |
