---
sidebar_label: Overview
sidebar_position: 1
---

# ATProto Ecosystem Integration

Layers is a native participant in the AT Protocol ecosystem. ATProto records are interlinked via AT-URIs, so Layers data can reference and be referenced by records from other ATProto applications without any bridge layer.

## Applications

| Application | Namespace | Integration Page |
|---|---|---|
| Semble | `network.cosmik.*` | [Semble](./semble) |
| at.margin | `at.margin.*` | [at.margin](./margin) |
| Chive | `pub.chive.*` | [Chive](./chive) |
| Bluesky | `app.bsky.*` | [Bluesky](./bluesky) |
| Leaflet (standard.site) | `site.standard.*` | [Leaflet](./leaflet) |
| WhiteWind | `com.whtwnd.*` | [WhiteWind](./whitewind) |
| ATFile | `blue.zio.atfile.*` | [ATFile](./atfile) |
| Bluesky Labels | `com.atproto.label.*` | [Labels](./labels) |

## How Integration Works

All integration follows the same pattern: AT-URI cross-referencing. A Layers record stores the AT-URI of an external record in a ref field (`sourceRef`, `eprintRef`, `expressionRef`, etc.), and the Layers appview indexes these references for discovery.

If application A stores a record at `at://did:plc:alice/app.a.record/123`, any Layers record can reference it by setting a ref field to that AT-URI. The appview indexes the reference and can resolve it when needed.

## Discovery Model

The Layers appview subscribes to the ATProto firehose and indexes all `pub.layers.*` records it encounters. For each record, it extracts and indexes external references:

- `expression.sourceUrl` — find all Layers annotations of a given web page
- `expression.sourceRef` — find all Layers annotations of a given ATProto record
- `expression.eprintRef` — find all Layers data linked to a given eprint
- `graph.graphEdge` target references — find all Layers data linked to a given knowledge graph node (chive.pub, Wikidata, etc.)

This indexing model lets the appview answer queries like "show me all linguistic annotations of this Bluesky post" or "show me all corpora linked to this DOI" without cooperation from the source application.
