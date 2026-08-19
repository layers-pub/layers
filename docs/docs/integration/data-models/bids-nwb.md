# BIDS and NWB

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>Brain Imaging Data Structure (BIDS) and Neurodata Without Borders (NWB)</dd>
<dt>Origin</dt>
<dd>INCF and the BIDS community (BIDS); the NWB:N project (NWB)</dd>
<dt>Specification</dt>
<dd>BIDS specification (filesystem layout plus JSON/TSV sidecars); NWB:N (HDF5-backed neurophysiology container)</dd>
<dt>Key Reference</dt>
<dd><a href="https://www.nature.com/articles/sdata201644">Gorgolewski et al. 2016</a> (BIDS); <a href="https://elifesciences.org/articles/78362">Rübel et al. 2022</a> (NWB)</dd>
</dl>
</div>

## Overview

BIDS and NWB are the two dominant standards for organizing and sharing neuroscientific data. BIDS is a filesystem convention with JSON sidecars and TSV tables covering EEG, MEG, iEEG, fNIRS, fMRI, PET, eye-tracking, and motion. NWB is a single-file HDF5 container for neurophysiology, centred on a `Subject` and a session of `TimeSeries`. The Layers lexicons are designed so that a BIDS dataset or an NWB file can be represented without information loss: the acquisition namespace carries the subject and session model, the media namespace carries the per-recording sidecars as typed metadata, and the `signalSpan` anchor carries the events and derived annotations.

The mapping is deliberate, not incidental. Where BIDS and NWB agree, the Layers field cites both; where a value is free text upstream (BIDS `EEGReference`, `Manufacturer`, `EthicsApprovals`), Layers types the common cases and keeps a free-text residue; where a value would be a Layers-local enum, it grounds through `knowledgeRef` instead (species via `ncbi-taxonomy`, anatomy via `uberon`, task via `cognitive-atlas`, tools and strains via `rrid`).

## The subject and session model

| BIDS / NWB concept | Layers equivalent | Notes |
|---|---|---|
| **`participants.tsv` row** / **NWB `Subject`** | `pub.layers.acquisition.participant` | `participant_id` → `participantId`; `species` → `species` (grounded via `ncbi-taxonomy` in `knowledgeRefs`); `sex` → `sex`; `handedness` → `handedness`; `age` → `ageMonths` (with `ageIsCapped` for the BIDS 89-year cap); NWB `strain`/`genotype`/`weight` → `strainRef`/`genotype`/`weightGrams`. |
| **`sessions.tsv` row** / **NWB session** | `pub.layers.acquisition.session` | `session_id` → `sessionId`; `acq_time` / NWB `session_start_time` → `startedAt`; NWB `institution`/`lab` → `siteRef` (grounded via `ror`). |
| **BIDS `TaskName`** | `session.task` / `session.taskUri` | Required in every EEG/MEG/iEEG/NIRS sidecar. Grounded to the Cognitive Atlas via `knowledgeRefs`. |
| **`run-<index>`** | `acquisition.defs#run` | An uninterrupted repetition with the same parameters; carries its own `eventLayerRef` where `events.tsv` lands. |
| **BIDS `EthicsApprovals`** / IRB | `session.ethicsApprovals` (shared `defs#ethicsApproval`) | Free-text array upstream; typed here with `protocolId` and a `bodyRef` grounded via `ror`. |
| **BIDS `Funding`** | `reproducibilityInfo.funding` (shared `defs#fundingRef`) | Free-text array upstream; typed here with `awardId` and a `funderRef`. |
| **Data use agreement / access** | `pub.layers.defs#accessCondition` on participant, session, and media | Distinct from licensing and consent; `mode`, `permittedUse`, `agreementUri`. |

Consent and identifiability have no single BIDS or NWB field but govern whether the bytes may live in Layers at all. `acquisition.defs#consent` types the `status`, `scope`, and `identifiability` axes; `identifiable` data, or data whose scope is `controlled-access`/`not-redistributable`, is referenced by `media.externalUri` behind a gate rather than carried as a Layers blob.

## The recording and its sidecar

Each BIDS recording or NWB `TimeSeries` becomes a `pub.layers.media.media` record whose `kind` is the carrier (`signal`, `volume`, `motion`, `image`) and whose typed info block carries the sidecar. Every medium of one synchronized recording shares a `sessionRef` and fills a session `stream`.

| BIDS / NWB sidecar | Layers field | Notes |
|---|---|---|
| **EEG/MEG/iEEG/NIRS JSON sidecar** | `media.signalInfo` | `SamplingFrequency` → `samplingFrequencyMilliHz`; `PowerLineFrequency` → `powerLineFrequencyMilliHz`; `EEGReference`/`iEEGReference` → `referenceScheme` (+ `referenceDescription` residue); `EEGGround` → `groundSensor`; `SoftwareFilters`/`HardwareFilters` → `filters[]`; `RecordingType` → `recordingType`; MEG `DewarPosition`, `DigitizedLandmarks`, `AssociatedEmptyRoom` → the matching typed fields. |
| **`channels.tsv`** / NWB electrodes table | `signalInfo.channels[]` (`signalChannel`) | `name`/`type`/`units` (all required upstream) → `name`/`type`/`unit`; `low_cutoff`/`high_cutoff`/`notch`/`status` → the matching fields; NIRS `source`/`detector`/`wavelength_nominal` → `sourceSensor`/`detectorSensor`/`wavelengthPicometres`. Each channel carries a required `uuid` that anchors dereference. |
| **`electrodes.tsv`/`optodes.tsv`** / NWB electrodes | `signalInfo.sensors[]` (`sensorSpec`) | `x`/`y`/`z` → `xNanometres`/`yNanometres`/`zNanometres`; `impedance`/`material`/`hemisphere` → the matching fields; iEEG `size` → `contactAreaSquareMicrometres`; NWB `location` → `anatomyRef` (grounded via `uberon`). |
| **`coordsystem.json`** | `signalInfo.coordinateSystem` (`coordinateSystem`) | `EEGCoordinateSystem`/`iEEGCoordinateSystem` → `system`; `FiducialsCoordinates`/`AnatomicalLandmarkCoordinates` → `fiducials[]`; BIDS Motion `SpatialAxes` → `spatialAxes`. |
| **`events.tsv`** | annotation layer of kind tier, reached via `signalInfo.eventLayerRef` / `run.eventLayerRef` | `onset`/`duration` → `anchor.signalSpan` or `anchor.temporalSpan`; `trial_type` → the layer subkind or the annotation label; the code table maps to `signalInfo.eventCodes[]` (`eventCode`), each groundable to a HED tag via `knowledgeRef` (source `hed`). |
| **Eye-tracking sidecar** | `media.eyeTrackingInfo` | `RecordedEye` → `recordedEye`; `SampleCoordinateSystem` → `sampleCoordinateSystem` (`gaze-on-screen` requires `presentationSpec` screen geometry); calibration fields → the matching typed fields. |
| **BIDS Motion `tracksys`** | `media.motionInfo` | `RotationRule`/`RotationOrder` → the matching fields; the marker set → `skeleton` (`coco-17`, `smplx`, `vicon-plug-in-gait`, `ema-tongue-jaw-lips`, ...). No pose anchor is needed: the channels carry the numbers, `skeleton` carries their meaning. |
| **fMRI/anatomical NIfTI + JSON** | `media.volumeInfo` | `RepetitionTime`/`EchoTime`/`FlipAngle` → the matching nanosecond/microdegree fields; grid and voxel sizes → `dimX/Y/Z` and `voxelSize*Nanometres`; `SliceTiming` → `sliceTimingNanos[]`; the stereotaxic frame → `coordinateSystem`. |
| **`Manufacturer`/`ManufacturersModelName`/`DeviceSerialNumber`/`SoftwareVersions`** / NWB `Device` | `signalInfo.device` (`deviceInfo`) | Manufacturer grounds via `ror`/`wikidata` (no vendor enum); software reuses `reproducibilityInfo`; a serial number is omitted when the participant's identifiability is `anonymous`. |

## Time, synchronization, and anchoring

BIDS `StartTime` explicitly permits a stream that begins before the shared origin, which is why the `temporalSpan` and `signalSpan` times are signed. The session's `clock` field names t=0; each stream's `syncInfo.offsetNanos` (mirrored on `acquisition.defs#stream.offsetNanos`, with the session authoritative on disagreement) places its first sample relative to that origin; `syncInfo.clockSource` records how the alignment was established, from a hardware trigger to a clapperboard, and `syncUncertaintyNanos` bounds how finely a cross-stream anchor may be read.

A derived annotation over the signal, an ERP component, a spindle, a saccade, an articulatory gesture, anchors with `signalSpan`: exact samples (or session-relative nanoseconds) over named channels or sensors, optionally within a `frequencyBand` and, for fMRI, a `volumeIndex` range. Because the channel and sensor tables carry required uuids, an anchor addresses `Cz` or a specific depth contact by identity rather than by a positional index that silently mis-addresses when a bad channel is dropped.

## What Layers deliberately does not import

Layers is a read-only indexer over records in user-controlled PDSes; it never carries raw signal or volume bytes above the blob size limit, and never carries identifiable data at all. The heavy binary (the EDF, the FIF, the NWB HDF5, the NIfTI) lives behind `media.externalUri` at OpenNeuro, DANDI, or an institutional gateway, grounded on the catalog collection via `knowledgeRefs` (source `openneuro`, `dandi`) and pinned by `media.contentDigest`. Layers holds the description, the montage, the events, and the annotations, which is exactly the layer a decentralized annotation service should own. A whole BIDS dataset or DANDI dandiset becomes a [`pub.layers.catalog.collection`](../../lexicons/catalog.md) whose `contentSummary` advertises its modalities and counts, so it browses alongside treebanks and judgment studies in one index.
