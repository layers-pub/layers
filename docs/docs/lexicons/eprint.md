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
| `eprintIdentifierType` | string | Identifier type slug (fallback). Known values: `doi`, `arxiv`, `acl-anthology`, `semantic-scholar`, `pubmed`, `isbn`, `url`, `at-uri`, `custom` |
| `eprintUri` | uri | Full URI of the eprint. |
| `platformEprintRefs` | array | AT-URIs of the eprint record on its publication platforms (e.g., chive.pub, any ATProto-native publication service). An eprint may be mirrored on multiple platforms. Array of at-uri (max 32) |
| `linkTypeUri` | at-uri | AT-URI of the link type definition node. Community-expandable via knowledge graph. |
| `linkType` | string | Link type slug (fallback). Known values: `produced-by`, `described-in`, `evaluated-in`, `replicated-from`, `extends`, `supplements`, `cited-in`, `annotates`, `training-data-for`, `test-data-for` |
| `expressionRefs` | array | References to Layers expressions linked to this eprint. Array of at-uri |
| `annotationRefs` | array | References to specific annotation records linked to this eprint. Array of at-uri |
| `corpusRef` | at-uri | Reference to a corpus record. |
| `description` | string | Description of the relationship. |
| `citation` | ref | Bibliographic citation for the eprint. Carries rendered metadata (authors, title, venue, year) as a raw string and/or structured CSL-JSON/DataCite fields; `eprintIdentifier`/`eprintIdentifierType` remain the canonical link key. Ref: `pub.layers.eprint.defs#citation` |
| `knowledgeRefs` | array | Knowledge graph references (e.g., Wikidata for the venue, DBLP, Semantic Scholar corpus ID). Array of ref: `pub.layers.defs#knowledgeRef` |
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
| `dataKind` | string | Data kind slug (fallback). Known values: `corpus`, `annotation-layer`, `model-output`, `gold-standard`, `evaluation-data`, `supplementary`, `replication` |
| `corpusRef` | at-uri | Reference to a Layers corpus. |
| `expressionRefs` | array | References to specific Layers expressions. Array of at-uri |
| `annotationRefs` | array | References to specific annotation records. Array of at-uri |
| `description` | string | Description of the data. |
| `paperSection` | string | Which section of the paper this data corresponds to (e.g., 'Section 4.2', 'Table 3', 'Appendix A'). |
| `reproducibility` | ref | Information about how to reproduce the data. Ref: `pub.layers.defs#reproducibilityInfo` |
| `features` | ref | Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

### citation
**NSID:** `pub.layers.eprint.defs#citation`
**Type:** Object

A bibliographic citation, expressible as a raw formatted string (`raw`) and/or structured fields following CSL-JSON and DataCite conventions. Consumers prefer the structured fields when present and fall back to `raw`. Populate at least `raw` or `title`.

| Field | Type | Description |
|-------|------|-------------|
| `raw` | string | Full formatted citation string (CSL fallback). Sufficient on its own when structured metadata is unavailable. |
| `typeUri` | at-uri | AT-URI of the bibliographic type definition node. Community-expandable via knowledge graph. |
| `type` | string | CSL-JSON item type slug (fallback when typeUri unavailable). Known values: `article-journal`, `paper-conference`, `article`, `book`, `chapter`, `thesis`, `report`, `dataset`, `software`, `manuscript`, `webpage`, `entry`, `standard`, `preprint`, `custom` |
| `title` | string | Title of the work (CSL 'title'). |
| `creators` | array | Authors, editors, and other creators (CSL name variables; DataCite creators). Array of ref: `#creator` |
| `containerTitle` | string | Title of the container: journal, book, or proceedings (CSL 'container-title'). |
| `publisher` | string | Publisher (CSL 'publisher'; DataCite publisher). |
| `publisherPlace` | string | Publisher location (CSL 'publisher-place'). |
| `issued` | ref | Issue/publication date (CSL 'issued'; DataCite publicationYear). Ref: `#date` |
| `accessed` | ref | Date the work was accessed (CSL 'accessed'). Ref: `#date` |
| `volume` | string | Volume number. |
| `issue` | string | Issue number. |
| `page` | string | Page range (CSL 'page', e.g., '101-126'). |
| `edition` | string | Edition. |
| `version` | string | Version of the cited artifact (CSL 'version'; DataCite version). |
| `doi` | string | DOI (CSL 'DOI'), e.g., '10.18653/v1/2020.acl-main.1'. |
| `url` | uri | URL (CSL 'URL'). |
| `isbn` | string | ISBN. |
| `issn` | string | ISSN. |
| `pmid` | string | PubMed ID (CSL 'PMID'). |
| `abstract` | string | Abstract (CSL 'abstract'; DataCite Abstract description). |
| `language` | string | BCP-47 language tag of the work (CSL 'language'). |
| `knowledgeRefs` | array | External grounding for the work or venue (Crossref, OpenAlex, DBLP, Semantic Scholar). Array of ref: `pub.layers.defs#knowledgeRef` |

### creator
**NSID:** `pub.layers.eprint.defs#creator`
**Type:** Object

A bibliographic creator (author, editor, etc.). Name parts follow CSL-JSON; `nameType` and `affiliation` follow DataCite. ATProto-native creators additionally ground identity via `agent` (DID) or `knowledgeRef` (ORCID, ROR, OpenAlex).

| Field | Type | Description |
|-------|------|-------------|
| `roleUri` | at-uri | AT-URI of the creator-role definition node. Community-expandable via knowledge graph. |
| `role` | string | Creator role slug (CSL contributor role / DataCite contributorType; fallback when roleUri unavailable). Known values: `author`, `editor`, `translator`, `contributor`, `illustrator`, `director`, `producer`, `collector`, `custom` |
| `nameTypeUri` | at-uri | AT-URI of the name-type definition node. Community-expandable via knowledge graph. |
| `nameType` | string | Whether the creator is a person or an organization (DataCite nameType; fallback when nameTypeUri unavailable). Known values: `personal`, `organizational` |
| `family` | string | Family/surname (CSL 'family'). |
| `given` | string | Given name(s) (CSL 'given'). |
| `droppingParticle` | string | Dropping particle (CSL 'dropping-particle'). |
| `nonDroppingParticle` | string | Non-dropping particle (CSL 'non-dropping-particle'). |
| `suffix` | string | Name suffix (CSL 'suffix', e.g., 'Jr.', 'III'). |
| `literal` | string | Full name as a single string when parts are not separated, or an organization name (CSL 'literal'). |
| `affiliation` | string | Affiliation (DataCite affiliation). |
| `sequence` | integer | Position of this creator in the creator list (1-based). |
| `agent` | ref | ATProto-native identity grounding (DID) for the creator, if any. Ref: `pub.layers.defs#agentRef` |
| `knowledgeRef` | ref | External identity grounding (ORCID via source 'orcid', ROR for organizations, OpenAlex author id). Ref: `pub.layers.defs#knowledgeRef` |

### date
**NSID:** `pub.layers.eprint.defs#date`
**Type:** Object

A date in CSL-JSON style: structured year/month/day and/or a free-form literal. Maps to CSL 'date-parts' (when year/month/day are set) or 'literal'/'raw' (when only literal is set).

| Field | Type | Description |
|-------|------|-------------|
| `year` | integer | Four-digit year. |
| `month` | integer | Month (1-12). |
| `day` | integer | Day of month (1-31). |
| `season` | string | Season when the work was issued (CSL 'season'). |
| `circa` | boolean | Whether the date is approximate (CSL 'circa'). |
| `literal` | string | Free-form date string when structured parts are unavailable (CSL 'literal'/'raw'). |

The `reproducibilityInfo` object has moved to `pub.layers.defs#reproducibilityInfo`; see the [Defs](./defs.md) reference. The `dataLink` record's `reproducibility` field now refs it there.

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
| `repo` | at-identifier (required) | AT-identifier (DID or handle) of the repository. |
| `linkType` | string | Filter by link type slug. |
| `eprintIdentifierType` | string | Filter by identifier type slug. |
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

List data link records for a given eprint with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eprintUri` | at-uri (required) | AT-URI of the eprint to list data links for. |
| `dataKind` | string | Filter by data kind slug. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: dataLink[], cursor?: string }`
