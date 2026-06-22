# CSL-JSON, BibTeX, and DataCite

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>CSL-JSON (citeproc), BibTeX/BibLaTeX, DataCite Metadata Schema</dd>
<dt>Origin</dt>
<dd>Citation Style Language project; Oren Patashnik (BibTeX); DataCite e.V.</dd>
<dt>Specification</dt>
<dd>CSL-JSON schema; BibLaTeX manual; DataCite Metadata Schema 4.x</dd>
<dt>Key Reference</dt>
<dd><a href="https://citationstyles.org/">citationstyles.org</a>; <a href="https://schema.datacite.org/">schema.datacite.org</a></dd>
</dl>
</div>

## Overview

Bibliographic metadata in Layers is carried by four composable definitions in `pub.layers.eprint.defs` and `pub.layers.defs`:

- `pub.layers.eprint.defs#citation`: a bibliographic citation for a work.
- `pub.layers.eprint.defs#creator`: an author, editor, or other contributor.
- `pub.layers.eprint.defs#date`: a structured or free-form date.
- `pub.layers.defs#licensing` (with `pub.layers.defs#licenseRef`): the licensing terms for a released artifact.

These definitions follow established interchange conventions rather than inventing a new vocabulary. The structured fields of `citation`, `creator`, and `date` are modeled on CSL-JSON (the JSON serialization used by citeproc, Zotero, and Pandoc) and the DataCite Metadata Schema (the standard for citing datasets and software). `licensing` mirrors a DataCite `rightsList` and encodes boolean relationships with an SPDX license expression. This page gives field-by-field mappings so that an importer can move metadata between CSL-JSON, BibTeX/BibLaTeX, DataCite, and Layers without information loss.

A `citation` is intentionally dual-mode. It can be a single raw formatted string (`raw`), a set of structured fields, or both. Consumers prefer the structured fields when present and fall back to `raw`. A valid `citation` populates at least `raw` or `title`.

The `citation` carries rendered bibliographic metadata. It does not replace the canonical link key: on a `pub.layers.eprint.eprint` record, `eprintIdentifier` and `eprintIdentifierType` (doi, arxiv, acl-anthology, semantic-scholar, pubmed, isbn, url, at-uri, custom) remain the identifier used to resolve and deduplicate the cited work.

## CSL-JSON

CSL-JSON is the interchange format that citeproc consumes and that Zotero and Pandoc emit. A CSL item is a JSON object with a `type`, name variables (`author`, `editor`, etc.), date variables (`issued`, `accessed`), and string variables (`title`, `container-title`, `DOI`, and so on). The Layers `citation` def maps onto a CSL item directly.

### Citation field mapping

| Layers `citation` field | CSL-JSON field | Notes |
|---|---|---|
| `type` | `type` | CSL item type slug. Most Layers known values (`article-journal`, `paper-conference`, `article`, `book`, `chapter`, `thesis`, `report`, `dataset`, `software`, `manuscript`, `webpage`, `entry`, `standard`) are CSL item types. `preprint` is a Layers extension: CSL has no standalone preprint type, so emit it to CSL as `article-journal` (or `article`) with a genre note. `custom` is also a Layers extension and is grounded via `typeUri`. `typeUri` grounds a community-defined type when the slug is insufficient. |
| `title` | `title` | Title of the work. |
| `creators` | `author`, `editor`, `translator`, etc. | Each `#creator` carries a `role`; the importer routes creators into the corresponding CSL name variable by role. See the creator mapping below. |
| `containerTitle` | `container-title` | Journal, book, or proceedings title. |
| `publisher` | `publisher` | Publisher name. |
| `publisherPlace` | `publisher-place` | Publisher location. |
| `issued` | `issued` | Issue/publication date. See the date mapping below. |
| `accessed` | `accessed` | Date the work was accessed. |
| `volume` | `volume` | |
| `issue` | `issue` | |
| `page` | `page` | Page range, e.g. `101-126`. |
| `edition` | `edition` | |
| `version` | `version` | Version of the cited artifact. |
| `doi` | `DOI` | DOI without the resolver prefix, e.g. `10.18653/v1/2020.acl-main.1`. |
| `url` | `URL` | |
| `isbn` | `ISBN` | |
| `issn` | `ISSN` | |
| `pmid` | `PMID` | PubMed ID. |
| `abstract` | `abstract` | |
| `language` | `language` | BCP-47 language tag. |
| `knowledgeRefs` | (no CSL field) | External grounding for the work or venue (Crossref, OpenAlex, DBLP, Semantic Scholar). Carried as `pub.layers.defs#knowledgeRef` entries rather than a CSL variable. |
| `raw` | (no CSL field) | Full formatted citation string. Use when structured fields are unavailable; not part of the CSL data model. |

### Creator (name variable) mapping

A CSL name variable is an array of name objects. Each object is either a structured personal name (with `family`, `given`, particles, and `suffix`) or a `literal` string (for organizations or unparsed names). The Layers `#creator` def carries the same parts, plus DataCite and ATProto-native grounding.

| Layers `creator` field | CSL name object field | Notes |
|---|---|---|
| `family` | `family` | Family/surname. |
| `given` | `given` | Given name(s). |
| `droppingParticle` | `dropping-particle` | e.g. `van` in some citation styles. |
| `nonDroppingParticle` | `non-dropping-particle` | e.g. `de la` when it sorts with the surname. |
| `suffix` | `suffix` | e.g. `Jr.`, `III`. |
| `literal` | `literal` | Full name as one string, or an organization name. |
| `role` | (selects the name variable) | `author` → `author`, `editor` → `editor`, `translator` → `translator`, and so on. CSL has no per-name role field; the role chooses which array the name goes into. |
| `sequence` | (array order) | 1-based position; CSL conveys order by array index. |
| `nameType` | (no CSL field) | `personal` vs `organizational`. CSL distinguishes these implicitly: organizations use `literal`. The explicit `nameType` is retained for DataCite (below). |
| `affiliation` | (no CSL field) | DataCite affiliation; not part of the CSL name object. |
| `agent` | (no CSL field) | ATProto DID grounding via `pub.layers.defs#agentRef`. |
| `knowledgeRef` | (no CSL field) | ORCID (source `orcid`), ROR, or OpenAlex grounding via `pub.layers.defs#knowledgeRef`. |

### Date mapping

The CSL date model uses `date-parts` (an array of `[year, month, day]` arrays) for structured dates and `literal` (or `raw`) for free-form dates. The Layers `#date` def maps onto both.

| Layers `date` field | CSL date field | Notes |
|---|---|---|
| `year` | `date-parts[0][0]` | Four-digit year. |
| `month` | `date-parts[0][1]` | 1-12. |
| `day` | `date-parts[0][2]` | 1-31. |
| `season` | `season` | |
| `circa` | `circa` | Boolean approximation flag. |
| `literal` | `literal` (or `raw`) | Free-form date string when structured parts are unavailable. |

When `year` (and optionally `month`/`day`) are set, emit `date-parts`. When only `literal` is set, emit a CSL `literal` date.

### Worked example

A Layers `citation` object:

```json
{
  "type": "paper-conference",
  "title": "Universal Decompositional Semantics on Universal Dependencies",
  "creators": [
    {
      "role": "author",
      "nameType": "personal",
      "family": "White",
      "given": "Aaron Steven",
      "sequence": 1,
      "knowledgeRef": { "source": "orcid", "identifier": "0000-0002-0410-2143" }
    },
    {
      "role": "author",
      "nameType": "personal",
      "family": "Reisinger",
      "given": "Drew",
      "sequence": 2
    }
  ],
  "containerTitle": "Proceedings of EMNLP",
  "publisher": "Association for Computational Linguistics",
  "issued": { "year": 2016 },
  "page": "1713-1723",
  "doi": "10.18653/v1/D16-1177"
}
```

The equivalent CSL-JSON item:

```json
{
  "type": "paper-conference",
  "title": "Universal Decompositional Semantics on Universal Dependencies",
  "author": [
    { "family": "White", "given": "Aaron Steven", "ORCID": "0000-0002-0410-2143" },
    { "family": "Reisinger", "given": "Drew" }
  ],
  "container-title": "Proceedings of EMNLP",
  "publisher": "Association for Computational Linguistics",
  "issued": { "date-parts": [[2016]] },
  "page": "1713-1723",
  "DOI": "10.18653/v1/D16-1177"
}
```

The ORCID is carried on the creator's `knowledgeRef` (source `orcid`) rather than as a name-object field. Some CSL extensions place an `ORCID` key on the name object, as shown; a strict CSL consumer ignores it and the ORCID survives in the Layers `knowledgeRef`.

## BibTeX and BibLaTeX

BibTeX (and its successor BibLaTeX) describe references with an entry type and a set of fields. The mapping to Layers runs through CSL, so the entry type maps to `citation.type` and most fields map to the corresponding `citation` field.

### Entry types

| BibTeX/BibLaTeX entry | Layers `citation.type` | Notes |
|---|---|---|
| `@article` | `article-journal` | Journal article. |
| `@inproceedings` / `@conference` | `paper-conference` | Conference paper. |
| `@book` | `book` | |
| `@incollection` / `@inbook` | `chapter` | Book chapter. |
| `@phdthesis` / `@mastersthesis` / `@thesis` | `thesis` | Use `features` or `notes` for the degree level. |
| `@techreport` / `@report` | `report` | |
| `@manual` | `report` or `standard` | Choose by content. |
| `@online` / `@misc` (with URL) | `webpage` | |
| `@dataset` (BibLaTeX) | `dataset` | |
| `@software` (BibLaTeX) | `software` | |
| `@unpublished` | `manuscript` or `preprint` | |

### Fields

| BibTeX/BibLaTeX field | Layers `citation` field | Notes |
|---|---|---|
| `author` | `creators` (role `author`) | BibTeX `Family, Given` and `Given Family` forms parse into `#creator` `family`/`given`; `and` separates creators. A bracketed corporate author maps to `literal` with `nameType` organizational. |
| `editor` | `creators` (role `editor`) | |
| `translator` (BibLaTeX) | `creators` (role `translator`) | |
| `title` | `title` | |
| `journal` / `journaltitle` | `containerTitle` | |
| `booktitle` | `containerTitle` | For chapters and conference papers. |
| `publisher` | `publisher` | |
| `address` / `location` | `publisherPlace` | |
| `year` (or `date` in BibLaTeX) | `issued` (`year`, optionally `month`/`day`) | BibLaTeX `date` is ISO 8601 and parses into `#date` parts. |
| `volume` | `volume` | |
| `number` | `issue` | |
| `pages` | `page` | Normalize `--` to `-`. |
| `edition` | `edition` | |
| `version` | `version` | |
| `doi` | `doi` | |
| `url` | `url` | |
| `urldate` (BibLaTeX) | `accessed` | |
| `isbn` | `isbn` | |
| `issn` | `issn` | |
| `pmid` (BibLaTeX) | `pmid` | |
| `abstract` | `abstract` | |
| `language` / `langid` | `language` | Map to a BCP-47 tag. |
| `note` | `raw` or `features` | Free-form notes have no structured slot; keep in `features` or fold into `raw`. |

## DataCite Metadata Schema

DataCite is the metadata standard for citing datasets, software, and other research outputs registered with a DOI. It is the right interchange when a Layers `citation` describes a `dataset` or `software` work, and it is the source of the `licensing` model. DataCite properties map onto Layers as follows.

### Core descriptive properties

| DataCite property | Layers equivalent | Notes |
|---|---|---|
| `creators` / `creator` | `citation.creators` | |
| `creatorName` | `#creator` `family`+`given`, or `literal` | |
| `nameType` (`Personal` / `Organizational`) | `#creator.nameType` (`personal` / `organizational`) | Use `nameTypeUri` for a community-defined type. |
| `givenName` / `familyName` | `#creator.given` / `#creator.family` | |
| `nameIdentifier` (ORCID) | `#creator.knowledgeRef` with source `orcid` | The ORCID is grounded as a `knowledgeRef`, not stored as a bare string. ROR (organizations) and OpenAlex author ids use the same field with sources `ror` and `openalex`. |
| `affiliation` | `#creator.affiliation` | |
| `contributorType` | `#creator.role` | DataCite contributor types map to the creator `role` slug (`editor`, `translator`, `contributor`, etc.); use `roleUri` for a community-defined role. |
| `title` | `citation.title` | |
| `publisher` | `citation.publisher` | |
| `publicationYear` | `citation.issued.year` | |
| `resourceTypeGeneral` | `citation.type` | DataCite `Dataset` → `dataset`, `Software` → `software`, `Text` → a text type such as `article-journal`, `JournalArticle` (resourceType) → `article-journal`, `ConferencePaper` → `paper-conference`, and so on. Use `typeUri` when no slug fits. |
| `version` | `citation.version` | |
| `language` | `citation.language` | |
| `descriptions` (`Abstract`) | `citation.abstract` | |
| `relatedIdentifiers` | `eprint.knowledgeRefs` / `citation.knowledgeRefs` | Related DOIs and other identifiers ground as `knowledgeRef` entries. |
| `identifier` (DOI) | `eprint.eprintIdentifier` (+ `eprintIdentifierType` `doi`) and `citation.doi` | The DOI is the canonical link key on the eprint record and is also carried structurally on the citation. |

### Rights (licensing) mapping

DataCite represents licensing as a `rightsList`: a list of `rights` entries, each with a human-readable name, a `rightsIdentifier` (typically an SPDX id), and a `rightsURI`. Layers represents the same information with `pub.layers.defs#licensing` and `pub.layers.defs#licenseRef`.

| DataCite rights property | Layers equivalent | Notes |
|---|---|---|
| `rightsList` | `licensing.licenses` | Array of license detail. |
| `rights` (entry) | `#licenseRef` | One license. |
| `rightsIdentifier` (SPDX id) | `#licenseRef.spdx` | SPDX identifier, e.g. `CC-BY-4.0`. `spdxUri` grounds a community-defined or non-SPDX license node. |
| `rights` text (name) | `#licenseRef.name` | Human-readable license name. |
| `rightsURI` | `#licenseRef.url` | URL of the full license text. |

The Layers `licensing` def adds an `expression` field that DataCite does not have: an SPDX license expression encoding the boolean relationship between licenses. Use `OR` for dual or multi-licensing where the licensee chooses one (`MIT OR Apache-2.0`), `AND` for composite terms where all apply (`CC-BY-4.0 AND LicenseRef-LDC-User-Agreement`), and `WITH` for license exceptions. A single governing license needs no `expression`. Each `#licenseRef` may scope itself to a component with `appliesTo` (for example `annotations`, `underlying-text`, `code`, `media`) when an artifact mixes licenses by part, and may carry `attribution` and `notes` for required credit text and usage terms.

### Worked example (dataset with licensing)

A Layers `eprint` record for a dataset, carrying a DataCite-style citation and licensing:

```json
{
  "$type": "pub.layers.eprint.eprint",
  "eprintIdentifier": "10.5072/example-uds",
  "eprintIdentifierType": "doi",
  "linkType": "described-in",
  "citation": {
    "type": "dataset",
    "title": "Universal Decompositional Semantics 2.0",
    "creators": [
      {
        "role": "author",
        "nameType": "organizational",
        "literal": "Decompositional Semantics Initiative",
        "knowledgeRef": { "source": "ror", "identifier": "00v76vg69" }
      }
    ],
    "publisher": "Decompositional Semantics Initiative",
    "issued": { "year": 2020 },
    "version": "2.0",
    "doi": "10.5072/example-uds"
  },
  "createdAt": "2026-06-22T00:00:00Z"
}
```

The corresponding `licensing` value, expressed where the artifact is released (for example on a `pub.layers.corpus.corpus` record's `licensing` field), with the text and the annotations under different terms:

```json
{
  "expression": "CC-BY-4.0 AND LicenseRef-LDC-User-Agreement",
  "licenses": [
    {
      "spdx": "CC-BY-4.0",
      "name": "Creative Commons Attribution 4.0 International",
      "url": "https://creativecommons.org/licenses/by/4.0/",
      "appliesTo": "annotations"
    },
    {
      "spdx": "custom",
      "spdxUri": "at://did:plc:example/pub.layers.ontology.typeDef/ldc-user-agreement",
      "name": "LDC User Agreement",
      "appliesTo": "underlying-text"
    }
  ]
}
```

## Conversion Notes

Moving bibliographic metadata into Layers:

1. Choose the `citation.type` from the source entry/resource type using the tables above.
2. Map name lists into `citation.creators`, routing each creator by `role` and grounding ORCID/ROR/OpenAlex identifiers on `knowledgeRef`.
3. Map dates into `#date`, preferring structured `year`/`month`/`day` and falling back to `literal`.
4. Map the remaining scalar fields (`title`, `containerTitle`, `doi`, `page`, and so on) directly.
5. When only a formatted reference string is available, populate `raw` and leave the structured fields empty.
6. Map any DataCite `rightsList` (or other license metadata) into `licensing`, using the SPDX `expression` to capture dual, composite, or exception relationships.
7. Set the canonical link key on the eprint record: `eprintIdentifier` plus `eprintIdentifierType` (for example the DOI).

The reverse conversion (Layers to CSL-JSON, BibTeX, or DataCite) reads the structured `citation` fields, falling back to `raw` only when the structured fields are absent.
