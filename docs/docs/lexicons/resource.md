---
sidebar_label: "Resource"
---

# pub.layers.resource

Linguistic resource records: lexical entries, collections, stimulus templates, slot definitions, and fillings. Provides an abstract, composable framework for representing any structured linguistic resource: lexicons, frame inventories, stimulus generation pipelines, and experimental item construction.

## Types

### entry
**Type:** Record

A linguistic resource entry: a lexical item, frame element filler, morphological paradigm cell, or any atomic unit in a structured linguistic collection.

| Field | Type | Description |
|-------|------|-------------|
| `lemma` | string | Canonical/citation form. |
| `form` | string | Surface form or string representation. |
| `language` | string | BCP-47 language tag. |
| `ontologyTypeRef` | at-uri | Reference to a pub.layers.ontology#typeDef classifying this entry. |
| `knowledgeRefs` | array | Knowledge graph groundings (WordNet synset, FrameNet lexical unit, Wikidata, etc.). Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features: pos, morphological features, frequency, register, etc. Ref: `pub.layers.defs#featureMap` |
| `components` | array | For multi-word expressions: the component words. Array of ref: `#mweComponent` |
| `mweKindUri` | at-uri | AT-URI of the MWE kind definition node. Community-expandable via knowledge graph. |
| `mweKind` | string | MWE kind slug (fallback). Known values: `compound`, `phrasal-verb`, `idiom`, `light-verb`, `inherently-reflexive`, `verb-particle`, `collocation`, `custom` |
| `sourceRef` | at-uri | AT-URI of the source record this entry was derived from. |
| `metadata` | ref | Provenance: who created this entry, with what tool. Ref: `pub.layers.defs#annotationMetadata` |
| `createdAt` | datetime | Record creation timestamp. |

### collection
**Type:** Record

A named collection of linguistic resource entries. Abstract enough to represent lexicons, frame inventories, paradigm tables, gazetteers, stop-word lists, etc.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable name for this collection. |
| `description` | string | Detailed description. |
| `kindUri` | at-uri | AT-URI of the collection kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Collection kind slug (fallback). Known values: `lexicon`, `frame-inventory`, `gazetteer`, `paradigm`, `stop-list`, `stimulus-pool`, `custom` |
| `language` | string | BCP-47 language tag. |
| `version` | string | Version string (e.g., 'FrameNet 1.7', 'PropBank 3.4'). |
| `ontologyRef` | at-uri | Reference to a pub.layers.ontology defining the type system for entries. |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `metadata` | ref | Provenance: who curated this collection. Ref: `pub.layers.defs#annotationMetadata` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### collectionMembership
**Type:** Record

Links an entry to a collection. Separate record enables many-to-many relationships and decentralized curation.

| Field | Type | Description |
|-------|------|-------------|
| `collectionRef` | at-uri | AT-URI of the collection. |
| `entryRef` | at-uri | AT-URI of the entry. |
| `ordinal` | integer | Optional ordering position within the collection. |
| `metadata` | ref | Provenance: who added this entry to this collection. Ref: `pub.layers.defs#annotationMetadata` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### slot
**Type:** Object

A named variable slot in a template. Generalizes template variable positions with constraints and defaults.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Slot name (used as placeholder key in template text, e.g., 'subject', 'verb'). |
| `description` | string | Description of the slot. |
| `required` | boolean | Whether this slot must be filled. |
| `defaultValue` | string | Default filler value if not explicitly filled. |
| `collectionRef` | at-uri | AT-URI of a resource collection constraining allowed fillers. |
| `ontologyTypeRef` | at-uri | AT-URI of a pub.layers.ontology#typeDef constraining the filler type. |
| `fillerTypeRefs` | array | Multiple allowed filler type references (disjunctive constraint). Array of at-uri |
| `constraints` | array | Slot-level constraints. Array of ref: `pub.layers.defs#constraint` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### template
**Type:** Record

A parameterized text template with named variable slots. Generalizes stimulus generation pipelines and controlled natural language patterns.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable template name. |
| `text` | string | Template text with `{slotName}` placeholders. |
| `language` | string | BCP-47 language tag. |
| `slots` | array | The named slots in this template. Array of ref: `#slot` |
| `constraints` | array | Cross-slot constraints. Array of ref: `pub.layers.defs#constraint` |
| `ontologyRef` | at-uri | Reference to the ontology defining the type system. |
| `experimentRef` | at-uri | Reference to the experiment this template was designed for. |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `metadata` | ref | Provenance: who designed this template. Ref: `pub.layers.defs#annotationMetadata` |
| `features` | ref | Open-ended features: judgmentType, taskType, category, domain, etc. Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### slotFilling
**Type:** Object

A single slot→filler mapping in a filled template. The filler can be an entry reference, a literal value, or both.

| Field | Type | Description |
|-------|------|-------------|
| `slotName` | string | Name of the slot being filled. |
| `entryRef` | at-uri | AT-URI of the resource entry filling this slot. |
| `literalValue` | string | Literal string value for this slot (used when no entry reference is needed). |
| `renderedForm` | string | The surface form as rendered in the filled text. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### filling
**Type:** Record

A filled template: a template with all slots mapped to specific fillers, producing a rendered text. The rendered text can optionally be materialized as a pub.layers.expression for annotation.

| Field | Type | Description |
|-------|------|-------------|
| `templateRef` | at-uri | AT-URI of the template being filled. |
| `slotFillings` | array | The slot→filler mappings. Array of ref: `#slotFilling` |
| `renderedText` | string | The fully rendered text after substitution. |
| `expressionRef` | at-uri | AT-URI of the pub.layers.expression materializing this filling. |
| `strategyUri` | at-uri | AT-URI of the filling strategy definition node. Community-expandable via knowledge graph. |
| `strategy` | string | Filling strategy slug (fallback). Known values: `exhaustive`, `random`, `stratified`, `mlm`, `csp`, `mixed`, `manual`, `custom` |
| `metadata` | ref | Provenance: what tool/process generated this filling. Ref: `pub.layers.defs#annotationMetadata` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features. Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### templateComposition
**Type:** Record

A composition of templates into sequences or trees. Enables building complex stimuli from simpler template units (e.g., context paragraph + target sentence + comprehension question).

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable name for this composition. |
| `description` | string | Description of the composition. |
| `compositionTypeUri` | at-uri | AT-URI of the composition type definition node. Community-expandable via knowledge graph. |
| `compositionType` | string | Composition type slug (fallback). Known values: `sequence`, `tree`, `custom` |
| `members` | array | The template members in order. Array of ref: `#templateMember` |
| `constraints` | array | Cross-member constraints. Array of ref: `pub.layers.defs#constraint` |
| `metadata` | ref | Ref: `pub.layers.defs#annotationMetadata` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### templateMember
**Type:** Object

A single member in a template composition, referencing a template or another composition.

| Field | Type | Description |
|-------|------|-------------|
| `templateRef` | at-uri | AT-URI of the template. |
| `compositionRef` | at-uri | AT-URI of a nested templateComposition (for tree structures). |
| `label` | string | Label for this member's role in the composition (e.g., 'context', 'target', 'question'). |
| `ordinal` | integer | Position in the sequence. |
| `required` | boolean | Whether this member must be present. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |

### mweComponent
**Type:** Object

A single component word in a multi-word expression.

| Field | Type | Description |
|-------|------|-------------|
| `form` | string | Surface form of the component. |
| `lemma` | string | Lemma/citation form of the component. |
| `position` | integer | 0-based position within the MWE. |
| `isHead` | boolean | Whether this component is the head of the MWE. |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
