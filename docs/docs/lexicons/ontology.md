---
sidebar_label: "Ontology"
---

# pub.layers.ontology

Annotation ontology definitions. Defines the types, labels, and relationships used in annotation, inspired by FOVEA's persona-based ontology builder and bead's unified frame ontology interfaces. Ontologies are first-class objects that can be shared, versioned, and linked to knowledge graphs.

The record `main`s declare `key: any` (Scheme A): rkeys may be arbitrary strings rather than TIDs.

Ontologies also back the controlled vocabularies that every `<x>Uri` field across the lexicons points at. Layers seeds three ontology accounts, whose typeDefs the `<x>Uri` fields resolve into:

- `layers-core.ontology.layers.pub`: `media-kind`, `modality`, `catalog-kind`, `membership-role`, `pin-policy`, `stability`, `count-source`, `unit`, `facet-dimension`, `rollup-warning`, `language-role`, `license-component`, `credit-policy`, `access-condition`, `trust-tier`, `writing-direction`.
- `layers-acquisition.ontology.layers.pub`: `channel-type`, `sensor-type`, `coordinate-system`, `spatial-axes`, `si-unit`, `eeg-reference-scheme`, `electrode-placement`, `electrode-material`, `device-kind`, `stream-role`, `sync-method`, `consent-scope`, `identifiability`, `sex`, `handedness`, `proficiency`, `skeleton`, `signal-format`.
- `layers-annotation.ontology.layers.pub`: `annotation-kind`, `annotation-subkind`, `formalism`, `articulator`, `source-method`.

The modality lattice is one structural rule: a `modality` typeDef (`eeg`, `fmri`, `speech-audio`) names its carrier `media-kind` typeDef (`media-kind-signal`, `media-kind-volume`, `media-kind-audio`) via `parentTypeRef`. So `signalInfo.modalityUri`, `recordingMethod.methodUri`, and `contentSummary.modalityUri` resolve to the SAME node set, while `media.kindUri` resolves to the PARENT of those nodes. Species, institutions, funders, licenses, and languages are not minted here; they ground through `knowledgeRef`.

## Types

### ontology
**NSID:** `pub.layers.ontology.ontology`
**Type:** Record

An annotation ontology: a collection of typed definitions (entity types, situation types, role types, relation types) that together form a complete annotation framework.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable name for this ontology. |
| `description` | string | Detailed description of the ontology's purpose and scope. |
| `version` | string | Semantic version string. |
| `domainUri` | at-uri | AT-URI of the domain definition node. Community-expandable via knowledge graph. |
| `domain` | string | Domain slug (fallback when domainUri unavailable). Known values: `general`, `biomedical`, `legal`, `financial`, `news`, `social-media`, `scientific`, `intelligence`, `dialogue`, `multimodal`, `custom` |
| `parentRef` | at-uri | Reference to a parent ontology this one extends. |
| `personaRef` | at-uri | Reference to the persona that created/owns this ontology. |
| `knowledgeRefs` | array | Knowledge graph references grounding this ontology. Array of ref: `pub.layers.defs#knowledgeRef` |
| `licensing` | ref | Licensing terms governing this ontology (supports dual/multi/component licensing). Ref: `pub.layers.defs#licensing` |
| `eprintRefs` | array | Eprint records (papers/preprints) describing or associated with this ontology. Array of at-uri (max 64) |
| `languages` | array | BCP-47 language tags this ontology covers. Empty when language-independent. Array of strings (item max 32). No array-level cap. |
| `languageRefs` | array | Structured language references (canonical BCP-47 tag plus optional script, region, variety, and role) grounding the languages this ontology covers. Array of ref: `pub.layers.defs#languageRef` |
| `metadata` | ref | Provenance: who authored this ontology, with what tool, under what persona. Ref: `pub.layers.defs#annotationMetadata` |
| `features` | ref | Open-ended features describing this ontology (e.g., release channel, coverage, status). Ref: `pub.layers.defs#featureMap` |
| `reproducibility` | ref | How this ontology was produced (code, commit, command, environment, seed, funding, ethics approvals). Ref: `pub.layers.defs#reproducibilityInfo` |
| `createdAt` | datetime | Record creation timestamp. |

### typeDef
**NSID:** `pub.layers.ontology.typeDef`
**Type:** Record

A type definition within an ontology. Covers entity types, situation types, role types, and relation types in a single unified model.

| Field | Type | Description |
|-------|------|-------------|
| `ontologyRef` | at-uri | The ontology this type belongs to. |
| `name` | string | The type name/label. |
| `typeKindUri` | at-uri | AT-URI of the type kind definition node. Community-expandable via knowledge graph. |
| `typeKind` | string | Type kind slug (fallback when typeKindUri unavailable). Known values: `entity-type`, `situation-type`, `role-type`, `relation-type`, `attribute-type` |
| `gloss` | string | Rich text definition/gloss of this type. May include references to other types and Wikidata entities. |
| `parentTypeRef` | at-uri | Reference to a parent type (for type hierarchies/inheritance). |
| `allowedRoles` | array | For frame/situation types: the roles that can be filled. Array of ref: `pub.layers.ontology.defs#roleSlot` |
| `allowedValues` | array | For attribute types: enumerated allowed values. Array of strings |
| `knowledgeRefs` | array | Knowledge graph groundings (Wikidata, chive.pub, FrameNet, etc.). Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features. For `relation-type` typeDefs, standardized feature keys include: `symmetric` (boolean, if true A→B implies B→A), `transitive` (boolean, if true A→B and B→C implies A→C), `reflexive` (boolean, if true A→A is valid), `inverse` (AT-URI of the inverse relation typeDef), `domain` (AT-URI of required source type), `range` (AT-URI of required target type). Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### roleSlot
**NSID:** `pub.layers.ontology.defs#roleSlot`
**Type:** Object

A role/argument slot in a frame or event type definition. Structurally parallel to `pub.layers.resource.defs#slot`: both represent named positions with type constraints.

| Field | Type | Description |
|-------|------|-------------|
| `roleName` | string | The role label (e.g., Agent, Patient, Theme, ARG0). |
| `roleDescription` | string | Description of the role. |
| `fillerTypeRefs` | array | References to allowed filler types (`pub.layers.ontology.typeDef` AT-URIs). Array of at-uri |
| `collectionRef` | at-uri | AT-URI of a `pub.layers.resource.collection` constraining allowed fillers. |
| `required` | boolean | Whether this role is obligatory. |
| `defaultValue` | string | Default filler value if not explicitly filled. |
| `constraints` | array | Declarative constraints on fillers of this role. Array of ref: `pub.layers.defs#constraint` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features for this role slot. Ref: `pub.layers.defs#featureMap` |

## XRPC Queries

### getOntology
**NSID:** `pub.layers.ontology.getOntology`

Retrieve a single ontology record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the ontology record. |

**Output**: `{ uri, cid, value: ontology }`

### listOntologies
**NSID:** `pub.layers.ontology.listOntologies`

List ontology records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | at-identifier (required) | The handle or DID of the repository. |
| `domain` | string | Filter ontologies by domain slug. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: { uri, cid, value: ontology }[], cursor?: string }`

### getTypeDef
**NSID:** `pub.layers.ontology.getTypeDef`

Retrieve a single type definition record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the type definition record. |

**Output**: `{ uri, cid, value: typeDef }`

### listTypeDefs
**NSID:** `pub.layers.ontology.listTypeDefs`

List type definition records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `ontologyRef` | at-uri (required) | The AT-URI of the ontology whose type definitions to list. |
| `typeKind` | string | Filter by type kind. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: { uri, cid, value: typeDef }[], cursor?: string }`
