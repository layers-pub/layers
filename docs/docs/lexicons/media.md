---
sidebar_label: "Media"
---

# pub.layers.media

Media source records for audio, video, image, and document data associated with expressions. Modality-specific metadata is factored into composable object types (`audioInfo`, `videoInfo`, `documentInfo`) so that multimodal media can carry all relevant technical metadata. Domain-specific metadata (recording conditions, speaker demographics, consent, quality assessment) is handled through the open `featureMap` with documented key conventions.

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
| `writingDirection` | string | Primary text direction. Known values: `ltr`, `rtl`, `ttb`, `btt` |
| `ocrEngine` | string | OCR/HTR engine identifier (e.g., 'tesseract-5.3', 'transkribus', 'abbyy', 'google-vision'). |

### media
**NSID:** `pub.layers.media.media`
**Type:** Record

A media source record (audio, video, image, or document) that can be referenced by expressions and annotations. Modality-specific metadata lives in composable `audioInfo`/`videoInfo`/`documentInfo` objects.

| Field | Type | Description |
|-------|------|-------------|
| `kindUri` | at-uri | AT-URI of the media kind definition node. Community-expandable via knowledge graph. |
| `kind` | string | Media kind slug (fallback). Known values: `audio`, `video`, `image`, `document` |
| `title` | string | Media title. |
| `description` | string | Description of the media. |
| `blob` | blob | The media blob. |
| `externalUri` | uri | URI for externally hosted media. |
| `mimeType` | string | MIME type of the media. |
| `durationMs` | integer | Duration in milliseconds (for audio/video). |
| `fileSizeBytes` | integer | File size in bytes. |
| `parentMediaRef` | at-uri | AT-URI of the parent media record this excerpt/clip was extracted from. For provenance tracking of media segments. |
| `startOffsetMs` | integer | Offset in milliseconds where this excerpt starts within the parent media. Used with `parentMediaRef`. |
| `audio` | ref | Audio-specific metadata. Ref: `pub.layers.media.defs#audioInfo` |
| `video` | ref | Video-specific metadata. Ref: `pub.layers.media.defs#videoInfo` |
| `document` | ref | Document-specific metadata. Ref: `pub.layers.media.defs#documentInfo` |
| `language` | string | BCP-47 language tag. |
| `knowledgeRefs` | array | Knowledge graph references. Array of ref: `pub.layers.defs#knowledgeRef` |
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
| `consent.license` | License identifier (e.g., 'CC-BY-4.0', 'CC-BY-NC-SA-4.0'). |

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

**Output**: The media record object.

### listMedia
**NSID:** `pub.layers.media.listMedia`

List media records in a repository with pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| `repo` | did (required) | The DID of the repository. |
| `limit` | integer | Maximum number of records to return (1-100, default 50). |
| `cursor` | string | Pagination cursor from previous response. |

**Output**: `{ records: media[], cursor?: string }`
