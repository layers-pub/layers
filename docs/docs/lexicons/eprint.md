---
sidebar_label: "Eprint"
---

# pub.layers.eprint

Eprint linkage and data provenance records. Provides a way to link linguistic data and annotations to academic eprints, and to describe the data artifacts a publication produced. Supports any publication platform, including chive.pub, arXiv, ACL Anthology, and others.

## Types

### eprint
**NSID:** `pub.layers.eprint.eprint`
**Type:** Record

A link between a Layers data record and an eprint.

| Field | Type | Description |
|-------|------|-------------|
| `eprintIdentifier` | string | The eprint identifier (DOI, arXiv ID, ACL Anthology ID, etc.). |
| `eprintIdentifierTypeUri` | at-uri | AT-URI of the identifier type definition node. Community-expandable via knowledge graph. |
| `eprintIdentifierType` | string | Identifier type slug (fallback). Known values: `doi`, `arxiv`, `acl-anthology`, `semantic-scholar`, `pubmed`, `isbn`, `url`, `chive-pub`, `custom` |
| `eprintUri` | uri | Full URI of the eprint. |
| `platformEprintRef` | at-uri | AT-URI of the eprint record on its publication platform (e.g., chive.pub, institutional repository). |
| `linkTypeUri` | at-uri | AT-URI of the link type definition node. Community-expandable via knowledge graph. |
| `linkType` | string | Link type slug (fallback). Known values: `PRODUCED_BY`, `DESCRIBED_IN`, `EVALUATED_IN`, `REPLICATED_FROM`, `EXTENDS`, `SUPPLEMENTS`, `CITED_IN`, `ANNOTATES`, `TRAINING_DATA_FOR`, `TEST_DATA_FOR` |
| `expressionRefs` | array | References to Layers expressions linked to this eprint. Array of at-uri |
| `annotationRefs` | array | References to specific annotation records linked to this eprint. Array of at-uri |
| `corpusRef` | at-uri | Reference to a corpus record. |
| `description` | string | Description of the relationship. |
| `citation` | string | Full citation string. |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### dataLink
**NSID:** `pub.layers.eprint.dataLink`
**Type:** Record

A link from an eprint to the Layers data it produced or is associated with. Created when a publication's data artifacts (corpora, annotation layers, model outputs, etc.) are registered. Works with any publication platform.

| Field | Type | Description |
|-------|------|-------------|
| `eprintUri` | at-uri | AT-URI of the eprint on its publication platform. |
| `eprintDid` | did | DID of the eprint author/owner on the publication platform. |
| `dataKindUri` | at-uri | AT-URI of the data kind definition node. Community-expandable via knowledge graph. |
| `dataKind` | string | Data kind slug (fallback). Known values: `CORPUS`, `ANNOTATION_LAYER`, `MODEL_OUTPUT`, `GOLD_STANDARD`, `EVALUATION_DATA`, `SUPPLEMENTARY`, `REPLICATION` |
| `corpusRef` | at-uri | Reference to a Layers corpus. |
| `expressionRefs` | array | References to specific Layers expressions. Array of at-uri |
| `annotationRefs` | array | References to specific annotation records. Array of at-uri |
| `description` | string | Description of the data. |
| `paperSection` | string | Which section of the paper this data corresponds to (e.g., 'Section 4.2', 'Table 3', 'Appendix A'). |
| `reproducibility` | ref | Information about how to reproduce the data. Ref: `pub.layers.eprint.defs#reproducibilityInfo` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### reproducibilityInfo
**NSID:** `pub.layers.eprint.defs#reproducibilityInfo`
**Type:** Object

Information about how to reproduce the data from the eprint.

| Field | Type | Description |
|-------|------|-------------|
| `codeUri` | uri | URI of the code repository. |
| `commitHash` | string | Git commit hash for reproducibility. |
| `command` | string | Command to reproduce the data. |
| `environment` | string | Environment specification (Docker image, conda env, etc.). |
| `randomSeed` | integer | Random seed used. |

## XRPC Queries

### getEprint
**NSID:** `pub.layers.eprint.getEprint`

Retrieve a single eprint record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the eprint record. |

**Output**: The eprint record object.

### listEprints
**NSID:** `pub.layers.eprint.listEprints`

List eprint records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | did (required) | The DID of the repository. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: eprint[], cursor?: string }`

### getDataLink
**NSID:** `pub.layers.eprint.getDataLink`

Retrieve a single data link record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the data link record. |

**Output**: The data link record object.

### listDataLinks
**NSID:** `pub.layers.eprint.listDataLinks`

List data link records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | did (required) | The DID of the repository. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: dataLink[], cursor?: string }`
