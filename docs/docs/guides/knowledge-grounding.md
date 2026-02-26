---
sidebar_label: "Knowledge Grounding"
---

# Knowledge Grounding

Layers provides mechanisms for linking annotations to external knowledge bases, building typed property graphs, defining annotation ontologies, and tracking annotator perspectives. This guide explains how these pieces work together to ground linguistic annotations in structured knowledge.

## The knowledgeRef Primitive

The [`knowledgeRef`](../foundations/primitives.md#knowledgeref) is the fundamental link between a Layers annotation and an external knowledge base entry:

```json
{
  "source": "wikidata",
  "identifier": "Q76",
  "uri": "http://www.wikidata.org/entity/Q76",
  "label": "Barack Hussein Obama"
}
```

Every major annotation type includes a `knowledgeRefs` array. This means any annotation (a named entity, a frame label, a dependency type, a temporal expression) can be grounded in external authority.

### Supported Knowledge Bases

The `source` field is a free-form string identifying the KB. Common values:

| Source | Example Identifier | Use Case |
|--------|-------------------|----------|
| `wikidata` | `Q76` | Entity grounding, concept linking |
| `framenet` | `Destroying` | Frame semantic roles |
| `wordnet` | `02084071-n` (synset) | Word sense disambiguation |
| `propbank` | `destroy.01` | Predicate-argument structures |
| `verbnet` | `destroy-44` | Verb class identification |
| `universal-dependencies` | `nsubj` | Dependency relation types |
| `geonames` | `5391959` | Geographic entity grounding |
| `orcid` | `0000-0002-1825-0097` | Researcher identification |
| `doi` | `10.1162/coli_a_00478` | Publication references |

The `sourceUri` field can point to an ATProto record representing the KB authority, enabling decentralized KB management.

## The Typed Property Graph

The [`pub.layers.graph`](../lexicons/graph.md) lexicon provides a generic typed property graph for representing entities, concepts, situations, and their relationships.

### Graph Nodes

A [`graphNode`](../lexicons/graph.md#graphnode) represents a standalone entity or concept in the knowledge graph:

```json
{
  "nodeType": "entity",
  "label": "Barack Obama",
  "properties": {
    "features": [
      { "key": "birth-year", "value": "1961" },
      { "key": "nationality", "value": "American" }
    ]
  },
  "knowledgeRefs": [
    {
      "source": "wikidata",
      "identifier": "Q76",
      "uri": "http://www.wikidata.org/entity/Q76"
    }
  ]
}
```

Node types include: `entity`, `concept`, `situation`, `state`, `time`, `location`, `claim`, `proposition`, and community-defined types via `nodeTypeUri`.

Existing Layers records (expressions, annotations, type definitions) are implicitly graph nodes through [`objectRef`](../foundations/primitives.md#objectref). The `graphNode` record is only needed for objects that exist purely in the graph, such as world-level entities and abstract concepts.

### Graph Edges

A [`graphEdge`](../lexicons/graph.md#graphedge) is a typed, directed relationship between any two Layers objects:

```json
{
  "source": { "recordRef": "at://did:plc:.../pub.layers.annotation/layer1", "objectId": "mention-uuid" },
  "target": { "recordRef": "at://did:plc:.../pub.layers.graph.graphNode/obama" },
  "edgeType": "grounding",
  "confidence": 9500
}
```

Edge types span several categories:

- **Ontological**: `grounding`, `instance-of`, `denotes`, `describes`, `specializes`, `elaborates`
- **Semantic**: `coreference`, `causal`, `part-of`, `member-of`, `type-of`, `same-as`, `related-to`, `derived-from`
- **Communication**: `reply-to`, `quote`, `translation-of`, `revision-of`, `summary-of`
- **Temporal**: Allen's 13 interval relations (see [Temporal Representation](./temporal-representation.md))
- **Spatial**: RCC-8 topological relations, directional, and distance (see [Spatial Representation](./spatial-representation.md))

All edge types are community-expandable via `edgeTypeUri`.

## Annotation Ontologies

The [`pub.layers.ontology`](../lexicons/ontology.md) lexicon defines the type systems and label sets used in annotation. An ontology is a collection of type definitions that together form an annotation framework.

### Ontology Records

An ontology record defines a named, versioned annotation framework:

```json
{
  "name": "OntoNotes NER",
  "description": "18-type named entity scheme from OntoNotes 5.0",
  "version": "5.0",
  "domain": "general"
}
```

### Type Definitions

A [`typeDef`](../lexicons/ontology.md#typedef) record defines a single type within an ontology:

```json
{
  "ontologyRef": "at://did:plc:.../pub.layers.ontology/ontonotes-ner",
  "name": "PERSON",
  "typeKind": "entity-type",
  "gloss": "People, including fictional characters",
  "knowledgeRefs": [
    { "source": "wikidata", "identifier": "Q5", "label": "human" }
  ]
}
```

Type kinds include: `entity-type`, `situation-type`, `role-type`, `relation-type`, `attribute-type`.

Type definitions support inheritance via `parentTypeRef`, role slots via `allowedRoles`, and constraint definition via `allowedValues`. For relation types, `features` can encode properties like `symmetric`, `transitive`, `reflexive`, `inverse`, `domain`, and `range`.

### Linking Annotations to Ontologies

An annotation layer references its ontology via `ontologyRef`:

```json
{
  "kind": "span",
  "subkind": "ner",
  "ontologyRef": "at://did:plc:.../pub.layers.ontology/ontonotes-ner",
  "annotations": [
    {
      "label": "PERSON",
      "ontologyTypeRef": "at://did:plc:.../pub.layers.ontology.typeDef/person-type",
      "text": "Obama"
    }
  ]
}
```

The `ontologyRef` on the layer identifies which type system is being used. Individual annotations can link to specific type definitions via `ontologyTypeRef`.

## Personas

The [`pub.layers.persona`](../lexicons/persona.md) lexicon defines annotator perspectives and theoretical frameworks. Different personas can annotate the same data with different ontologies.

```json
{
  "name": "Syntactician",
  "description": "Expert in generative syntax, annotates phrase structure and movement",
  "domain": "linguistics",
  "kind": "human-annotator",
  "ontologyRefs": [
    "at://did:plc:.../pub.layers.ontology/x-bar-theory"
  ]
}
```

Personas are referenced from annotations via [`agentRef.personaRef`](../foundations/primitives.md#agentref), enabling:

- **Multi-perspective annotation**: The same text annotated by different personas with different ontologies
- **Model attribution**: ML models as personas with their training data and framework documented
- **Reproducibility**: Linking annotations to the theoretical framework and guidelines used

## Entity Grounding Workflow

A typical entity grounding pipeline in Layers:

```
1. Mention Detection
   annotation (subkind="entity-mention", label="PERSON", text="Obama")

2. Coreference Resolution
   clusterSet (kind="entity-coreference")
     cluster: [mention-1-uuid, mention-2-uuid, mention-3-uuid]

3. Entity Node Creation
   graphNode (nodeType="entity", label="Barack Obama")
     knowledgeRefs: [{source: "wikidata", identifier: "Q76"}]

4. Grounding Edges
   graphEdge (source=mention-1, target=graphNode, edgeType="grounding")
   graphEdge (source=mention-2, target=graphNode, edgeType="grounding")

5. Cross-Document Linking
   graphEdge (source=graphNode-doc1, target=graphNode-doc2, edgeType="same-as")
```

### Step by Step

**1. Mention detection.** An [annotation layer](../lexicons/annotation.md) with `subkind="entity-mention"` identifies entity mentions in text. Each annotation carries a `label` (entity type) and optionally `knowledgeRefs` for immediate grounding.

**2. Coreference resolution.** A [`clusterSet`](../lexicons/annotation.md#clusterset) groups co-referring mentions into clusters. Each cluster represents a single real-world entity within a document.

**3. Entity node creation.** A [`graphNode`](../lexicons/graph.md#graphnode) record represents the resolved entity. Its `knowledgeRefs` link to external KBs (Wikidata, etc.).

**4. Grounding edges.** [`graphEdge`](../lexicons/graph.md#graphedge) records with `edgeType="grounding"` connect individual mention annotations to their resolved graph node.

**5. Cross-document linking.** For the same entity appearing across documents, `graphEdge` records with `edgeType="same-as"` link graph nodes from different documents.

## Frame Semantic Grounding

For predicate-argument structures (PropBank, FrameNet, VerbNet), grounding connects annotations to frame definitions:

```json
{
  "kind": "span",
  "subkind": "frame",
  "formalism": "framenet",
  "ontologyRef": "at://did:plc:.../pub.layers.ontology/framenet-1.7",
  "annotations": [
    {
      "label": "Destroying",
      "text": "demolished",
      "knowledgeRefs": [
        { "source": "framenet", "identifier": "Destroying" }
      ],
      "arguments": [
        { "role": "Destroyer", "target": { "localId": "arg0-uuid" } },
        { "role": "Patient", "target": { "localId": "arg1-uuid" } }
      ]
    }
  ]
}
```

The ontology's `typeDef` records define the frame with its `allowedRoles` (role slots), and `knowledgeRefs` link to FrameNet's canonical frame definitions.

## See Also

- [Primitives](../foundations/primitives.md): knowledgeRef, objectRef, agentRef definitions
- [Temporal Representation](./temporal-representation.md): temporal relations as graph edges
- [Spatial Representation](./spatial-representation.md): spatial relations as graph edges
- [Multimodal Annotation](./multimodal-annotation.md): annotation across modalities
- [Graph](../lexicons/graph.md): typed property graph lexicon reference
- [Ontology](../lexicons/ontology.md): annotation ontology lexicon reference
- [Persona](../lexicons/persona.md): agent persona lexicon reference
- [Annotation](../lexicons/annotation.md): unified annotation model
- [Flexible Enums](../foundations/flexible-enums.md): URI+slug pattern for community-expandable types
