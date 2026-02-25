---
sidebar_label: Overview
sidebar_position: 1
---

# Integration

Layers integrates with external systems at two levels: data model compatibility with existing annotation frameworks, and direct interoperation with AT Protocol applications.

## Data Model Integration

Layers maps the data models of 16 annotation frameworks to its lexicon system. Each mapping demonstrates that Layers' primitives can represent the framework's output without information loss. See [Data Models](./data-models/) for the full list.

## ATProto Ecosystem

Layers is a native ATProto application. Its records interlink with records from other ATProto applications via AT-URI cross-referencing, with no bridge records or adapter layers required. See [ATProto Ecosystem](./atproto/) for per-application integration details.
