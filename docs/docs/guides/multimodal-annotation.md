---
sidebar_label: "Multimodal Annotation"
---

# Multimodal Annotation

Layers supports annotation across text, audio, video, image, and paged documents through a single schema. The key mechanism is the **polymorphic anchor type**: the same annotation record works across modalities by switching the anchor kind. This guide explains how anchoring, expressions, and media records work together for multimodal annotation.

## The Polymorphic Anchor

Every annotation attaches to source data through an [`anchor`](../foundations.md#anchor). The anchor's `kind` field determines the modality:

| Anchor Kind | Modality | Value |
|-------------|----------|-------|
| `textSpan` | Text | `{start, end}` byte/character offsets |
| `tokenRef` | Text | Single token identifier |
| `tokenRefSequence` | Text | Ordered sequence of token references |
| `temporalSpan` | Audio/Video | `{start, end}` time in milliseconds |
| `spatioTemporalAnchor` | Video | Keyframe-based bounding boxes over time |
| `pageAnchor` | Paged documents | `{page, x, y, width, height}` |
| `externalTarget` | Web/External | URL or resource identifier |

The same `pub.layers.annotation#annotation` record type is used regardless of modality. A POS tag on a text token and a label on a video region differ only in their anchor kind.

## Expressions Across Modalities

[Expressions](../lexicons/expression.md) are recursive containers for linguistic units. The `kind` field indicates the modality:

**Text:** `document` → `section` → `paragraph` → `sentence` → `word` → `morpheme`

**Audio:** `recording` → `turn` → `utterance` → `word`

**Video:** `video` → `turn` → `utterance` → `word`

**Multimodal:** `multimodal` → any combination of text, audio, and video sub-expressions

Each expression can reference its parent via `parentRef` and specify how it attaches to the parent through `anchor`. A word expression within a recording uses a `temporalSpan` anchor to indicate its time range.

## Media Records

[Media records](../lexicons/media.md) (`pub.layers.media`) store technical metadata about source files. An expression references its media via the `mediaRef` field.

```
Expression (kind="recording", text="Hello world")
    ├── mediaRef → Media (kind="audio", sampleRate=16000, codec="flac")
    ├── Word (text="Hello", anchor={temporalSpan: {start: 0, end: 500}})
    └── Word (text="world", anchor={temporalSpan: {start: 520, end: 1100}})
```

Media records carry modality-specific metadata through composable info objects:

- **`audioInfo`**: sample rate, channels, bit depth, codec, speaker count
- **`videoInfo`**: resolution, frame rate, codec, aspect ratio, color space
- **`documentInfo`**: DPI, page count, script system, writing direction, OCR engine

A video media record can carry both `videoInfo` and `audioInfo` since video files typically contain an audio track.

## Annotating Text

Text annotation uses `textSpan` or `tokenRef` anchors. Character offsets reference the expression's `text` field.

```json
{
  "kind": "span",
  "subkind": "ner",
  "annotations": [
    {
      "anchor": {
        "kind": "textSpan",
        "textSpan": { "start": 0, "end": 5 }
      },
      "label": "PERSON",
      "text": "Alice"
    }
  ]
}
```

For token-aligned annotations, use `tokenIndex` referencing a [segmentation](../lexicons/segmentation.md) record:

```json
{
  "kind": "token-tag",
  "subkind": "pos",
  "annotations": [
    { "tokenIndex": 0, "label": "NNP" },
    { "tokenIndex": 1, "label": "VBD" }
  ]
}
```

## Annotating Audio

Audio annotation uses `temporalSpan` anchors with millisecond offsets. The expression's `mediaRef` points to an audio media record.

```json
{
  "kind": "tier",
  "subkind": "speaker",
  "annotations": [
    {
      "anchor": {
        "kind": "temporalSpan",
        "temporalSpan": { "start": 0, "end": 3200 }
      },
      "label": "SPK01",
      "text": "I went to the store yesterday"
    }
  ]
}
```

Multiple annotation layers (speaker turns, transcription, POS tags, prosody) can all reference the same temporal spans, building up layers of analysis.

For forced alignment between audio and text, use [`pub.layers.alignment`](../lexicons/alignment.md) with `kind="audio-to-text"`.

## Annotating Video

Video annotation combines temporal and spatial dimensions. Two anchor types apply:

**Temporal only** (`temporalSpan`): For annotations that span a time range without spatial specificity, such as scene labels, speaker turns, and temporal events.

**Spatiotemporal** (`spatioTemporalAnchor`): For tracking objects through video frames. Defined by keyframes, each with a timestamp and [bounding box](../foundations.md#spatialexpression):

```json
{
  "kind": "span",
  "subkind": "entity-mention",
  "annotations": [
    {
      "anchor": {
        "kind": "spatioTemporalAnchor",
        "spatioTemporalAnchor": {
          "keyframes": [
            { "timeMs": 0, "bbox": { "x": 100, "y": 50, "width": 200, "height": 300 } },
            { "timeMs": 1000, "bbox": { "x": 120, "y": 55, "width": 195, "height": 295 } },
            { "timeMs": 2000, "bbox": { "x": 150, "y": 60, "width": 190, "height": 290 } }
          ],
          "interpolation": "linear"
        }
      },
      "label": "person",
      "text": "Speaker A"
    }
  ]
}
```

Frames between keyframes are computed via interpolation (`linear`, `step`, or `cubic`).

For semantic spatial annotation (e.g., "this scene takes place in Tokyo"), use the `spatial` field on annotations with a [`spatialExpression`](../foundations.md#spatialexpression). See the [Spatial Representation guide](./spatial-representation.md) for details.

## Annotating Images

Image annotation uses bounding boxes in pixel coordinates via the `spatial` field:

```json
{
  "kind": "span",
  "subkind": "entity-mention",
  "annotations": [
    {
      "anchor": {
        "kind": "textSpan",
        "textSpan": { "start": 0, "end": 0 }
      },
      "label": "cat",
      "spatial": {
        "type": "region",
        "value": {
          "bbox": { "x": 50, "y": 30, "width": 200, "height": 150 },
          "crs": "pixel"
        }
      }
    }
  ]
}
```

For non-rectangular regions, use `spatialEntity.geometry` with polygon coordinates. Layers supports WKT, GeoJSON, SVG path, and COCO polygon formats via the `geometryFormat` field. See the [Spatial Representation guide](./spatial-representation.md) for format details.

## Annotating Paged Documents

Paged documents (PDFs, scanned manuscripts) use `pageAnchor`:

```json
{
  "kind": "span",
  "subkind": "ner",
  "annotations": [
    {
      "anchor": {
        "kind": "pageAnchor",
        "pageAnchor": {
          "page": 3,
          "x": 100,
          "y": 200,
          "width": 150,
          "height": 20
        }
      },
      "label": "PERSON",
      "text": "Marie Curie"
    }
  ]
}
```

The media record for a paged document carries `documentInfo` with DPI, page count, script system, and OCR engine metadata.

## Annotating Web Content

Web content uses `externalTarget` anchors combined with W3C selectors:

```json
{
  "anchor": {
    "kind": "externalTarget",
    "sourceUri": "at://did:plc:.../pub.layers.expression/...",
    "selector": {
      "type": "TextQuoteSelector",
      "exact": "linguistic annotation",
      "prefix": "the field of ",
      "suffix": " has grown"
    }
  }
}
```

Layers supports three W3C selector types: `TextQuoteSelector`, `TextPositionSelector`, and `FragmentSelector`. These enable compatibility with [W3C Web Annotation](../integration/data-models/w3c-web-annotation.md) clients.

## Combining Modalities

A multimodal expression can nest sub-expressions of different modalities:

```
Expression (kind="multimodal")
    ├── Expression (kind="video", mediaRef → video.mp4)
    │   └── annotations on temporalSpan and spatioTemporalAnchor
    ├── Expression (kind="transcript", text="...")
    │   └── annotations on textSpan and tokenRef
    └── Alignment (kind="audio-to-text")
        └── links video temporal spans to transcript tokens
```

The [`pub.layers.alignment`](../lexicons/alignment.md) lexicon connects annotations across modalities. An `audio-to-text` alignment links temporal spans in the audio/video to token ranges in the transcript.

## Semantic Time and Space

Beyond anchoring (where in the media), annotations can carry **semantic** temporal and spatial information (what time/place the content refers to):

- **Temporal**: The [`temporal`](../foundations.md#temporalexpression) field on annotations carries structured temporal values. See the [Temporal Representation guide](./temporal-representation.md).
- **Spatial**: The [`spatial`](../foundations.md#spatialexpression) field carries structured spatial values. See the [Spatial Representation guide](./spatial-representation.md).

These are independent of the anchor. An annotation anchored at 3:45 in a recording (media time) might carry a temporal expression referring to "next Tuesday" (semantic time).

## See Also

- [Primitives](../foundations.md): anchor, temporalExpression, spatialExpression definitions
- [Temporal Representation](./temporal-representation.md): temporal primitives and standards mapping
- [Spatial Representation](./spatial-representation.md): spatial primitives and standards mapping
- [Knowledge Grounding](./knowledge-grounding.md): linking annotations to external KBs
- [Expression](../lexicons/expression.md): recursive linguistic unit records
- [Annotation](../lexicons/annotation.md): unified annotation model
- [Media](../lexicons/media.md): audio, video, image, and document metadata
- [Alignment](../lexicons/alignment.md): cross-record and cross-modal linking
- [Segmentation](../lexicons/segmentation.md): tokenization and chunking
