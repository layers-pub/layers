---
sidebar_label: "Media"
---

# pub.layers.media

Media source records for the full carrier superset: audio, video, image, document, signal (EEG, MEG, iEEG, fNIRS, EMG, ECG, EDA, respiration, gaze, mouse and key logging), motion (motion capture, articulography), and volume (fMRI, structural MRI, DWI, PET). Modality-specific metadata is factored into composable object types so that multimodal media can carry all relevant technical metadata: `audioInfo`, `videoInfo`, `documentInfo`, `imageInfo`, `signalInfo`, `eyeTrackingInfo`, `motionInfo`, `volumeInfo`, and their supporting types. Domain-specific metadata (recording conditions, speaker demographics, consent, quality assessment) is handled through the open `featureMap` with documented key conventions.

`kind` names the carrier only. The instrument-level modality (`eeg`, `fmri`, `speech-audio`, and the rest) lives on `signalInfo.modalityUri`, whose nodes reach their carrier node by `parentTypeRef`; this is the same modality node set that `judgment.defs#recordingMethod.methodUri` and `catalog.defs#contentSummary.modalityUri` resolve to, so a recording, the experiment that produced it, and the catalogue entry advertising it join on one vocabulary. A signal, motion, or volume medium is a stream of an acquisition session: `sessionRef` and `stream` place it on the session clock, and `sync` states how it aligns to that clock.

## Types

### audioInfo
**NSID:** `pub.layers.media.defs#audioInfo`
**Type:** Object

Composable audio metadata. Attach to any media record representing audio content: standalone audio files, audio tracks in video, etc.

| Field | Type | Description |
|-------|------|-------------|
| `sampleRate` | integer | Audio sample rate in Hz (e.g., 8000, 16000, 22050, 44100, 48000). |
| `channels` | integer | Number of audio channels. |
| `bitDepth` | integer | Audio bit depth (e.g., 16, 24, 32). |
| `codec` | string | Audio codec identifier (e.g., 'pcm_s16le', 'aac', 'opus', 'flac'). |
| `bitRate` | integer | Audio bitrate in bits per second. |
| `bitRateMode` | string | Bitrate mode. Known values: `cbr` (constant), `vbr` (variable). |
| `numberOfSamples` | integer | Total number of audio samples. Enables sample-accurate alignment (Praat, ELAN, forced alignment tools). |
| `speakerCount` | integer | Number of distinct speakers (for spoken language data). |
| `transcriptRef` | at-uri | AT-URI of a `pub.layers.expression.expression` containing the transcript. |
| `segmentationRef` | at-uri | AT-URI of a `pub.layers.segmentation.segmentation` record structuring the transcript. |

### videoInfo
**NSID:** `pub.layers.media.defs#videoInfo`
**Type:** Object

Composable video metadata. Attach to any media record representing video content.

| Field | Type | Description |
|-------|------|-------------|
| `width` | integer | Width in pixels. |
| `height` | integer | Height in pixels. |
| `frameRate` | integer | Frame rate scaled by 100 (e.g., 2997 = 29.97fps). Avoids floats. |
| `codec` | string | Video codec identifier (e.g., 'h264', 'h265', 'vp9', 'av1', 'prores'). |
| `aspectRatio` | string | Display aspect ratio (e.g., '16:9', '4:3', '1:1'). |
| `colorSpace` | string | Color space. Known values: `rgb`, `yuv420`, `yuv422`, `yuv444`, `grayscale` |
| `bitRate` | integer | Video bitrate in bits per second. |
| `scanType` | string | Scan type. Known values: `progressive`, `interlaced`. Affects frame extraction for annotation. |

### documentInfo
**NSID:** `pub.layers.media.defs#documentInfo`
**Type:** Object

Composable document/image metadata. Attach to any media record representing scanned documents, manuscripts, printed text, or other page-based media for OCR/HTR annotation workflows.

| Field | Type | Description |
|-------|------|-------------|
| `dpi` | integer | Scanning resolution in dots per inch (300+ recommended for OCR). |
| `colorMode` | string | Scan color mode. Known values: `color`, `grayscale`, `bitonal` |
| `pageCount` | integer | Number of pages in the document. |
| `scriptSystem` | string | Writing system (ISO 15924 codes: 'Latn', 'Arab', 'Deva', 'Hans', 'Hant', 'Cyrl', 'Grek', etc.). |
| `writingDirectionUri` | at-uri | AT-URI of the writing-direction definition node (a `writing-direction` typeDef under `layers-core.ontology.layers.pub`). Refines `writingDirection`; never replaces it. |
| `writingDirection` | string | Primary text direction slug (fallback when `writingDirectionUri` unavailable). Known values: `ltr`, `rtl`, `ttb`, `boustrophedon`, `custom` |
| `ocrEngine` | string | OCR/HTR engine identifier (e.g., 'tesseract-5.3', 'transkribus', 'abbyy', 'google-vision'). |

### imageInfo
**NSID:** `pub.layers.media.defs#imageInfo`
**Type:** Object

Still-image metadata, with a paired colour-space vocabulary.

| Field | Type | Description |
|-------|------|-------------|
| `width` | integer | Width in pixels. |
| `height` | integer | Height in pixels. |
| `bitDepth` | integer | Bit depth per channel. |
| `dpi` | integer | Resolution in dots per inch, when the image derives from a physical original. |
| `colorSpaceUri` | at-uri | AT-URI of the colour space definition node. |
| `colorSpace` | string | Colour space slug (fallback when `colorSpaceUri` unavailable). Known values: `srgb`, `adobe-rgb`, `display-p3`, `rec2020`, `cmyk`, `grayscale`, `bitonal`, `custom` |
| `codec` | string | Image codec identifier (jpeg, png, webp, jp2, tiff-lzw). Wire-format code, exempt from pairing. |
| `orientation` | integer | EXIF orientation tag. |
| `captureDevice` | ref | Camera or scanner. Ref: `pub.layers.defs#deviceInfo` |

### signalInfo
**NSID:** `pub.layers.media.defs#signalInfo`
**Type:** Object

Sampled time-series metadata: the metadata layer over EEG, MEG, iEEG, fNIRS, EMG, ECG, EDA, respiration, gaze, and key/mouse logging. Carries the BIDS electrophysiology sidecar fields as typed properties, plus the per-channel and per-sensor tables inline. Required: `modality`, `samplingFrequencyMilliHz`.

| Field | Type | Description |
|-------|------|-------------|
| `modalityUri` | at-uri | AT-URI of the modality definition node (a `modality` typeDef under `layers-core.ontology.layers.pub`, or a `graphNode`). The SAME node set as `judgment.defs#recordingMethod.methodUri` and `catalog.defs#contentSummary.modalityUri`; each node reaches its carrier by `parentTypeRef`, so `media.kindUri` is the parent rather than a synonym. Refines `modality`. |
| `modality` | string | Modality slug (fallback). Known values: `eeg`, `meg`, `ieeg`, `ecog`, `fmri`, `fnirs`, `eye-tracking`, `pupillometry`, `emg`, `ecg`, `skin-conductance`, `respiration`, `mouse-tracking`, `keystroke`, `motion-capture`, `articulography`, `custom` |
| `formatUri` / `format` | at-uri / string | Container format a reader must open (`mimeType` names the wire type). Known values: `edf`, `edf-plus`, `bdf`, `fif`, `eeglab-set`, `brainvision`, `nwb`, `nix`, `snirf`, `asc`, `edf-eyelink`, `c3d`, `trc`, `bvh`, `tsv`, `csv`, `custom` |
| `samplingFrequencyMilliHz` | integer | Nominal sampling frequency in millihertz (2048 Hz = 2048000). BIDS `SamplingFrequency`, required in the EEG/MEG/iEEG/NIRS sidecars; NWB `ElectricalSeries.rate`. |
| `channelCount` | integer | Total recorded channels. BIDS `EEGChannelCount`/`MEGChannelCount`/`NIRSChannelCount`. |
| `numberOfSamples` | integer | Total samples per channel. With `samplingFrequencyMilliHz` this makes `defs#signalSpan` sample anchoring exact. |
| `recordingDurationNanos` | integer | BIDS `RecordingDuration` (seconds upstream). |
| `recordingTypeUri` / `recordingType` | at-uri / string | Recording continuity. BIDS `RecordingType`. Known values: `continuous`, `epoched`, `discontinuous`. |
| `epochLengthNanos` | integer | BIDS `EpochLength`. Absent for continuous recordings. |
| `epochCount` | integer | Number of epochs, for epoched recordings. |
| `powerLineFrequencyMilliHz` | integer | Mains frequency (50000 or 60000). BIDS `PowerLineFrequency`, required in every electrophysiology sidecar. |
| `referenceSchemeUri` / `referenceScheme` | at-uri / string | Referencing scheme. BIDS `EEGReference`/`iEEGReference` (free text upstream). Known values include `single-electrode`, `linked-mastoids`, `average`, `rest`, `bipolar`, `laplacian`, `intracranial-common`, `not-applicable`, `custom`. |
| `referenceSensor` | ref | The reference electrode, as an `objectRef` whose `objectId` names a `sensors[]` uuid. Ref: `pub.layers.defs#objectRef` |
| `groundSensor` | ref | The ground electrode. BIDS `EEGGround`/`iEEGGround`. Ref: `pub.layers.defs#objectRef` |
| `referenceDescription` | string | Free-text reference detail for schemes the slug vocabulary cannot express. |
| `placementSchemeUri` / `placementScheme` | at-uri / string | Electrode or sensor placement. BIDS `EEGPlacementScheme`. Known values include `10-20`, `10-10`, `biosemi-64`, `egi-hydrocel-256`, `neuromag-306`, `subdural-grid`, `depth-electrode`, `custom`. |
| `filterStatusUri` / `filterStatus` | at-uri / string | Whether `filters` is a complete account. Separates none-applied from not-reported, which BIDS conflates via `n/a`. Known values: `as-listed`, `none-applied`, `not-reported`. |
| `filters` | array | Filters in application order. Carries BIDS `HardwareFilters`/`SoftwareFilters` as a typed list. Array of ref: `#filterSpec` |
| `channels` | array | Per-channel table in acquisition order. BIDS `channels.tsv`. Inline, because a montage is one logical object and getRepo bulk export is unmetered. Array of ref: `#signalChannel` |
| `sensors` | array | Physical sensor geometry. BIDS `electrodes.tsv`/`optodes.tsv` plus NWB electrodes. Separate from channels because the two are not in bijection. Array of ref: `#sensorSpec` |
| `coordinateSystem` | ref | Frame in which `sensors` coordinates are expressed. BIDS `coordsystem.json`. Ref: `#coordinateSystem` |
| `device` | ref | Acquisition hardware. BIDS `Manufacturer`/`ManufacturersModelName`; NWB `Device`. Ref: `pub.layers.defs#deviceInfo` |
| `eventChannel` | ref | The trigger or stimulus-code channel, as an `objectRef` into `channels`. Ref: `pub.layers.defs#objectRef` |
| `eventCodes` | array | Trigger codes and their meanings. Grounding each code through a typeDef lets two labs' code 12 be recognized as the same condition or as different ones. Array of ref: `#eventCode` |
| `eventLayerRef` | at-uri | AT-URI of a `pub.layers.annotation.annotationLayer` of kind tier holding the decoded event stream. Where BIDS `events.tsv` lands. |
| `headCircumferenceNanometres` | integer | BIDS `HeadCircumference`. On the recording, because it is measured at acquisition. |
| `dewarPositionUri` / `dewarPosition` | at-uri / string | MEG dewar position. BIDS `DewarPosition`, required in the MEG sidecar. Known values: `upright`, `supine`, `degrees-45`, `custom`. |
| `digitizedLandmarks`, `digitizedHeadPoints`, `continuousHeadLocalization` | boolean | BIDS MEG sidecar flags. |
| `maxMovementNanometres` | integer | BIDS `MaxMovement`. |
| `associatedEmptyRoomRef` | at-uri | AT-URI of a `media.media` holding the empty-room noise recording. BIDS `AssociatedEmptyRoom`. |
| `sourceOptodeCount`, `detectorOptodeCount` | integer | BIDS `NIRSSourceOptodeCount`/`NIRSDetectorOptodeCount`, required in the NIRS sidecar. |
| `cogAtlasRef` | ref | Cognitive Atlas term for the task. BIDS `CogAtlasID`. Use source `cognitive-atlas`. Ref: `pub.layers.defs#knowledgeRef` |
| `features` | ref | Open-ended features. Ref: `pub.layers.defs#featureMap` |

### signalChannel
**NSID:** `pub.layers.media.defs#signalChannel`
**Type:** Object

One row of the per-channel table. Required: `uuid`, `name`, `type`. The `uuid` is required because anchors, reference declarations, and sync declarations point at channels; a name or positional index silently mis-addresses when a republished recording drops two bad channels.

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | ref | Stable identifier for this channel within this record. The target of `signalSpan.channels[]`. Ref: `pub.layers.defs#uuid` |
| `name` | string | Channel name exactly as in the raw file (`Cz`, `MEG0113`, `S1-D1-760`, `gaze_x`). |
| `typeUri` | at-uri | AT-URI of the channel type definition node (`channel-type` typeDef). The authoritative field: the union of the BIDS EEG/MEG/iEEG/NIRS/Motion keyword sets already runs to roughly sixty terms and grows with each extension proposal. |
| `type` | string | Channel type slug (fallback), uppercase as BIDS spells them. Known values include `EEG`, `REF`, `EOG`, `ECG`, `EMG`, `PUPIL`, `EYEGAZE`, `TRIG`, `MEGMAG`, `MEGGRADPLANAR`, `SEEG`, `ECOG`, `NIRSCWHBO`, `ACCEL`, `GYRO`, `CUSTOM`. |
| `unitUri` / `unit` | at-uri / string | Physical unit of this channel's samples. BIDS `channels.tsv` units, required. Known values include `volt`, `microvolt`, `tesla`, `femtotesla`, `microsiemens`, `pixel`, `microdegree`, `arbitrary`, `not-applicable`, `custom`. |
| `samplingFrequencyMilliHz` | integer | Per-channel rate when it differs from the recording's nominal rate. |
| `lowCutoffMilliHz` / `highCutoffMilliHz` | integer | Per-channel high-pass and low-pass cutoffs. BIDS `channels.tsv` `low_cutoff`/`high_cutoff`, required for iEEG. |
| `notchMilliHz` | integer | BIDS `channels.tsv` notch. |
| `statusUri` / `status` | at-uri / string | Channel quality. BIDS `channels.tsv` status. Known values: `good`, `bad`, `interpolated`, `not-reported`. |
| `statusDescription` | string | Why the channel is bad or interpolated. |
| `referenceChannel` | ref | Per-channel reference for bipolar and mixed intracranial montages. Ref: `pub.layers.defs#objectRef` |
| `sensor` | ref | The `sensors` entry this channel reads from (how a channel acquires a position without duplicating coordinates). Ref: `pub.layers.defs#objectRef` |
| `sourceSensor` / `detectorSensor` | ref | Emitting and receiving optode for NIRS. BIDS NIRS `channels.tsv` source/detector, required columns. Ref: `pub.layers.defs#objectRef` |
| `wavelengthPicometres` | integer | Nominal wavelength (760 nm = 760000). BIDS NIRS `wavelength_nominal`. |
| `group` | ref | Electrode group, shaft, grid, or tracking system this channel belongs to. NWB `ElectrodeGroup`; BIDS Motion tracksys. Ref: `pub.layers.defs#objectRef` |
| `description` | string | Free-text note. |
| `features` | ref | Per-channel features. Ref: `pub.layers.defs#featureMap` |

### sensorSpec
**NSID:** `pub.layers.media.defs#sensorSpec`
**Type:** Object

Physical sensor geometry: an electrode, contact, coil, optode, marker, or landmark. Required: `uuid`, `name`, `type`. The `uuid` is required because channels, anchors, and spatial regions point at sensors. Coordinates are signed integers in nanometres.

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | ref | Stable identifier within this record. The target of `signalSpan.sensors[]`. Ref: `pub.layers.defs#uuid` |
| `name` | string | Sensor name exactly as in the raw file. |
| `typeUri` / `type` | at-uri / string | Sensor type. BIDS `optodes.tsv` type. Known values: `electrode`, `depth-contact`, `grid-contact`, `strip-contact`, `magnetometer`, `gradiometer`, `reference-coil`, `head-position-coil`, `source`, `detector`, `marker`, `imu`, `camera`, `fiducial`, `anatomical-landmark`, `head-point`, `custom`. |
| `xNanometres` / `yNanometres` / `zNanometres` | integer | Signed X/Y/Z. BIDS `electrodes.tsv`/`optodes.tsv` coordinates; NWB `electrodes.x`. |
| `impedanceMilliOhm` | integer | BIDS `electrodes.tsv` impedance; NWB `electrodes.imp`. |
| `contactAreaSquareMicrometres` | integer | BIDS iEEG `electrodes.tsv` size, required. Load-bearing for current-density interpretation. |
| `materialUri` / `material` | at-uri / string | Electrode material. BIDS `electrodes.tsv` material (free text upstream, where Ag/AgCl has three predictable spellings). Known values: `ag-agcl`, `platinum`, `platinum-iridium`, `gold`, `tin`, `stainless-steel`, `silicon`, `custom`. |
| `hemisphereUri` / `hemisphere` | at-uri / string | Hemisphere. BIDS iEEG `electrodes.tsv` hemisphere. Known values: `left`, `right`, `midline`, `not-reported`. |
| `group` | ref | Electrode group or shaft. NWB `ElectrodeGroup`. Ref: `pub.layers.defs#objectRef` |
| `anatomyRef` | ref | Grounded anatomical localization; use source `uberon`. For iEEG this inherits the participant's identifiability declaration. Ref: `pub.layers.defs#knowledgeRef` |
| `description` | string | Free-text note. |
| `features` | ref | Per-sensor features. Ref: `pub.layers.defs#featureMap` |

### coordinateSystem
**NSID:** `pub.layers.media.defs#coordinateSystem`
**Type:** Object

The frame in which `sensors` coordinates are expressed. BIDS `coordsystem.json`. Required: `system`. Values must agree with `pub.layers.defs#spatialEntity.crs`.

| Field | Type | Description |
|-------|------|-------------|
| `systemUri` / `system` | at-uri / string | Coordinate system. Covers the BIDS EEG/MEG/iEEG lists plus the stereotaxic spaces for volumetric data. Known values include `captrak`, `ctf-head`, `elekta-neuromag-head`, `acpc`, `scanner-ras`, `mni152-nlin-2009c`, `talairach`, `fsaverage`, `voxel-index`, `pixel`, `custom`. |
| `unitUri` / `unit` | at-uri / string | Unit of the stored integer coordinates. Known values: `nanometre`, `micrometre`, `pixel`, `voxel`, `per-mille-normalized`. |
| `spatialAxesUri` / `spatialAxes` | at-uri / string | Direction code naming the positive direction of X, Y, Z. BIDS Motion `SpatialAxes`. A consumer that cannot resolve it must not assume a default. Known values: `RAS`, `LAS`, `RAI`, `LPS`, `ARS`, `ALS`, `FRU`, `FLU`, `custom`. |
| `referenceImageRef` | at-uri | AT-URI of a `media.media` of kind volume or image this frame is defined against. BIDS `IntendedFor`. |
| `fiducials` | array | Named landmark points defining the frame. BIDS `FiducialsCoordinates`. Array of ref: `#namedPoint` |
| `description` | string | Free-text note. |

### namedPoint
**NSID:** `pub.layers.media.defs#namedPoint`
**Type:** Object

A named landmark point in a coordinate frame. Required: `name`.

| Field | Type | Description |
|-------|------|-------------|
| `nameUri` / `name` | at-uri / string | Landmark. Known values: `nasion`, `lpa`, `rpa`, `inion`, `ac`, `pc`, `vertex`, `custom`. |
| `x` / `y` / `z` | integer | Signed coordinates in the enclosing system's unit. |

### filterSpec
**NSID:** `pub.layers.media.defs#filterSpec`
**Type:** Object

One filter stage. Required: `type`.

| Field | Type | Description |
|-------|------|-------------|
| `stageUri` / `stage` | at-uri / string | Where the filter was applied. Distinguishes BIDS `HardwareFilters` from `SoftwareFilters`. Known values: `hardware`, `software`, `unknown`. |
| `typeUri` / `type` | at-uri / string | Filter type. Known values: `highpass`, `lowpass`, `bandpass`, `bandstop`, `notch`, `detrend`, `resample`, `rereference`, `ica`, `ssp`, `regression`, `custom`. |
| `lowCutoffMilliHz` / `highCutoffMilliHz` / `centreMilliHz` / `bandwidthMilliHz` | integer | Cutoffs, centre, and bandwidth in millihertz. |
| `order` | integer | Filter order. |
| `designUri` / `design` | at-uri / string | Filter design. Known values: `butterworth`, `chebyshev-1`, `chebyshev-2`, `elliptic`, `bessel`, `fir-windowed`, `fir-least-squares`, `custom`. |
| `directionUri` / `direction` | at-uri / string | Whether the filter introduces phase shift. Load-bearing for any latency claim about an ERP. Known values: `causal`, `zero-phase`, `unknown`. |
| `componentsRemoved` | integer | For `ica` and `ssp`. |
| `software` | ref | Software that applied the filter. Ref: `pub.layers.defs#reproducibilityInfo` |
| `description` | string | Free-text note. |

### eventCode
**NSID:** `pub.layers.media.defs#eventCode`
**Type:** Object

A trigger code and its meaning. Required: `code`.

| Field | Type | Description |
|-------|------|-------------|
| `code` | integer | Integer value written on the trigger channel. |
| `channel` | ref | The channel this code appears on, when the recording has several trigger lines. Ref: `pub.layers.defs#objectRef` |
| `label` | string | Condition label as the experimenter spells it. |
| `typeUri` | at-uri | AT-URI of the condition or event-type definition node, typically a `pub.layers.ontology.typeDef`. |
| `knowledgeRef` | ref | External grounding, for instance a HED tag (source `hed`) or a Cognitive Atlas concept. Ref: `pub.layers.defs#knowledgeRef` |
| `description` | string | Free-text note. |

### eyeTrackingInfo
**NSID:** `pub.layers.media.defs#eyeTrackingInfo`
**Type:** Object

Eye-tracking specifics, carried alongside `signal`. Maps the BIDS eye-tracking sidecar.

| Field | Type | Description |
|-------|------|-------------|
| `recordedEyeUri` / `recordedEye` | at-uri / string | Which eye was recorded. BIDS `RecordedEye`, required. Known values: `left`, `right`, `both`, `cyclopean`. |
| `sampleCoordinateSystemUri` / `sampleCoordinateSystem` | at-uri / string | What the x and y samples mean. BIDS `SampleCoordinateSystem`, required. `gaze-on-screen` is the value that makes `presentationSpec.screen` mandatory. Known values: `gaze-on-screen`, `eye-in-head`, `gaze-in-world`, `custom`. |
| `sampleCoordinateUnitUri` / `sampleCoordinateUnit` | at-uri / string | Unit of the gaze samples. BIDS `SampleCoordinateUnits`. Known values: `pixel`, `nanometre`, `microdegree`, `per-mille-normalized`. |
| `methodUri` / `method` | at-uri / string | Tracking method. BIDS `EyeTrackingMethod`. Known values: `p-cr`, `dpi`, `eog`, `video-oculography`, `scleral-search-coil`, `custom`. |
| `pupilFitMethodUri` / `pupilFitMethod` | at-uri / string | BIDS `PupilFitMethod`. Known values: `ellipse`, `centroid`, `custom`. |
| `calibrationTypeUri` / `calibrationType` | at-uri / string | BIDS `CalibrationType`. Known values: `h3`, `hv5`, `hv9`, `hv13`, `none`, `custom`. |
| `calibrationCount` / `calibrationPositionCount` | integer | BIDS `CalibrationCount`/`CalibrationPosition`. |
| `averageCalibrationErrorMicrodegrees` / `maximalCalibrationErrorMicrodegrees` | integer | BIDS `AverageCalibrationError`/`MaximalCalibrationError`. |
| `trackerDistanceNanometres` | integer | BIDS `EyeTrackerDistance`. |
| `eventDetectionUri` / `eventDetection` | at-uri / string | Algorithm used to derive fixations and saccades. Absent means the trace is raw. Known values: `velocity-threshold`, `dispersion-threshold`, `eyelink-parser`, `engbert-kliegl`, `none`, `custom`. |
| `device` | ref | Eye-tracking hardware. Ref: `pub.layers.defs#deviceInfo` |

### motionInfo
**NSID:** `pub.layers.media.defs#motionInfo`
**Type:** Object

Motion-capture and articulography metadata, carried alongside `signal`. The skeleton or marker set is where joint identity, order, and topology are defined, which is why no pose anchor is needed: the channels carry the numbers, this carries their meaning.

| Field | Type | Description |
|-------|------|-------------|
| `trackingSystem` | ref | The `run` or session stream grouping this system, as an `objectRef`. BIDS Motion `tracksys`. Ref: `pub.layers.defs#objectRef` |
| `formatUri` / `format` | at-uri / string | Container format. Known values: `c3d`, `bvh`, `trc`, `fbx`, `tsv`, `csv`, `custom`. |
| `trackedPointCount` | integer | Number of tracked points, markers, or joints. |
| `rotationRuleUri` / `rotationRule` | at-uri / string | BIDS Motion `RotationRule`. Known values: `right-hand`, `left-hand`. |
| `rotationOrderUri` / `rotationOrder` | at-uri / string | BIDS Motion `RotationOrder`. Known values: `xyz`, `xzy`, `yxz`, `yzx`, `zxy`, `zyx`, `quaternion`. |
| `skeletonUri` / `skeleton` | at-uri / string | Skeleton or marker-set. Known values: `coco-17`, `openpose-body25`, `openpose-135`, `mediapipe-holistic`, `mediapipe-hand-21`, `smpl`, `smplx`, `vicon-plug-in-gait`, `xsens-mvn`, `ema-tongue-jaw-lips`, `c3d-custom`, `custom`. |
| `coordinateSystem` | ref | Carries `spatialAxes`; a motion stream must not define a second axis vocabulary. Ref: `#coordinateSystem` |
| `device` | ref | Motion-capture hardware. Ref: `pub.layers.defs#deviceInfo` |

### volumeInfo
**NSID:** `pub.layers.media.defs#volumeInfo`
**Type:** Object

Volumetric imaging metadata (fMRI, structural MRI, DWI, PET). Required: `volumeKind`.

| Field | Type | Description |
|-------|------|-------------|
| `volumeKindUri` / `volumeKind` | at-uri / string | Volume kind. BIDS suffix plus datatype. Known values: `bold`, `anatomical-t1`, `anatomical-t2`, `dwi`, `fieldmap`, `perfusion`, `mask`, `statistical-map`, `parcellation`, `custom`. |
| `formatUri` / `format` | at-uri / string | Container format. Known values: `nifti-1`, `nifti-2`, `cifti-2`, `gifti`, `dicom`, `mgz`, `minc`, `custom`. |
| `repetitionTimeNanos` / `echoTimeNanos` | integer | BIDS `RepetitionTime`/`EchoTime`. |
| `flipAngleMicrodegrees` | integer | BIDS `FlipAngle`. |
| `volumeCount` | integer | Volumes in the run. Bounds `defs#signalSpan.volumeIndexEnd`. |
| `dimX` / `dimY` / `dimZ` | integer | Voxel grid extent. |
| `voxelSizeXNanometres` / `voxelSizeYNanometres` / `voxelSizeZNanometres` | integer | Voxel edge length in nanometres. |
| `sliceTimingNanos` | array | Per-slice acquisition offsets within one TR. BIDS `SliceTiming`. Array of integer. |
| `sliceEncodingDirection` / `phaseEncodingDirection` | string | BIDS `SliceEncodingDirection`/`PhaseEncodingDirection`. Wire-format codes. |
| `coordinateSystem` | ref | Stereotaxic frame the voxel grid is expressed against. Ref: `#coordinateSystem` |
| `device` | ref | Scanner hardware. Ref: `pub.layers.defs#deviceInfo` |

### syncInfo
**NSID:** `pub.layers.media.defs#syncInfo`
**Type:** Object

How this stream aligns to its session's shared time base. Required: `sessionRef`. Resolves against `acquisition.session` and `signalChannel.uuid`.

| Field | Type | Description |
|-------|------|-------------|
| `sessionRef` | at-uri | AT-URI of the `pub.layers.acquisition.session` whose clock this stream is expressed against. |
| `offsetNanos` | integer | Signed offset from session time zero to this stream's first sample. Negative when the stream began before the origin (BIDS `StartTime` permits it). |
| `clockSourceUri` / `clockSource` | at-uri / string | How alignment was established. A hardware trigger and a clapperboard differ by three orders of magnitude. Known values: `session-master`, `shared-trigger`, `ltc-timecode`, `clapperboard`, `audio-cross-correlation`, `ptp`, `ntp`, `manual`, `unsynchronized`, `unknown`. |
| `syncChannel` | ref | The channel carrying the shared sync signal, when `clockSource` is `shared-trigger`. Ref: `pub.layers.defs#objectRef` |
| `driftPartsPerBillion` | integer | Signed measured drift against the session master. |
| `syncUncertaintyNanos` | integer | Worst-case alignment error. Bounds how finely a cross-stream anchor may honestly be read. |

### media
**NSID:** `pub.layers.media.media`
**Type:** Record

A media source record (audio, video, image, or document) that can be referenced by expressions and annotations. Modality-specific metadata lives in composable `audioInfo`/`videoInfo`/`documentInfo` objects.

| Field | Type | Description |
|-------|------|-------------|
| `kindUri` | at-uri | AT-URI of the media kind definition node (a `media-kind` typeDef under `layers-core.ontology.layers.pub`). Names the carrier; the instrument-level modality is named by `signalInfo.modalityUri`, whose nodes reach their carrier node by `parentTypeRef`. Community-expandable via knowledge graph. |
| `kind` | string | Media kind slug (fallback). Names the carrier only. Known values: `audio`, `video`, `image`, `document`, `signal`, `motion`, `volume`, `custom` |
| `title` | string | Media title. |
| `description` | string | Description of the media. |
| `blob` | blob | The media blob. Signal, motion, and volume containers (EDF, BDF, FIF, EEGLAB SET, BrainVision, SNIRF, NWB, NIfTI, ASC, C3D, TRC) travel as `application/octet-stream` or `application/x-hdf5`, with the concrete container named by the relevant info block's `format` field. Content above maxSize must use `externalUri`. |
| `externalUri` | uri | URI for externally hosted media. |
| `mimeType` | string | MIME type of the carried bytes. |
| `durationMs` | integer | Duration in milliseconds (for audio/video). |
| `durationNanos` | integer | Duration in nanoseconds; authoritative over `durationMs` where both are present. Milliseconds round away whole samples at 2048 Hz and above. |
| `fileSizeBytes` | integer | File size in bytes. |
| `parentMediaRef` | at-uri | AT-URI of the parent media record this excerpt/clip was extracted from. Expresses excerpt-of, never synchronization. |
| `startOffsetMs` | integer | Offset in milliseconds where this excerpt starts within the parent media. Used with `parentMediaRef`. |
| `audio` | ref | Audio-specific metadata. Ref: `pub.layers.media.defs#audioInfo` |
| `video` | ref | Video-specific metadata. Ref: `pub.layers.media.defs#videoInfo` |
| `document` | ref | Document-specific metadata. Ref: `pub.layers.media.defs#documentInfo` |
| `image` | ref | Still-image metadata. Ref: `pub.layers.media.defs#imageInfo` |
| `signal` | ref | Sampled time-series metadata (EEG, MEG, iEEG, fNIRS, EMG, ECG, EDA, respiration, gaze, mouse and key logging). Ref: `pub.layers.media.defs#signalInfo` |
| `eyeTracking` | ref | Eye-tracking specifics, carried alongside `signal`. A nested block rather than an eighth carrier kind, because BIDS types eye-tracking as a physiological recording. Ref: `pub.layers.media.defs#eyeTrackingInfo` |
| `motion` | ref | Motion-capture and articulography metadata, carried alongside `signal`. Ref: `pub.layers.media.defs#motionInfo` |
| `volume` | ref | Volumetric imaging metadata. Ref: `pub.layers.media.defs#volumeInfo` |
| `contentDigest` | ref | Hash over the referenced bytes. The only integrity guarantee available for `externalUri` carriage, and therefore expected whenever `externalUri` is used without a blob. Ref: `pub.layers.defs#contentDigest` |
| `sessionRef` | at-uri | AT-URI of the `pub.layers.acquisition.session` this medium is a stream of. Every stream of one synchronized recording carries the same `sessionRef`. |
| `stream` | ref | The session stream this medium fills, as an `objectRef` whose `recordRef` is `sessionRef` and whose `objectId` is the stream's uuid. Ref: `pub.layers.defs#objectRef` |
| `sync` | ref | How this stream aligns to its session's shared time base. Ref: `pub.layers.media.defs#syncInfo` |
| `participantRefs` | array | AT-URIs of the `pub.layers.acquisition.participant` records this recording captures. On the record rather than inside four sibling info blocks. Array of at-uri |
| `access` | ref | Conditions under which the bytes may be obtained. Distinct from `licensing` (what may be done with them) and consent (the person they came from); all three must hold. Ref: `pub.layers.defs#accessCondition` |
| `languages` | array | BCP-47 language tags this record covers. Empty when language is unspecified or unknown. Array of string (item max 32). No array-level cap. |
| `languageRefs` | array | Structured language references, for varieties a BCP-47 tag cannot name. Array of ref: `pub.layers.defs#languageRef` |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
| `licensing` | ref | Distribution licensing terms governing this media (supports dual/multi/component licensing). Canonical license for the media; the `consent.license` feature, when present, records per-clip consent terms. Ref: `pub.layers.defs#licensing` |
| `eprintRefs` | array | Eprint records (papers/preprints) describing or associated with this media. Array of at-uri (max 64) |
| `metadata` | ref | Provenance: who created/uploaded this media record. Ref: `pub.layers.defs#annotationMetadata` |
| `features` | ref | Open-ended features (see Feature Key Conventions below). Ref: `pub.layers.defs#featureMap` |
| `createdAt` | datetime | Record creation timestamp. |

## Feature Key Conventions

The `features` field on media records is a `featureMap`, an open key-value store for domain-specific metadata that does not warrant dedicated schema fields. All feature values are strings (per the `feature` type definition); consumers parse typed values based on key semantics. The keys below are conventions, not requirements. Applications should use these keys when applicable to enable cross-corpus interoperability.

### Recording & Equipment

| Key | Description |
|-----|-------------|
| `recording.date` | ISO 8601 date of the recording session. |
| `recording.location` | Place name or address where the recording was made. |
| `recording.coordinates` | GPS coordinates (latitude, longitude). |
| `recording.environment` | Recording environment: `studio`, `field`, `lab`, `classroom`, `telephone`, `broadcast`, `home`, `outdoor` |
| `recording.microphone` | Microphone model (e.g., 'Sennheiser HMD 414', 'DPA 4006'). |
| `recording.microphoneType` | Microphone type: `condenser`, `dynamic`, `electret`, `lavalier`, `headset`, `array`, `contact` |
| `recording.microphonePlacement` | Microphone placement: `close-talk`, `far-field`, `head-mounted`, `lapel`, `tabletop` |
| `recording.equipment` | Recording device or interface model. |
| `recording.software` | Recording software used. |
| `recording.noiseLevel` | Ambient noise characterization. |
| `recording.roomAcoustics` | Room acoustics description (RT60, treatment, dimensions). |

### Speaker/Participant Metadata

Speaker metadata uses the pattern `speaker.{id}.*` where `{id}` is a speaker identifier (e.g., `speaker.SPK01.age`). For single-speaker recordings, use `speaker.0.*`.

| Key | Description |
|-----|-------------|
| `speaker.{id}.age` | Age or age range at time of recording. |
| `speaker.{id}.gender` | Gender of the speaker. |
| `speaker.{id}.L1` | Native language (BCP-47 tag). |
| `speaker.{id}.L2` | Second language(s), comma-separated BCP-47 tags. |
| `speaker.{id}.dialect` | Regional dialect or variety. |
| `speaker.{id}.education` | Education level. |
| `speaker.{id}.role` | Role in the recording: `interviewer`, `interviewee`, `narrator`, `subject`, `caller`, `callee`, `target-child`, `mother`, `father`, `examiner` |
| `speaker.{id}.channelAssignment` | Which audio channel this speaker is on (e.g., '0', '1', 'left', 'right'). |
| `speaker.{id}.voiceCharacteristics` | Pitch range, speaking rate, voice quality notes. |
| `speaker.{id}.ethnicity` | Ethnic or racial background (following corpus conventions). |
| `speaker.{id}.birthDate` | ISO 8601 date of birth. |
| `speaker.{id}.handedness` | Dominant hand (for sign language): `left`, `right`, `ambidextrous` |
| `speaker.{id}.hearingStatus` | Hearing status (for sign language): `deaf`, `hard-of-hearing`, `hearing`, `coda` |
| `speaker.{id}.ageOfAcquisition` | Age at which sign language was acquired. |

### Audio Quality Assessment

| Key | Description |
|-----|-------------|
| `quality.snrDb` | Signal-to-noise ratio in decibels (string-encoded integer, e.g., '42'). |
| `quality.pesq` | PESQ score (string-encoded integer scaled by 100, e.g., '350' = 3.50). |
| `quality.polqa` | POLQA score (string-encoded integer scaled by 100). |
| `quality.stoi` | Short-Time Objective Intelligibility (string-encoded integer 0-1000, e.g., '950' = 0.95). |
| `quality.clippingDetected` | Whether audio clipping was detected: `true` or `false`. |
| `quality.silenceRatio` | Proportion of recording that is silence (string-encoded integer 0-1000, e.g., '150' = 15%). |
| `quality.rating` | Subjective quality rating: `poor`, `fair`, `good`, `excellent` |

### Multi-Stream Synchronization

| Key | Description |
|-----|-------------|
| `sync.timeOriginMs` | Time offset in ms for aligning this media to a master clock, cf. ELAN TIME_ORIGIN (string-encoded integer). |
| `sync.clockDriftPpm` | Clock drift in parts per million relative to master (string-encoded integer). |
| `sync.syncMethod` | Synchronization method: `timecode`, `clap`, `genlock`, `ntp`, `ptp`, `software`, `audio-sync` |
| `sync.masterMediaRef` | AT-URI of the master media record in a multi-stream setup. |
| `sync.precision` | Temporal precision of synchronization (e.g., 'under 1ms', 'under 15ms'). |

### Consent & Ethics

| Key | Description |
|-----|-------------|
| `consent.type` | Consent type: `informed`, `community`, `blanket`, `oral`, `written` |
| `consent.scope` | Permitted uses: `research`, `education`, `public`, `commercial`, `archive-only` |
| `consent.anonymizationLevel` | Anonymization applied: `none`, `pseudonymized`, `face-blurred`, `voice-altered`, `fully-anonymized` |
| `consent.restrictions` | Free-text access restrictions or conditions. |
| `consent.irb` | IRB/ethics committee approval identifier. |
| `consent.culturalProtocol` | Cultural sensitivity notes (CARE principles, indigenous data sovereignty). |
| `consent.license` | Per-clip consent terms (e.g., 'CC-BY-4.0', 'CC-BY-NC-SA-4.0'). The top-level `licensing` field is the canonical distribution license for the media; use this key only to record consent-scoped terms that differ from it. |

### Format Conversion Provenance

| Key | Description |
|-----|-------------|
| `conversion.sourceFormat` | Original file format before conversion. |
| `conversion.sourceCodec` | Original codec before conversion. |
| `conversion.sourceBitRate` | Original bitrate before conversion. |
| `conversion.tool` | Conversion tool used (e.g., 'ffmpeg 6.1', 'sox 14.4'). |
| `conversion.date` | ISO 8601 date of conversion. |
| `conversion.lossless` | Whether the conversion was lossless: `true` or `false`. |
| `conversion.generations` | Number of compression generations/re-encodings (string-encoded integer). |

### Sign Language Video

| Key | Description |
|-----|-------------|
| `signing.cameraAngle` | Camera angle relative to signer: `frontal`, `side`, `overhead`, `three-quarter` |
| `signing.cameraCount` | Number of cameras in the recording setup (string-encoded integer). |
| `signing.cameraPosition` | Camera position description (e.g., 'frontal at chest height, 2m distance'). |
| `signing.signerPosition` | Where the signer is positioned relative to the camera. |
| `signing.signingSpace` | Approximate dimensions of the captured signing space. |
| `signing.backgroundType` | Background description: `solid-black`, `blue-screen`, `green-screen`, `natural` |
| `signing.glossConvention` | Glossing convention used (e.g., 'hamburg-notation', 'id-glosses'). |
| `signing.interactionType` | Interaction type: `monologue`, `dialogue`, `group`, `elicitation` |

### Fieldwork & Language Documentation

| Key | Description |
|-----|-------------|
| `fieldwork.elicitationType` | Elicitation method: `narrative`, `conversation`, `wordlist`, `paradigm`, `picture-task`, `retelling`, `interview` |
| `fieldwork.archiveId` | Archive identifier (PARADISEC, ELAR, AILLA, etc.). |
| `fieldwork.archiveCollection` | Collection within the archive. |
| `fieldwork.endangermentLevel` | Language endangerment: `safe`, `vulnerable`, `endangered`, `severely-endangered`, `critically-endangered` |
| `fieldwork.communityName` | Speaker community name. |
| `fieldwork.genre` | Discourse genre: `narrative`, `dialogue`, `procedural`, `oratory`, `singing`, `formulaic`, `ludic` |

### Clinical Speech

| Key | Description |
|-----|-------------|
| `clinical.diagnosis` | Clinical diagnosis relevant to speech (e.g., 'aphasia', 'dysarthria', 'stuttering', 'ASD'). |
| `clinical.severity` | Severity level of the condition. |
| `clinical.taskType` | Clinical task: `reading`, `spontaneous`, `repetition`, `picture-naming`, `sentence-completion`, `diadochokinesis` |
| `clinical.assessmentTool` | Standardized assessment used (e.g., 'WAB-R', 'BNT', 'ADOS-2'). |
| `clinical.treatmentPhase` | Treatment phase: `pre-treatment`, `during-treatment`, `post-treatment`, `follow-up` |

### Multimodal Sensor References

| Key | Description |
|-----|-------------|
| `mocap.fileRef` | URI or AT-URI of associated motion capture data. |
| `mocap.format` | Motion capture format: `bvh`, `c3d`, `fbx`, `trc` |
| `mocap.frameRate` | Motion capture sampling rate in Hz (string-encoded integer). |
| `mocap.system` | Motion capture system name (e.g., 'OptiTrack', 'Vicon', 'Xsens'). |
| `eyetracking.fileRef` | URI or AT-URI of associated eye-tracking data. |
| `eyetracking.sampleRate` | Eye-tracking sampling rate in Hz (string-encoded integer). |
| `eyetracking.device` | Eye-tracking hardware (e.g., 'Tobii Pro Spectrum', 'EyeLink 1000'). |
| `depth.sensorType` | Depth sensor type: `structured-light`, `time-of-flight`, `stereo` |
| `depth.resolution` | Depth stream resolution (e.g., '640x480'). |

### Accessibility

| Key | Description |
|-----|-------------|
| `accessibility.hasCaptions` | Whether captions/subtitles are available: `true` or `false`. |
| `accessibility.captionFormat` | Caption format: `webvtt`, `srt`, `ttml`, `cea-608`, `cea-708` |
| `accessibility.captionLanguage` | BCP-47 tag of caption language. |
| `accessibility.hasAudioDescription` | Whether an audio description track is present: `true` or `false`. |
| `accessibility.hasSignLanguageInterpretation` | Whether sign language interpretation is present: `true` or `false`. |
| `accessibility.signLanguageType` | Sign language used for interpretation (BCP-47 sign language subtag). |
| `accessibility.hazards` | Accessibility hazards: `flashing`, `motion-simulation`, `sound`, `none` |

## What Does NOT Belong on Media Records

Several categories of metadata are better placed on other Layers record types:

- **Segmentation** (VAD, IPUs, breath groups, turn boundaries) → `pub.layers.annotation` layers on the expression, with `subkind` values like `vad`, `ipu`, `breath-group`, `turn-boundary`, `diarization`
- **Derived acoustic measurements** (pitch tracks, formant tracks, spectrograms, intensity contours) → `pub.layers.annotation` layers with appropriate `subkind` (e.g., `pitch`, `formant`, `intensity`, `spectrogram`)
- **Analysis parameters** (Praat settings, window size, step size, frequency range) → `annotationMetadata.features` on the annotation layer that contains the derived measurements
- **Corpus-level statistics** (total hours, speaker count, language distribution) → `pub.layers.corpus` features
- **Temporal alignment** (millisecond/frame/sample alignment of annotations to media) → handled by `pub.layers.defs#temporalSpan` and `pub.layers.defs#anchor`

## XRPC Queries

### getMedia
**NSID:** `pub.layers.media.getMedia`

Retrieve a single media record by AT-URI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | at-uri (required) | The AT-URI of the media record. |

**Output**: `{ uri: at-uri, cid: cid, value: media }` (the media record wrapped with its uri and cid).

### listMedia
**NSID:** `pub.layers.media.listMedia`

List media records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | at-identifier (required) | The DID or handle of the repository. |
| `kind` | string | Filter by media kind slug (maxLength 128). |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: { uri, cid, value: media }[], cursor?: string }`
