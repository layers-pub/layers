---
sidebar_label: "Ontology"
---

# pub.layers.ontology

Annotation ontology definitions. Defines the types, labels, and relationships used in annotation, inspired by FOVEA's persona-based ontology builder and bead's unified frame ontology interfaces. Ontologies are first-class objects that can be shared, versioned, and linked to knowledge graphs.

## Types

### ontology
**Type:** Record

An annotation ontology: a collection of typed definitions (entity types, event types, role types, relation types) that together form a complete annotation framework.

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
| `createdAt` | datetime | Record creation timestamp. |

### typeDef
**Type:** Record

A type definition within an ontology. Covers entity types, event types, role types, and relation types in a single unified model.

| Field | Type | Description |
|-------|------|-------------|
| `ontologyRef` | at-uri | The ontology this type belongs to. |
| `name` | string | The type name/label. |
| `typeKindUri` | at-uri | AT-URI of the type kind definition node. Community-expandable via knowledge graph. |
| `typeKind` | string | Type kind slug (fallback when typeKindUri unavailable). Known values: `entity-type`, `situation-type`, `role-type`, `relation-type`, `attribute-type` |
| `gloss` | string | Rich text definition/gloss of this type. May include references to other types and Wikidata entities. |
| `parentTypeRef` | at-uri | Reference to a parent type (for type hierarchies/inheritance). |
| `allowedRoles` | array | For frame/event types: the roles that can be filled. Array of ref: `#roleSlot` |
| `allowedValues` | array | For attribute types: enumerated allowed values. Array of strings |
| `knowledgeRefs` | array | Knowledge graph groundings (Wikidata, chive.pub, FrameNet, etc.). Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features. For `relation-type` typeDefs, standardized feature keys include: `symmetric` (boolean, if true A→B implies B→A), `transitive` (boolean, if true A→B and B→C implies A→C), `reflexive` (boolean, if true A→A is valid), `inverse` (AT-URI of the inverse relation typeDef), `domain` (AT-URI of required source type), `range` (AT-URI of required target type). Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### roleSlot
**Type:** Object

A role/argument slot in a frame or event type definition. Structurally parallel to pub.layers.resource#slot: both represent named positions with type constraints.

| Field | Type | Description |
|-------|------|-------------|
| `roleName` | string | The role label (e.g., Agent, Patient, Theme, ARG0). |
| `roleDescription` | string | Description of the role. |
| `fillerTypeRefs` | array | References to allowed filler types (pub.layers.ontology#typeDef AT-URIs). Array of at-uri |
| `collectionRef` | at-uri | AT-URI of a pub.layers.resource#collection constraining allowed fillers. |
| `required` | boolean | Whether this role is obligatory. |
| `defaultValue` | string | Default filler value if not explicitly filled. |
| `constraints` | array | Declarative constraints on fillers of this role. Array of ref: `pub.layers.defs#constraint` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features for this role slot. Ref: `pub.layers.defs#featureMap` |
