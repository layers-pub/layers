---
sidebar_label: "Changelog"
---

# pub.layers.changelog

Structured changelog records for tracking changes to any Layers record. Adapted from Chive's `pub.chive.eprint.changelog` pattern but generalized to target any of the 26 `pub.layers.*` record types, with sub-record precision via `objectRef`.

Where Chive's changelog uses free-text location strings ("Section 3.2") to describe what changed within an eprint, Layers' changelog uses `objectRef` to machine-readably identify specific objects within a record (e.g., annotation #3 within an annotationLayer, a particular typeDef within an ontology, a cluster within a clusterSet).

## Types

### entry
**NSID:** `pub.layers.changelog.entry`
**Type:** Record

A changelog entry describing changes to any Layers record. Each entry targets a single subject record and organizes its changes into categorized sections.

| Field | Type | Description |
|-------|------|-------------|
| `subject` | at-uri | AT-URI of the record this changelog describes (any `pub.layers.*` record). |
| `subjectCollection` | string | The NSID of the subject record's collection (e.g., `pub.layers.annotation.annotationLayer`). Enables efficient filtering by record type without resolving the AT-URI. |
| `version` | ref | Semantic version this changelog describes. Ref: `#semanticVersion` |
| `previousVersion` | ref | Previous semantic version. Ref: `#semanticVersion` |
| `summary` | string | One-line summary of changes (max 500 characters). |
| `sections` | array | Categorized change sections (max 20). Array of ref: `#changeSection` |
| `createdAt` | datetime | When this changelog entry was created. |

### semanticVersion
**NSID:** `pub.layers.changelog.defs#semanticVersion`
**Type:** Object

A semantic version following the major.minor.patch convention. Useful for records that carry version fields (corpus, ontology, collection).

| Field | Type | Description |
|-------|------|-------------|
| `major` | integer | Major version number. |
| `minor` | integer | Minor version number. |
| `patch` | integer | Patch version number. |

### changeSection
**NSID:** `pub.layers.changelog.defs#changeSection`
**Type:** Object

A group of changes under a single category.

| Field | Type | Description |
|-------|------|-------------|
| `category` | string | Category of changes. See known values below. |
| `items` | array | Individual change items (max 50). Array of ref: `#changeItem` |

**`category` known values:**

| Value | Description |
|-------|-------------|
| `annotations` | Changes to annotation labels, anchors, confidence, or cluster membership. |
| `segmentation` | Changes to tokenization or segment boundaries. |
| `text` | Changes to expression text content, language, or kind. |
| `ontology` | Changes to type definitions, role slots, or ontology structure. |
| `corpus` | Changes to corpus metadata, annotation design, or membership. |
| `alignment` | Changes to alignment links or source/target bindings. |
| `graph` | Changes to graph structure, node properties, or edge targets. |
| `experiment` | Changes to experiment design, judgments, or agreement metrics. |
| `resource` | Changes to lexical entries, templates, slots, or fillings. |
| `media` | Changes to media references or technical properties. |
| `provenance` | Changes to authorship, agent attribution, persona, or tool metadata. |
| `references` | Changes to knowledgeRefs, sourceRef, eprintRef, or other cross-references. |
| `corrections` | Error corrections. |
| `other` | Uncategorized changes. |

### changeItem
**NSID:** `pub.layers.changelog.defs#changeItem`
**Type:** Object

An individual change within a section. The `targets` field uses `objectRef` for machine-readable sub-record targeting, allowing a change item to point at specific objects within the subject record (individual annotations, clusters, tokens, type definitions, etc.).

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Description of the change (max 2000 characters). |
| `changeType` | string | Type of change. Known values: `added`, `changed`, `removed`, `fixed`, `deprecated` |
| `targets` | array | Specific objects that changed (max 20). Uses `recordRef` + `objectId` for sub-record targeting. Array of ref: `pub.layers.defs#objectRef` |
| `fieldPath` | string | Path to the changed field within the target (e.g., `annotations/3/label`, `formalism`, `annotationDesign/guidelinesRef`). Max 200 characters. |
| `previousValue` | string | Previous value as a display string (max 1000 characters). |
| `newValue` | string | New value as a display string (max 1000 characters). |

## Examples

### Annotation Label Correction

A changelog entry recording that two POS labels were corrected in an annotation layer:

```json
{
  "$type": "pub.layers.changelog.entry",
  "subject": "at://did:plc:annotator1/pub.layers.annotation.annotationLayer/pos-layer-1",
  "subjectCollection": "pub.layers.annotation.annotationLayer",
  "summary": "Corrected POS tags for tokens 3 and 7",
  "sections": [
    {
      "category": "corrections",
      "items": [
        {
          "description": "Corrected POS tag for 'running' from NOUN to VERB",
          "changeType": "fixed",
          "targets": [
            {
              "recordRef": "at://did:plc:annotator1/pub.layers.annotation.annotationLayer/pos-layer-1",
              "objectId": { "value": "a1b2c3d4-annotation-uuid-for-token-3" }
            }
          ],
          "fieldPath": "label",
          "previousValue": "NOUN",
          "newValue": "VERB"
        },
        {
          "description": "Corrected POS tag for 'that' from DET to SCONJ",
          "changeType": "fixed",
          "targets": [
            {
              "recordRef": "at://did:plc:annotator1/pub.layers.annotation.annotationLayer/pos-layer-1",
              "objectId": { "value": "e5f6g7h8-annotation-uuid-for-token-7" }
            }
          ],
          "fieldPath": "label",
          "previousValue": "DET",
          "newValue": "SCONJ"
        }
      ]
    }
  ],
  "createdAt": "2025-06-15T14:30:00Z"
}
```

### Corpus Version Bump

A changelog entry for a new version of a corpus that added expressions and updated its annotation design:

```json
{
  "$type": "pub.layers.changelog.entry",
  "subject": "at://did:plc:manager1/pub.layers.corpus.corpus/my-ner-corpus",
  "subjectCollection": "pub.layers.corpus.corpus",
  "version": { "major": 2, "minor": 0, "patch": 0 },
  "previousVersion": { "major": 1, "minor": 3, "patch": 0 },
  "summary": "Major release: added 500 new expressions, switched to revised NER guidelines",
  "sections": [
    {
      "category": "corpus",
      "items": [
        {
          "description": "Added 500 biomedical abstracts from PubMed",
          "changeType": "added"
        },
        {
          "description": "Updated annotation design to reference revised NER guidelines v2",
          "changeType": "changed",
          "fieldPath": "annotationDesign/guidelinesRef"
        }
      ]
    },
    {
      "category": "ontology",
      "items": [
        {
          "description": "Added CHEMICAL entity type to the NER ontology",
          "changeType": "added",
          "targets": [
            {
              "recordRef": "at://did:plc:manager1/pub.layers.ontology.typeDef/chemical-entity"
            }
          ]
        }
      ]
    }
  ],
  "createdAt": "2025-06-20T10:00:00Z"
}
```

### Experiment Design Revision

A changelog entry for changes to an experiment definition, targeting specific components:

```json
{
  "$type": "pub.layers.changelog.entry",
  "subject": "at://did:plc:researcher1/pub.layers.judgment.experimentDef/acceptability-exp-1",
  "subjectCollection": "pub.layers.judgment.experimentDef",
  "version": { "major": 1, "minor": 1, "patch": 0 },
  "previousVersion": { "major": 1, "minor": 0, "patch": 0 },
  "summary": "Revised stimulus presentation and added practice items",
  "sections": [
    {
      "category": "experiment",
      "items": [
        {
          "description": "Increased stimulus display duration from 2000ms to 3000ms",
          "changeType": "changed",
          "fieldPath": "design/presentationSpec/displayTimeMs",
          "previousValue": "2000",
          "newValue": "3000"
        },
        {
          "description": "Added 5 practice items before the main experiment block",
          "changeType": "added"
        }
      ]
    },
    {
      "category": "resource",
      "items": [
        {
          "description": "Added 3 new filler templates to balance the item distribution",
          "changeType": "added",
          "targets": [
            {
              "recordRef": "at://did:plc:researcher1/pub.layers.resource.template/filler-6"
            },
            {
              "recordRef": "at://did:plc:researcher1/pub.layers.resource.template/filler-7"
            },
            {
              "recordRef": "at://did:plc:researcher1/pub.layers.resource.template/filler-8"
            }
          ]
        }
      ]
    }
  ],
  "createdAt": "2025-07-01T09:15:00Z"
}
```

## XRPC Queries

### getEntry
**NSID:** `pub.layers.changelog.getEntry`

Retrieve a single changelog entry by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the changelog entry record. |

**Output**: The changelog entry record object.

### listEntries
**NSID:** `pub.layers.changelog.listEntries`

List changelog entries for a specific subject record, ordered newest first.

| Parameter | Type | Description |
|-----------|------|-------------|
| `subject` | at-uri (required) | The AT-URI of the subject record to list changelogs for. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ entries: entry[], cursor?: string }`

### listByCollection
**NSID:** `pub.layers.changelog.listByCollection`

List recent changelog entries across all records of a given collection type, ordered newest first. Useful for monitoring changes across an entire record type (e.g., "show me all recent annotation layer changes").

| Parameter | Type | Description |
|-----------|------|-------------|
| `collection` | string (required) | The NSID of the collection to filter by (e.g., `pub.layers.annotation.annotationLayer`). |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ entries: entry[], cursor?: string }`
