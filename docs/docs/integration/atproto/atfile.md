---
sidebar_label: ATFile
sidebar_position: 7
---

# ATFile

<div className="metadata-card">
<dl>
<dt>Application</dt>
<dd>ATFile</dd>
<dt>Origin</dt>
<dd>zio.sh</dd>
<dt>Namespace</dt>
<dd><code>blue.zio.atfile.*</code></dd>
<dt>Repository</dt>
<dd><a href="https://github.com/ziodotsh/atfile">github.com/ziodotsh/atfile</a></dd>
</dl>
</div>

## Overview

ATFile is a file storage service built on ATProto. It stores files (audio, video, images, documents) as ATProto records with associated blobs.

## Integration Pattern

Layers `media` records can reference ATFile-hosted files via `externalUri`, or an `expression` can reference an ATFile record directly via `mediaRef`.

```json
{
  "$type": "pub.layers.media",
  "kind": "audio",
  "externalUri": "at://did:plc:owner/blue.zio.atfile.upload/abc123",
  "mimeType": "audio/wav",
  "durationMs": 180000,
  "audio": {
    "sampleRate": 44100,
    "channels": 2
  }
}
```

This is relevant for multimodal annotation: audio/video files stored via ATFile become sources for temporal annotations (speech transcription, speaker diarization, gesture analysis).

## Layers Types Involved

| Type | Role |
|---|---|
| `pub.layers.media` | `externalUri` points to `blue.zio.atfile.*` AT-URI |
| `pub.layers.expression` | `mediaRef` references a Layers media record backed by ATFile |
| `pub.layers.defs#temporalSpan` | Temporal anchoring into ATFile-hosted audio/video |

## Discovery

The appview indexes media references. Queries like "find all annotations on this audio file" resolve by following the `mediaRef` → `media.externalUri` chain to the ATFile record.
