# UIMA/CAS

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>UIMA/CAS: Unstructured Information Management Architecture and Common Analysis Structure</dd>
<dt>Origin</dt>
<dd>Apache Software Foundation / OASIS</dd>
<dt>Specification</dt>
<dd>OASIS UIMA Standard</dd>
<dt>Key Reference</dt>
<dd><a href="https://doi.org/10.1017/S1351324904003523">Ferrucci & Lally 2004</a></dd>
</dl>
</div>

## Overview

UIMA is a framework for building text analytics pipelines. The Common Analysis Structure (CAS) is its data model: a typed feature structure system where all annotations are subtypes of a base `Annotation` type that spans a region of a Subject of Analysis (SofA). UIMA provides type system inheritance, multiple views (SofAs), and index-based retrieval. WebAnno and INCEpTION are built on UIMA.

## Type-by-Type Mapping

### Core CAS Architecture

| UIMA/CAS Concept | Layers Equivalent | Notes |
|---|---|---|
| **CAS** (document container) | `pub.layers.expression.expression` (record) | The CAS contains one or more SofAs plus all annotations. A Layers expression is the equivalent root container. |
| **SofA** (Subject of Analysis) | `pub.layers.expression.text` + `pub.layers.media.media` | UIMA supports multiple SofAs (e.g., original text + translation + audio). Layers handles this with separate `expression` records linked by `pub.layers.alignment.alignment` for parallel text, and `mediaRef` for multimedia. |
| **View** (named perspective) | `pub.layers.persona.persona` + separate annotation layers | UIMA views partition annotations by perspective. Layers achieves this through persona-specific annotation layers with `metadata.personaRef`. |
| **Type System** | `pub.layers.ontology.ontology` | UIMA's type system descriptor defines annotation types with inheritance. Layers's `ontology` with `typeDef` and `parentTypeRef` provides equivalent type hierarchies. |
| **Type** | `pub.layers.ontology.typeDef` | A named type with features and parent type. `typeKind` + `allowedRoles` + `allowedValues` cover UIMA's feature declarations. |
| **Feature** (on a type) | `pub.layers.ontology.defs#roleSlot` + `typeDef.allowedValues` | UIMA features on types (e.g., `entityType` feature on `NamedEntity` type) map to role slots or allowed values on type definitions. |
| **Annotation** (base type) | `pub.layers.annotation.defs#annotation` | The base UIMA `Annotation` type has `begin`, `end` (character offsets) and a reference to its SofA. Layers's `annotation` has `anchor.textSpan` (begin/end) and the layer references an `expression`. |
| **AnnotationBase** | `pub.layers.annotation.defs#annotation` | Common fields: `uuid`, `confidence`, `features`. |

### UIMA Built-in Types

| UIMA Type | Layers Equivalent | Notes |
|---|---|---|
| `uima.tcas.Annotation` | `pub.layers.annotation.defs#annotation` | Base annotation with span. |
| `uima.tcas.DocumentAnnotation` | `pub.layers.expression.expression` | Document-level metadata. |
| `uima.cas.TOP` | No direct equivalent needed | Root of type hierarchy, implicit in Layers. |
| `uima.cas.AnnotationBase` | `pub.layers.annotation.defs#annotation` | Base for all annotations. |
| `uima.cas.FSArray` | `annotation.childIds` or `argumentRef[]` | Feature structure arrays. |
| `uima.cas.StringList`/`IntegerList` | `pub.layers.defs#featureMap` | Typed lists in features. |

### WebAnno/INCEpTION Annotation Types

These UIMA-based tools define standard annotation layers:

| WebAnno/INCEpTION Type | Layers Equivalent | Notes |
|---|---|---|
| `de.tudarmstadt.ukp.dkpro.core.api.lexmorph.type.pos.POS` | `annotationLayer(kind="token-tag", subkind="pos")` | POS tagging layer. |
| `de.tudarmstadt.ukp.dkpro.core.api.ner.type.NamedEntity` | `annotationLayer(kind="span", subkind="entity-mention")` | NER layer. |
| `de.tudarmstadt.ukp.dkpro.core.api.syntax.type.dependency.Dependency` | `annotationLayer(kind="graph", subkind="dependency")` | Dependency parsing. |
| `de.tudarmstadt.ukp.dkpro.core.api.coref.type.CoreferenceChain` | `clusterSet(kind="coreference")` | Coreference chains. |
| `webanno.custom.*` (user-defined layers) | `annotationLayer` with custom `kind`/`subkind` via `kindUri` | WebAnno allows custom annotation layers. Layers supports this through community-expandable kind/subkind via the URI+slug pattern. |

### UIMA Pipeline Architecture

| UIMA Concept | Layers Equivalent | Notes |
|---|---|---|
| Analysis Engine | `pub.layers.defs#annotationMetadata.tool` | The producing tool/model is recorded in metadata. |
| Collection Reader | Firehose consumer | Layers reads from the ATProto relay firehose instead of UIMA collection readers. |
| CAS Consumer | Appview indexer | The Layers appview indexes annotation records from the firehose. |
| Type Priority | Annotation layer ordering | Layers layers can reference each other via `parentLayerRef` for dependency ordering. |
| Index | Appview database indexes | Layers delegates indexing to the appview's PostgreSQL/Elasticsearch/Neo4j stores. |

### UIMA Feature Structures

| UIMA FS Concept | Layers Equivalent | Notes |
|---|---|---|
| Feature structure | `pub.layers.defs#featureMap` | Key-value pairs on annotations. |
| Typed feature | `pub.layers.defs#feature` (key + value) | UIMA features are typed (String, Integer, etc.); Layers features are string-encoded with consumer-side parsing. |
| Feature structure inheritance | `pub.layers.ontology.typeDef.parentTypeRef` | Type inheritance in the ontology system. |
| Range type | `pub.layers.ontology.defs#roleSlot.fillerTypeRefs` | Constraints on what types a feature can hold. |

