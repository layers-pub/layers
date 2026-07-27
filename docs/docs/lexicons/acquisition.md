---
sidebar_label: "Acquisition"
---

# pub.layers.acquisition

The acquisition namespace models the events that produce data and the people they capture: a `session` is a synchronized recording event with one or more streams, and a `participant` is a pseudonymous person or animal recorded in it. Together they give Layers a type level (`judgment.experimentDef`, a protocol) and a token level (a `session`, the event that ran it) that 0.8.0 lacked, and they carry the acquisition metadata that BIDS keeps in `participants.tsv`, `sessions.tsv`, and the electrophysiology sidecars, and that NWB keeps on `Subject` and the session object.

Two design commitments run through the namespace. First, the session clock is the shared time base: every stream offset and every anchor into a session is measured from `session.clock`, and `pub.layers.defs#mediaScope.sessionRef`, `media.syncInfo.sessionRef`, and a stream's `uuid` all resolve against it. Second, de-identification is by field absence, not by scrubbing. A participant record must not carry a name, an email, a DID, a handle, an institutional identifier, a worker-platform identifier, or any string derived from a birth date, and its `consent` block declares, in typed terms, whether the underlying bytes may live in a public PDS at all.

## Types

### participant
**NSID:** `pub.layers.acquisition.participant`
**Type:** Record (`key: any`)

A pseudonymous participant. De-identified by field absence. Required: `participantId`, `consent`, `createdAt`.

| Field | Type | Description |
|-------|------|-------------|
| `participantId` | string | Pseudonymous identifier, stable within the authoring repo and meaningless outside it (`sub-01`, `P17`). BIDS `participant_id`. Must not be a name, email, DID, handle, institutional or worker-platform identifier, or any string derived from a birth date. |
| `speciesUri` / `species` | at-uri / string | Species. Ground the NCBI Taxonomy binomial through `knowledgeRefs` (source `ncbi-taxonomy`) rather than a Layers-local vocabulary. Known values include `homo-sapiens`, `macaca-mulatta`, `mus-musculus`, `custom`. BIDS `species`; NWB `Subject.species`. |
| `strainRef` | ref | Strain for non-human subjects, grounded via `rrid`. BIDS `strain_rrid`; NWB `Subject.strain`. Ref: `pub.layers.defs#knowledgeRef`. |
| `genotype` | string | Genotype for non-human subjects. NWB `Subject.genotype`. |
| `ageMonths` | integer | Age at first participation in whole months (no floats). BIDS caps `age` at 89 years for privacy; values above 1068 should be clamped with `ageIsCapped`. May be omitted as a quasi-identifier in small populations. |
| `ageIsCapped` | boolean | True when `ageMonths` is clamped and the true value is greater. |
| `ageReferenceUri` / `ageReference` | at-uri / string | What `ageMonths` is measured from. NWB `Subject.age__reference`. Known values: `birth`, `gestational`, `post-natal-day`, `unknown`. |
| `sexUri` / `sex` | at-uri / string | Biological sex as recorded by the study. BIDS `sex`; NWB `Subject.sex`. Deliberately distinct from gender. Known values: `female`, `male`, `intersex`, `other`, `not-reported`, `undisclosed`. |
| `genderUri` / `gender` | at-uri / string | Self-reported gender. No BIDS or NWB counterpart; added because sociolinguistic and psycholinguistic work routinely collects it. Known values: `woman`, `man`, `non-binary`, `other`, `not-reported`, `undisclosed`. |
| `handednessUri` / `handedness` | at-uri / string | Handedness. BIDS `handedness`, a near-universal inclusion criterion in neurolinguistic work. Known values: `right`, `left`, `ambidextrous`, `not-reported`, `undisclosed`. |
| `handednessScore` | integer | Laterality quotient scaled to per mille (an Edinburgh Handedness Inventory score of -100.0 to +100.0 becomes -1000 to 1000). |
| `hearingStatusUri` / `hearingStatus` | at-uri / string | Hearing status, load-bearing for sign language and speech-perception research. Known values: `hearing`, `deaf`, `hard-of-hearing`, `deafblind`, `not-reported`, `undisclosed`. |
| `visionStatusUri` / `visionStatus` | at-uri / string | Vision status, relevant to eye-tracking and reading studies. Known values: `normal`, `corrected-to-normal`, `impaired`, `blind`, `not-reported`, `undisclosed`. |
| `weightGrams` | integer | Body weight in grams. NWB `Subject.weight`. Primarily an animal-work field. |
| `languageProfiles` | array | Per-language background, each a `languageCompetence`. A bare BCP-47 array cannot distinguish an L1 Finnish speaker with late L2 English from a simultaneous bilingual. Array of ref: `defs#languageCompetence`. |
| `languages` | array | Canonical BCP-47 tags this participant produced or comprehended data in, including sign language tags. A flat facet for filtering. No array-level cap. |
| `languageRefs` | array | Structured language references complementing `languages`. Array of ref: `pub.layers.defs#languageRef`. No array-level cap. |
| `consent` | ref | Required. The basis on which this participant's data may be published and redistributed. Ref: `defs#consent`. |
| `access` | ref | Conditions under which this participant's data may be obtained, when narrower than the collection's. Ref: `defs#accessCondition`. |
| `knowledgeRefs` | array | External grounding: `ncbi-taxonomy` for species, `rrid` for strain. Must not carry an ORCID or any identifier resolving to a named human. Array of ref: `pub.layers.defs#knowledgeRef`. |
| `metadata` | ref | Provenance for this participant record. Ref: `pub.layers.defs#annotationMetadata`. |
| `features` | ref | Study-specific variables (education, clinical group, screening scores). Must not reintroduce a direct identifier the typed fields deliberately omit. Ref: `pub.layers.defs#featureMap`. |
| `createdAt` | datetime | When this participant record was created. |

### session
**NSID:** `pub.layers.acquisition.session`
**Type:** Record (`key: any`)

A synchronized recording event: the token that instantiates an `experimentDef` protocol. Its clock is the shared time base every stream and anchor resolves against. Required: `sessionId`, `streams`, `createdAt`.

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Stable session identifier within the authoring repo (`ses-01`, `buckeye-s01-b03`). BIDS `session_id`; NWB `session_id`. |
| `label` | string | Human-readable label. NWB `session_description`. |
| `participantRefs` | array | AT-URIs of the `participant` records recorded. An array because dialogue, interview, and elicitation sessions have several, and each stream may belong to a different one. |
| `experimentRef` | at-uri | AT-URI of the `judgment.experimentDef` this session instantiates (a type-level protocol; the session is the token event that ran it). |
| `taskUri` / `task` | at-uri / string | What the participant was doing. Ground to the Cognitive Atlas via `knowledgeRefs`. BIDS `TaskName` is required in every EEG, MEG, iEEG, and NIRS sidecar. Known values include `rest`, `naturalistic-listening`, `reading`, `self-paced-reading`, `acceptability-judgment`, `picture-naming`, `lexical-decision`, `visual-world`, `elicitation`, `free-conversation`, `interview`, `narrative`, `map-task`, `custom`. |
| `startedAt` | datetime | Acquisition start. BIDS `acq_time`; NWB `session_start_time`. May be coarsened for de-identification; say so in `features` when it is. |
| `durationNanos` | integer | Session duration in nanoseconds. |
| `clockUri` / `clock` | at-uri / string | What t=0 means. Every stream offset and anchor is measured from it, so it cannot be left implicit. Known values: `session-start`, `first-stream-start`, `master-stream-start`, `first-trigger`, `wall-clock`, `custom`. |
| `masterStream` | ref | The stream whose clock defines t=0, when `clock` is `master-stream-start`. Ref: `pub.layers.defs#objectRef`. |
| `streams` | array | The synchronized media streams making up this session. Inline rather than an edge record because a session is authored by one party who controls all its streams. Array of ref: `defs#stream`. |
| `runs` | array | Sub-divisions of the session. BIDS `run-<index>`. A session routinely spans several runs at different sampling rates, which is why a session cannot carry one sampling rate. Array of ref: `defs#run`. |
| `devices` | array | Instruments used, structured rather than a free-text device string. Array of ref: `pub.layers.defs#deviceInfo`. |
| `presentation` | ref | How stimuli were displayed, including screen geometry (which gaze-on-screen eye-tracking requires). Ref: `pub.layers.judgment.defs#presentationSpec`. |
| `environmentUri` / `environment` | at-uri / string | Recording environment. Determines what a consumer may assume about noise floor, lighting, and interference. Known values: `sound-booth`, `laboratory`, `field`, `home`, `classroom`, `clinic`, `mri-scanner`, `meg-shielded-room`, `operating-room`, `online`, `custom`. |
| `siteRef` | ref | Institution or site, grounded via `ror`. Not an at-uri: an institution is an external entity. NWB `institution`/`lab`. Ref: `pub.layers.defs#knowledgeRef`. |
| `consent` | ref | Session-level consent when it differs from the participants' standing consent. Ref: `defs#consent`. |
| `access` | ref | Conditions under which this session's data may be obtained. Ref: `defs#accessCondition`. |
| `ethicsApprovals` | array | Human-subjects or animal-care approvals, each the shared `pub.layers.defs#ethicsApproval`. BIDS `EthicsApprovals`. Array of ref. |
| `licensing` | ref | Governs the artifact; `consent` governs the person; `access` governs the gate. Ref: `pub.layers.defs#licensing`. |
| `reproducibility` | ref | How the acquisition was driven computationally, plus funding. Ref: `pub.layers.defs#reproducibilityInfo`. |
| `eprintRefs` | array | AT-URIs of eprint records describing this session. |
| `knowledgeRefs` | array | Knowledge graph references (task via `cognitive-atlas`, site via `ror`). Array of ref: `pub.layers.defs#knowledgeRef`. |
| `metadata` | ref | Provenance for this session record. Ref: `pub.layers.defs#annotationMetadata`. |
| `features` | ref | Protocol deviations, timestamp coarsening, surgery, pharmacology, stimulus notes. NWB `protocol`/`surgery`/`pharmacology`/`stimulus_notes` land here. Ref: `pub.layers.defs#featureMap`. |
| `languages` | array | Canonical BCP-47 tags this session's data covers, including sign language tags. No array-level cap. |
| `languageRefs` | array | Structured language references complementing `languages`. Array of ref: `pub.layers.defs#languageRef`. No array-level cap. |
| `createdAt` | datetime | When this session record was created. |

### stream
**NSID:** `pub.layers.acquisition.defs#stream`
**Type:** Object

One synchronized media stream within a session. Required: `uuid`. The `uuid` requirement is load-bearing across partitions: `mediaScope.stream` and `media.syncInfo` both point at a stream by its uuid, and a session-local label string is a name join that cannot be validated.

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | ref | Stable identifier for this stream within this session. The addressable target of `mediaScope.stream`. Ref: `pub.layers.defs#uuid`. |
| `streamId` | string | Human-readable session-local label (`cam-left`, `lapel-a`, `eeg`, `eyetrack-right`). Display cache; `uuid` is the join key. |
| `mediaRef` | at-uri | AT-URI of the `media.media` carrying this stream. |
| `mediaCid` | string | CID of the media revision this session's offsets were measured against. |
| `participantRef` | at-uri | AT-URI of the `participant` this stream records, when streams are per-participant. |
| `streamRoleUri` / `streamRole` | at-uri / string | What this stream is for, distinct from the medium's kind (two audio streams can be close-talk and room, the same kind and not interchangeable). Known values include `primary`, `reference`, `close-talk`, `far-field`, `camera`, `face`, `hands`, `neural`, `physiological`, `gaze`, `motion`, `articulatory`, `stimulus`, `trigger`, `custom`. |
| `offsetNanos` | integer | Signed offset from the session clock's zero to this stream's first sample. Negative when the stream began before t=0 (BIDS `StartTime` permits it). Duplicates `media.sync.offsetNanos`; the session is authoritative. |
| `driftPartsPerBillion` | integer | Signed measured clock drift against the session master. Zero is a claim, not a safe default. |
| `syncMethodUri` / `syncMethod` | at-uri / string | How this stream was aligned, the same node set as `media.defs#syncInfo.clockSourceUri`. Known values: `hardware-trigger`, `shared-clock`, `ltc-timecode`, `clapperboard`, `audio-cross-correlation`, `ptp`, `ntp`, `manual`, `unsynchronized`, `custom`. |
| `syncUncertaintyNanos` | integer | Estimated alignment uncertainty. A hardware trigger and a clapperboard differ by three orders of magnitude. |
| `features` | ref | Stream-specific properties. Ref: `pub.layers.defs#featureMap`. |

### run
**NSID:** `pub.layers.acquisition.defs#run`
**Type:** Object

An uninterrupted sub-division of a session with the same acquisition parameters and task. BIDS `run-<index>`. Required: `uuid` (the target of `motionInfo.trackingSystem`).

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | ref | Stable identifier for this run within this session. Ref: `pub.layers.defs#uuid`. |
| `runIndex` | integer | 0-based run number within the session. |
| `label` | string | Human-readable run name. |
| `taskUri` / `task` | at-uri / string | This run's task, when it differs from the session's. |
| `streams` | array | Streams active during this run, as `objectRef`s into the session's streams. |
| `startNanos` | integer | Signed start on the session clock. |
| `durationNanos` | integer | Run duration in nanoseconds. |
| `eventLayerRef` | at-uri | AT-URI of a `pub.layers.annotation.annotationLayer` of kind tier carrying this run's trigger and event codes. Where BIDS `events.tsv` lands. |
| `judgmentSetRefs` | array | AT-URIs of `pub.layers.judgment.judgmentSet` records collected during this run. |
| `features` | ref | Run-specific properties. Ref: `pub.layers.defs#featureMap`. |

### consent
**NSID:** `pub.layers.acquisition.defs#consent`
**Type:** Object

The basis on which a participant's data may be published and redistributed. Required: `status`, `scope`, `identifiability`. The three typed axes decide whether the underlying bytes may live in Layers at all: `identifiability` of `identifiable`, or `scope` of `not-redistributable`/`controlled-access`, is a hard signal to reference the data by `media.externalUri` behind a gate rather than carry it as a Layers blob.

| Field | Type | Description |
|-------|------|-------------|
| `statusUri` / `status` | at-uri / string | Current consent status. A consumer must not redistribute data whose status is `withdrawn`. Known values: `granted`, `granted-with-restrictions`, `withdrawn`, `expired`, `not-reported`. |
| `scopeUri` / `scope` | at-uri / string | What redistribution the participant agreed to. Known values: `public`, `research-only`, `restricted`, `controlled-access`, `not-redistributable`, `not-reported`. |
| `identifiabilityUri` / `identifiability` | at-uri / string | How identifiable the retained data is. Known values: `anonymous`, `pseudonymous`, `de-identified`, `identifiable`, `not-reported`. |
| `ethicsApprovals` | array | Approvals this consent falls under, reusing `pub.layers.defs#ethicsApproval`. Array of ref. |
| `grantedAt` | datetime | When consent was granted. May be coarsened. |
| `expiresAt` | datetime | When consent expires, if it does. |
| `withdrawnAt` | datetime | When consent was withdrawn. Its presence obliges the publisher to delete or tombstone the associated records and every indexer to suppress them. It cannot guarantee erasure: Layers is a read-only indexer with no authority over third-party consumers. Do not write into a Layers record anything whose later erasure you would need to guarantee. |
| `withdrawalContact` | string | Where a withdrawal request should be sent: a URL or institutional address, never a personal one. |
| `notes` | string | Free-text consent detail the typed fields do not capture. |

### languageCompetence
**NSID:** `pub.layers.acquisition.defs#languageCompetence`
**Type:** Object

Per-language background for a participant. Composes `pub.layers.defs#languageRef` (whose `role` carries `l1`, `l2`, `heritage`, `signed-l1`, `signed-l2`) plus a proficiency axis. A hearing L2 signer and a deaf L1 signer are different participants for essentially every research question. Required: `language`.

| Field | Type | Description |
|-------|------|-------------|
| `language` | ref | The language, including sign languages (`ase`, `bfi`, `gsg`). Ref: `pub.layers.defs#languageRef`. |
| `proficiencyUri` / `proficiency` | at-uri / string | Proficiency. Known values: `native`, `near-native`, `advanced`, `intermediate`, `beginner`, `receptive-only`, `not-reported`. |
| `ageOfAcquisitionMonths` | integer | Age of first exposure in whole months. |
| `features` | ref | Competence detail not yet promoted to a typed field. Ref: `pub.layers.defs#featureMap`. |

## XRPC Queries

### getParticipant
**NSID:** `pub.layers.acquisition.getParticipant`

Retrieve a single participant record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the participant record. |

**Output**: `{ uri, cid, value: participant }`.

### listParticipants
**NSID:** `pub.layers.acquisition.listParticipants`

List participant records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | at-identifier (required) | The DID or handle of the repository. |
| `species` | string | Filter by species slug. |
| `language` | string | Filter by a canonical BCP-47 tag in `languages`. |
| `limit`, `cursor` | integer, string | Pagination. |

**Output**: `{ records: { uri, cid, value: participant }[], cursor? }`.

### getSession
**NSID:** `pub.layers.acquisition.getSession`

Retrieve a single session record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the session record. |

**Output**: `{ uri, cid, value: session }`.

### listSessions
**NSID:** `pub.layers.acquisition.listSessions`

List session records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | at-identifier (required) | The DID or handle of the repository. |
| `task` | string | Filter by task slug. |
| `participant` | string | Filter by an AT-URI in `participantRefs`. |
| `limit`, `cursor` | integer, string | Pagination. |

**Output**: `{ records: { uri, cid, value: session }[], cursor? }`.
