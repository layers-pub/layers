---
sidebar_label: "Persona"
---

# pub.layers.persona

Persona records define annotation frameworks and analyst perspectives. Different personas can annotate the same data with different ontologies and interpretive frameworks, following FOVEA's persona-based approach.

## Types

### main
**Type:** Record

A persona representing an annotator's role, expertise, and interpretive framework.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | The persona name (e.g., 'Syntactician', 'Intelligence Analyst', 'Biomedical NER Annotator'). |
| `description` | string | Description of the persona's role, expertise, and information needs. |
| `domainUri` | at-uri | AT-URI of the domain definition node. Community-expandable via knowledge graph. |
| `domain` | string | Domain slug (fallback). Known values: `linguistics`, `nlp`, `biomedical`, `legal`, `intelligence`, `social-science`, `humanities`, `custom` |
| `kindUri` | at-uri | AT-URI of the persona kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Persona kind slug (fallback). Known values: `human-annotator`, `ml-model`, `guidelines-persona`, `expert-panel`, `crowd-worker`, `custom` |
| `parentRef` | at-uri | AT-URI of a parent persona this one specializes. |
| `ontologyRefs` | array | Ontologies this persona uses for annotation. Array of at-uri |
| `guidelines` | string | Annotation guidelines text. |
| `guidelinesBlob` | blob | Annotation guidelines document (PDF, Markdown, or plain text). |
| `knowledgeRefs` | array | Knowledge graph references (e.g., ORCID, institutional identifiers). Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features: expertise level, certification, language proficiency, reliability. Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |
