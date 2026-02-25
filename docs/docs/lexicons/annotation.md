---
sidebar_label: "Annotation"
---

# pub.layers.annotation

Unified abstract annotation model. All annotation types — token tags, span labels, entity mentions, situation/frame mentions, syntactic parses, discourse relations, interlinear glosses, sentiment, temporal expressions, etc. — are represented through a single abstract schema discriminated by kind and subkind.

## Types

### annotationLayer
**Type:** Record

A named layer of annotations over an expression. All annotation types use this single record type. The combination of kind, subkind, and formalism tells the appview how to render.

| Field | Type | Description |
|-------|------|-------------|
| `expression` | at-uri | The expression this annotation layer applies to. |
| `kindUri` | at-uri | AT-URI of the annotation kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Primary annotation kind slug (fallback). Known values: `token-tag`, `span`, `relation`, `tree`, `graph`, `tier`, `document-tag` |
| `subkindUri` | at-uri | AT-URI of the annotation subkind definition node. Community-expandable via knowledge graph. |
| `subkind` | string | Annotation subkind slug. Known values: `pos`, `xpos`, `ner`, `lemma`, `morph`, `supersense`, `sense`, `chunk`, `speaker`, `gloss`, `phonetic`, `prosody`, `tobi`, `language-id`, `entity-mention`, `situation-mention`, `frame`, `predicate`, `discourse-unit`, `speech-act`, `temporal-expression`, `temporal-signal`, `spatial-expression`, `spatial-signal`, `spatial-relation`, `location-mention`, `sentiment`, `emotion`, `stance`, `information-structure`, `error`, `correction`, `code-switch`, `highlight`, `comment`, `bookmark`, `temporal-value`, `temporal-vagueness`, `dependency`, `enhanced-dependency`, `constituency`, `ccg`, `coreference`, `bridging`, `temporal-relation`, `causal-relation`, `discourse-relation`, `custom` |
| `formalismUri` | at-uri | AT-URI of the formalism definition node. Community-expandable via knowledge graph. |
| `formalism` | string | Formalism slug. Known values: `universal-dependencies`, `penn-treebank`, `stanford`, `prague`, `propbank`, `framenet`, `verbnet`, `amr`, `ucca`, `rst`, `erst`, `sdrt`, `pdtb`, `timeml`, `iso-space`, `spatialml`, `conll-u`, `brat`, `elan`, `leipzig-glossing`, `ipa`, `tobi`, `bpe`, `sentencepiece`, `unimorph`, `wals`, `custom` |
| `labelSet` | string | Identifier for the label set used (e.g., 'universal-pos', 'ontonotes-ner'). |
| `ontologyRef` | at-uri | Reference to a pub.layers.ontology defining the types used in this layer. |
| `tokenizationId` | ref | For token-aligned layers: the tokenization these annotations are aligned to. Ref: `pub.layers.defs#uuid` |
| `parentLayerRef` | at-uri | For dependent/subordinate layers: the parent layer this one subdivides or refines. |
| `language` | string | BCP-47 language tag for this annotation layer, if different from the expression's language. |
| `annotations` | array | The annotations in this layer. Array of ref: `#annotation` |
| `rank` | integer | Rank among k-best alternatives (1 = best). Absent if this is the only/primary analysis. |
| `alternativesRef` | at-uri | Reference to the top-ranked (rank=1) layer in a k-best group. Absent on the top-ranked layer itself. |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `createdAt` | datetime | Record creation timestamp. |

### annotation
**Type:** Object

A single abstract annotation. The fields populated depend on the layer's kind/subkind. For token-tags: tokenIndex + label. For spans: anchor + label. For trees: anchor + label + parentId/childIds. For relations: anchor + arguments.

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | ref | Ref: `pub.layers.defs#uuid` |
| `anchor` | ref | How this annotation attaches to the source data. Ref: `pub.layers.defs#anchor` |
| `tokenIndex` | integer | For token-level annotations: 0-based index into the tokenization. |
| `label` | string | The primary label (POS tag, entity type, frame name, constituent label, dependency relation, etc.). |
| `value` | string | Secondary value (lemma form, gloss, normalized temporal value, etc.). |
| `text` | string | Surface text of the annotated span. |
| `parentId` | ref | Parent annotation in tree structures. Ref: `pub.layers.defs#uuid` |
| `childIds` | array | Child annotation UUIDs in tree structures. Array of ref: `pub.layers.defs#uuid` |
| `headIndex` | integer | Head/governor token index for directed arcs (dependency parsing). -1 for root. |
| `targetIndex` | integer | Dependent/target token index for directed arcs. |
| `arguments` | array | Role/argument fillers for predicate-argument structures. Array of ref: `#argumentRef` |
| `confidence` | integer | Confidence score 0-10000. |
| `ontologyTypeRef` | at-uri | Reference to a type definition in a pub.layers.ontology. |
| `knowledgeRefs` | array | Links to external knowledge bases. Array of ref: `pub.layers.defs#knowledgeRef` |
| `temporal` | ref | Structured temporal annotation. For `temporal-expression`, `temporal-value`, and `temporal-vagueness` subkinds. Subsumes TimeML TIMEX3 and OWL-Time. Ref: `pub.layers.defs#temporalExpression` |
| `spatial` | ref | Structured spatial annotation. For `spatial-expression` and `location-mention` subkinds. Subsumes ISO-Space (ISO 24617-7), SpatialML, and GeoJSON/WKT geometries. Ref: `pub.layers.defs#spatialExpression` |
| `features` | ref | Open-ended features. Ref: `pub.layers.defs#featureMap` |

### argumentRef
**Type:** Object

A role/argument reference in a predicate-argument structure. Uses the composable objectRef to point to another annotation.

| Field | Type | Description |
|-------|------|-------------|
| `role` | string | The argument role label (e.g., ARG0, Agent, Theme, CAUSE, connective, etc.). |
| `target` | ref | Reference to the annotation filling this role. Ref: `pub.layers.defs#objectRef` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### clusterSet
**Type:** Record

Groups annotations into equivalence classes. Used for coreference resolution, bridging anaphora grouping, and any annotation clustering task.

| Field | Type | Description |
|-------|------|-------------|
| `expression` | at-uri | The expression these clusters apply to. Optional for cross-document clustering. |
| `expressionRefs` | array | For cross-document clustering: the expressions these clusters span. Array of at-uri |
| `corpusRef` | at-uri | For cross-document clustering: the corpus these clusters span. |
| `kindUri` | at-uri | AT-URI of the clustering kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Clustering kind slug (fallback). Known values: `coreference`, `situation-coreference`, `bridging`, `same-as`, `clustering`, `custom` |
| `layerRef` | at-uri | The annotation layer whose annotations these clusters group. |
| `clusters` | array | The clusters. Array of ref: `#cluster` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `createdAt` | datetime | Record creation timestamp. |

### cluster
**Type:** Object

A cluster of annotations (e.g., coreferent entity mentions, situation mentions referring to the same situation).

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | ref | Ref: `pub.layers.defs#uuid` |
| `canonicalLabel` | string | The canonical/representative label for this cluster. |
| `members` | array | References to the annotations in this cluster. Array of ref: `pub.layers.defs#objectRef` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
