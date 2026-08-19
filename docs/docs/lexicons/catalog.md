---
sidebar_label: "Catalog"
---

# pub.layers.catalog

The catalog namespace models browsable, citable, nestable collections of Layers records. It is the answer to a question the produce records cannot answer on their own: what datasets exist, how they nest, which level a researcher should cite, and how many things each contains. A `collection` is a node in a containment tree (a project, a language group, a release, a treebank, a neuro-dataset); a `membership` is a typed edge into one. Counts are declared on a collection's `contentSummary` and derived, on demand, by the `getRollup` query.

The design turns on three separations. Containment is child-held: a child names its `parentRef`, because a child's PDS can always write that link whereas nothing can compel a parent's PDS to write a member array. Versioning is orthogonal to containment: a release is a `versionOf` its concept node, never a child of it, so summing releases as children cannot inflate a project's counts. And arithmetic is role-scoped: of the fifteen-plus membership roles, exactly two (`member` and `produce`) contribute to a rollup, so a cross-family relation such as "PropBank-SRL annotates UD English-EWT" renders on both pages and adds to neither count.

There is no `pub.layers.index.*` namespace and no `dataset.*` reference anywhere; the browsable artifact is always a `catalog.collection`.

## Types

### collection
**NSID:** `pub.layers.catalog.collection`
**Type:** Record (`key: any`)

A named collection of Layers records: a node in a containment tree. Container-ness is carried by `kind` rather than a separate record type. Required: `name`, `kind`, `createdAt`.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable name, as the community writes it ('UD English-EWT', 'MegaAcceptability Linking v1'). |
| `localId` | string | Stable, lowercase, immutable local identifier within the publishing account ('ewt', 'eng', 'ud'). Survives handle changes and record rebuilds, which AT-URIs do not. Advisory for resolution; `parentRef` is the link. |
| `description` | string | Prose description of what this collection is and contains. |
| `kindUri` | at-uri | AT-URI of the collection kind definition node (a `catalog-kind` typeDef under `layers-core.ontology.layers.pub`, or a `pub.layers.graph.graphNode`). Refines `kind`; never replaces it. |
| `kind` | string | Collection kind slug. Required, so a consumer that has not indexed the ontology can still render and facet. Known values include `project`, `language-group`, `sub-project`, `release`, `treebank`, `corpus`, `annotated-corpus`, `parallel-corpus`, `speech-corpus`, `sign-language-corpus`, `multimodal-corpus`, `neuro-dataset`, `eye-tracking-dataset`, `motion-dataset`, `experiment-series`, `judgment-study`, `stimulus-set`, `lexicon`, `frame-inventory`, `wordnet`, `ontology`, `benchmark`, `shared-task`, `custom`. |
| `parentRef` | at-uri | AT-URI of the containing `catalog.collection`. Child-held and single-valued: the canonical containment spine. Must not be self-referential directly or transitively; the appview rejects cycles at index time. |
| `rootRef` | at-uri | AT-URI of the root of this collection's parent chain, denormalized so subtree selection is an indexed equality rather than a recursive chase. |
| `depth` | integer | Number of `parentRef` hops from the root (0 for a project, 1 for UD English under UD, 2 for UD English-EWT). Denormalized for subtree queries and a validity check on the observed chain. |
| `version` | string | Version or release designation ('2.18', 'v2.1', 'FrameNet 1.7'). Present on a release node; usually absent on the concept node above it. |
| `versionOfRef` | at-uri | AT-URI of the concept-level collection this record is a released version OF. A release is a `versionOf` its concept node, never a child of it. |
| `previousVersionRef` | at-uri | AT-URI of the release this one directly supersedes, forming a version chain. |
| `currentVersionRef` | at-uri | AT-URI of the release a consumer should treat as current. Written on the concept node; a rollup over a concept node resolves through it. |
| `supersededByRef` | at-uri | AT-URI of the collection that replaces this one after a withdrawal or rename. |
| `firstReleasedAt` | datetime | When this collection was first released publicly (for imported material, decades before the Layers record). |
| `releasedAt` | datetime | When this particular version was released. |
| `pinPolicyUri` | at-uri | AT-URI of the pin-policy definition node (`pin-policy` typeDef). Refines `pinPolicy`. |
| `pinPolicy` | string | Whether membership is pinned to exact member revisions or tracks them. Declared, not enforced. Known values: `pinned`, `floating`, `undeclared`. |
| `stabilityUri` | at-uri | AT-URI of the stability definition node (`stability` typeDef). Refines `stability`. |
| `stability` | string | Lifecycle state. Known values: `draft`, `active`, `maintained`, `frozen`, `deprecated`, `withdrawn`. |
| `stabilityNotice` | string | Prose explaining a deprecation or withdrawal, and where to go instead. |
| `accessUri` | at-uri | AT-URI of the access-condition definition node. Refines `access`. |
| `access` | string | Access conditions on the underlying material. Distinct from licensing, which states what a recipient may do; this states who may become a recipient. Known values: `open`, `registration-required`, `agreement-required`, `restricted`, `embargoed`, `closed`. |
| `embargoedUntil` | datetime | When an embargo lifts, present when `access` is `embargoed`. |
| `contents` | array | Publisher-declared summary of what this collection contains, one entry per produce type and narrowing. Makes a browse row renderable without paging the produces. Never authoritative over the appview's computed rollup. Array of ref: `defs#contentSummary`. |
| `citation` | ref | How to cite this collection, and whether this is the level that should be cited. Ref: `defs#citation`. |
| `homepage` | uri | Canonical project or dataset homepage. |
| `languages` | array | Canonical BCP-47 tags this collection covers. Language is a facet, never a level; rolls up as a set union over the containment spine. No array-level cap; the record size limit governs. Array of string (item max 32). |
| `languageRefs` | array | Structured language references, present when a bare tag is insufficient. Array of ref: `defs#languageRef` (root). No array-level cap. |
| `ontologyRefs` | array | AT-URIs of `pub.layers.ontology.ontology` records defining the type systems used. |
| `knowledgeRefs` | array | External groundings for this collection as an entity (Wikidata, ROR, OpenAlex, DOI, LDC, LINDAT, OpenNeuro, PARADISEC). Array of ref: `pub.layers.defs#knowledgeRef`. |
| `eprintRefs` | array | AT-URIs of `pub.layers.eprint.eprint` records describing this collection. Inherited by descendants that declare none. |
| `licensing` | ref | Licensing terms (single, dual, multi, composite, or component-scoped). Ref: `pub.layers.defs#licensing`. |
| `reproducibility` | ref | How this collection was built, including funding and ethics approvals. Ref: `pub.layers.defs#reproducibilityInfo`. |
| `metadata` | ref | Provenance for this collection record. Ref: `pub.layers.defs#annotationMetadata`. |
| `features` | ref | Open-ended features. Ref: `pub.layers.defs#featureMap`. |
| `createdAt` | datetime | When this Layers record was written. Distinct from `firstReleasedAt` and `citation.publishedAt`. |

### membership
**NSID:** `pub.layers.catalog.membership`
**Type:** Record (`key: any`)

A typed edge from a container collection to a member. Covers Layers records, sub-record objects, and members Layers does not hold. Required: `catalogRef`, `member`, `role`, `createdAt`.

| Field | Type | Description |
|-------|------|-------------|
| `catalogRef` | at-uri | AT-URI of the `catalog.collection` at the container end. |
| `member` | ref | The thing at the other end, as an `objectRef` plus a denormalized NSID and optional pinning CID. Ref: `defs#memberRef`. |
| `roleUri` | at-uri | AT-URI of the membership role definition node (`membership-role` typeDef, or a `graphNode`). Refines `role`. |
| `role` | string | What this edge asserts. Required; the field that decides arithmetic. Exactly two roles sum in a rollup: `produce` (a corpus, annotation layer, media item, ontology this collection publishes) and `member` (a nested collection on the containment spine). Every other role is rendered and never summed. Known values: `member`, `produce`, `annotates`, `derived-from`, `subset-of`, `translation-of`, `parallel-with`, `aligned-with`, `registry-for`, `typed-by`, `replicates`, `extends`, `mirror-of`, `same-as`, `stimulus-for`, `documented-by`, `custom`. |
| `ordinal` | integer | Ordering index within the container, when it has a meaningful order. Absent means unordered. |
| `pinPolicyUri` | at-uri | AT-URI of the pin-policy definition node. Refines `pinPolicy`. |
| `pinPolicy` | string | Pin policy for this edge specifically, overriding the container's declaration. Known values: `pinned`, `floating`, `undeclared`. |
| `validFrom` | datetime | When this membership took effect. Lets two releases carry different member sets as coexisting edges. |
| `validUntil` | datetime | When this membership ceased. A dropped member is expressed by closing its edge, not deleting it. |
| `selfAsserted` | boolean | True when the edge's author does not control the member (the normal case for `annotates`, `derived-from`, `parallel-with`). |
| `notes` | string | Prose qualifying the edge: what was projected, excluded, or approximate. |
| `knowledgeRefs` | array | External groundings for the relation itself. Array of ref: `pub.layers.defs#knowledgeRef`. |
| `eprintRefs` | array | AT-URIs of eprint records documenting this relation. |
| `metadata` | ref | Provenance for this edge. Ref: `pub.layers.defs#annotationMetadata`. |
| `features` | ref | Open key-value map for edge-specific attributes. Ref: `pub.layers.defs#featureMap`. |
| `createdAt` | datetime | When this membership edge record was created. |

### memberRef
**NSID:** `pub.layers.catalog.defs#memberRef`
**Type:** Object

The member end of a membership edge. Required: `ref`, `memberType`.

| Field | Type | Description |
|-------|------|-------------|
| `ref` | ref | The member. Populate `recordRef` for a Layers record, `recordRef` plus `objectId` for a sub-record object, `knowledgeRef` for a member Layers does not hold. Composes `pub.layers.defs#objectRef`. |
| `memberType` | string | NSID of the member's record type, denormalized so a member list can dispatch its renderer and filter by type without resolving every AT-URI. Mirrors the NSID-discriminator pattern of `pub.layers.changelog.entry#subjectCollection`. Empty string when the member is `knowledgeRef`-only. Known values are the member record-type NSIDs (`pub.layers.corpus.corpus`, `pub.layers.annotation.annotationLayer`, `pub.layers.media.media`, `pub.layers.acquisition.session`, and the rest). |
| `memberCid` | string | CID of the exact member revision this edge pins. Required in practice under `pinned`. Pins the member's record, not its contents. |
| `memberVersion` | string | Display cache of the member's version string. Advisory. |
| `memberName` | string | Display cache of the member's name, advisory exactly as an ATProto handle is. Lets a container render a member list before its members are indexed. |

### contentSummary
**NSID:** `pub.layers.catalog.defs#contentSummary`
**Type:** Object

A publisher-declared bucket describing one slice of a collection's contents: how many units of what produce type, in what modality, at what annotation subkind, produced how. This is what makes a browse row renderable without a crawl. Every entry states its `countSource`, so a consumer can tell a declared figure from a computed one and from an absent one. Required: `produceCollection`, `countSource`.

| Field | Type | Description |
|-------|------|-------------|
| `produceCollection` | string | NSID of the produce record type this bucket summarizes. Takes the same value space as `memberRef.memberType` so a summary and an edge over the same produce join without translation. |
| `kindUri` / `kind` | at-uri / string | Kind of the bucket, drawing on the kind vocabulary of the record type named by `produceCollection` (polymorphic by construction). |
| `subkindUri` / `subkind` | at-uri / string | Annotation subkind, the primary selection criterion for corpus and NLP browsing. Known values include `pos`, `ner`, `dependency`, `enhanced-dependency`, `constituency`, `frame`, `coreference`, `discourse-relation`, `temporal-relation`, `gloss`, `prosody`, `tobi`, `code-switch`, `custom`. |
| `modalityUri` / `modality` | at-uri / string | Modality of the contents. The SAME node set as `judgment.defs#recordingMethod.methodUri` and `media.defs#signalInfo.modalityUri`, so a recording, the experiment that produced it, and the catalogue entry advertising it join on one vocabulary. Distinct from `media.kindUri` (the carrier); each modality node reaches its carrier by `parentTypeRef`. Known values include `text`, `speech-audio`, `sign-language-video`, `eeg`, `meg`, `ieeg`, `fmri`, `fnirs`, `eye-tracking`, `motion-capture`, `custom`. |
| `count` | integer | How many units this bucket holds. Meaningless without `countSource`. |
| `unitUri` / `unit` | at-uri / string | Unit of the count. Known values include `expression`, `sentence`, `token`, `annotation`, `tree`, `cluster`, `document`, `media-item`, `session`, `participant`, `trial`, `judgment`, `custom`. |
| `countSourceUri` / `countSource` | at-uri / string | Where `count` came from. Required, because an unqualified number in a catalogue is a claim the catalogue cannot support. Known values: `declared`, `computed`, `estimated`, `unavailable`. |
| `countIsExact` | boolean | Whether `count` is exact rather than rounded or floored. |
| `sourceMethodUri` / `sourceMethod` | at-uri / string | How the contents were produced. The gold-versus-silver discriminator and the single most requested filter in corpus browsing. Known values: `manual`, `double-annotated-adjudicated`, `semi-automatic`, `automatic`, `projected`, `converted`, `crowdsourced`, `native`, `synthetic`, `custom`. |
| `formalismUri` / `formalism` | at-uri / string | Annotation formalism. Known values include `universal-dependencies`, `penn-treebank`, `abstract-meaning-representation`, `propbank`, `framenet`, `conll-u`, `bids`, `nwb`, `custom`. |
| `languages` | array | Canonical BCP-47 tags this bucket covers, when narrower than the collection's own. No array-level cap. |
| `exampleRefs` | array | AT-URIs of a few representative records, so a browse row renders a real example without a query. |
| `asOf` | datetime | When this summary was last recomputed by its publisher. |
| `features` | ref | Open key-value map. Ref: `pub.layers.defs#featureMap`. |

### citation
**NSID:** `pub.layers.catalog.defs#citation`
**Type:** Object

How to cite a collection, and whether this is the level that should be cited. Presence marks a node as citable; `creditPolicy` delegates upward or downward when it is not. This is what lets one index serve three communities at once: UniMorph's 186 language datasets share one paper (`cite-self`), while UD researchers cite the treebank rather than the project (`cite-children`).

| Field | Type | Description |
|-------|------|-------------|
| `creditPolicyUri` / `creditPolicy` | at-uri / string | Where the publisher wants credit to land. Known values: `cite-self`, `cite-children`, `cite-parent`, `cite-both`, `do-not-cite`. Umbrella collections should default to `cite-children`. |
| `citeAs` | string | The publisher's preferred citation string, as prose (the residue after authors, publisher, and identifiers are given structurally). |
| `authors` | array | Authors or maintainers credited, as `agentRef`s so an ORCID grounds a person and a DID grounds an ATProto contributor. Array of ref: `pub.layers.defs#agentRef`. |
| `publisher` | ref | The publishing organization or repository, grounded via `ror`, `lindat`, `ldc`, `elra`, `openneuro`, or `wikidata`. Not free text. Ref: `pub.layers.defs#knowledgeRef`. |
| `identifiers` | array | Persistent identifiers, grounded via `doi`, `handle`, `islrn`, `datacite`, `openalex`, or `ror`. Gives a persistent identifier to the level researchers actually name. Array of ref: `pub.layers.defs#knowledgeRef`. |
| `publishedAt` | datetime | Publication date used in a citation. Distinct from `createdAt`. |
| `acknowledgement` | string | Acknowledgement text the publisher asks downstream users to reproduce. |

## XRPC Queries

### getCollection
**NSID:** `pub.layers.catalog.getCollection`

Retrieve a single collection with optional descendants and ancestors.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | AT-URI of the collection. |
| `depth` | integer | How many levels of descendants to include. 0 returns the record alone. Capped at 3, because browse renders two levels and a count, never a tree. |
| `includeAncestors` | boolean | Include the `parentRef` chain up to the root, for breadcrumbs. |
| `resolvePins` | boolean | When the collection declares `pinPolicy` `pinned`, resolve each member at the CID its edge names. |

**Output**: a `collectionView` `{ uri, cid, value: collection, descendantCollectionCount, childCount }`.

### listCollections
**NSID:** `pub.layers.catalog.listCollections`

Search and facet-filter collections. This is the corpus-discovery surface: the same record type, filtered to the level each community names.

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | at-identifier | Restrict to collections published by this repo. Omit to search all indexed repos. |
| `q` | string | Free-text query over name and description. |
| `kindUri` / `kind` | array | Filter by collection-kind node or slug. |
| `parentRef` | at-uri | Direct children of this collection only. |
| `rootRef` | at-uri | Everything in this collection's subtree along the containment spine, at any depth (an indexed equality on the denormalized `rootRef`). |
| `depth` | integer | Restrict to collections at exactly this depth. |
| `citableOnly` | boolean | Restrict to collections whose `citation.creditPolicy` is `cite-self` or `cite-both`. |
| `languages` | array | Filter by canonical BCP-47 tag. A facet, never a level. |
| `modalityUri` / `modality` | array | Filter by modality over contents (`eeg`, `sign-language-video`, `speech-audio`, `fmri`, `eye-tracking`, `text`). |
| `annotationSubkindUri` / `annotationSubkind` | array | Filter by annotation subkind over contents (`dependency`, `coreference`, `frame`). |
| `sourceMethodUri` / `sourceMethod` | array | The gold-versus-silver discriminator. |
| `spdxUri` / `spdx` | array | Filter by license. |
| `accessUri` / `access` | array | Filter by access condition. |
| `stability` | array | Filter by lifecycle state. Defaults to excluding `withdrawn`. |
| `sort` | string | Result ordering. Known values: `relevance`, `name`, `created`, `released`, `size`. |
| `limit`, `cursor` | integer, string | Pagination. |

### listMembers
**NSID:** `pub.layers.catalog.listMembers`

List the members of a collection.

| Parameter | Type | Description |
|-----------|------|-------------|
| `collection` | at-uri (required) | AT-URI of the container collection. |
| `roleUri` / `role` | array | Filter by membership role. Only `member` and `produce` contribute to rollups; the rest are rendered and never summed. |
| `memberType` | array | Filter by the member's NSID, which the edge denormalizes as `memberRef.memberType` so no AT-URI resolution is needed. |
| `includeSelfAsserted` | boolean | Include edges whose author does not control the member. |
| `asOf` | datetime | Return the membership as it stood at this instant, honouring `validFrom`/`validUntil`. |
| `resolvePins` | boolean | Resolve each member at the CID its edge names. |
| `limit`, `cursor` | integer, string | Pagination. |

**Output**: `membershipView[]` `{ uri, cid, value: membership, memberResolved, memberCidResolved, memberCollectionValue }`; `memberCollectionValue` is the member record itself when it is a nested collection, so a child list renders in one call.

### listContainers
**NSID:** `pub.layers.catalog.listContainers`

The inverse of `listMembers`: find the collections that contain a given record.

| Parameter | Type | Description |
|-----------|------|-------------|
| `member` | at-uri (required) | AT-URI of the record to find containers for (a collection, corpus, annotation layer, media item, judgment set, ontology, or any member type). |
| `roleUri` / `role` | array | Filter by role slug. |
| `includeSelfAsserted` | boolean | Include edges asserted by parties that do not control this record. |
| `trustUri` / `trust` | string | Which asserting parties to include. Known values: `self-asserted`, `curated`, `open`. |
| `limit`, `cursor` | integer, string | Pagination. |

**Output**: `containerView[]` `{ uri, cid, value: membership, container: collectionView, contributesToRollup }`; `contributesToRollup` is false for every cross-family relation, which is what keeps a parallel-corpus grouping browsable while contributing zero to the counts of treebanks it does not own.

### getRollup
**NSID:** `pub.layers.catalog.getRollup`

The derived-counts surface. Walks the containment spine (`member` and `produce` edges) from a collection and returns deduplicated sums and optional facet buckets. There is no `index.aggregate`; declared counts live on `contentSummary`, computed counts come from here.

| Parameter | Type | Description |
|-----------|------|-------------|
| `collection` | at-uri (required) | AT-URI of the collection to roll up. |
| `maxDepth` | integer | Limit the subtree walk. Omit for the whole subtree. |
| `resolveVersion` | boolean | When the collection is a concept node carrying `currentVersionRef`, roll up that release rather than every release (releases are `versionOf`, never children, so they never sum). |
| `includeFacets` | boolean | Include the facet buckets. Sums alone are cheaper. |
| `facetDimensionUri` / `facetDimension` | array | Restrict faceting to these dimensions. Known dimensions: `language`, `modality`, `annotation-kind`, `annotation-subkind`, `formalism`, `source-method`, `license`, `access`, `collection-kind`, `produce-type`, `publisher`, `custom`. |
| `trustUri` / `trust` | string | Which asserting parties to include (`self-asserted`, `curated`, `open`). |

**Output**: deduplicated counts, `facet[]` buckets (each a `dimension` plus `facetValue[]` of `{ value, count, label }`), and `rollupWarning[]`. A warning carries a `code` (`count-unavailable`, `count-declared-only`, `member-unindexed`, `pin-dangling`, `vocabulary-unresolved`, `depth-truncated`, `cycle-detected`, `parent-mismatch`, `language-tag-non-canonical`, `license-non-spdx`, `custom`) and the `subjectRef` it concerns, so a stale or partial rollup announces itself rather than presenting an absence as a zero.
