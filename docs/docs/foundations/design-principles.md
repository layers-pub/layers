---
sidebar_label: "Design Principles"
sidebar_position: 2
---

# Design Principles

Layers is guided by ten principles that ensure it remains modular, interoperable, and extensible:

## 1. Theory-Neutral

Layers makes no commitment to any linguistic theory. All labels, categories, types, and formalisms are represented as **data values**, not schema. This allows researchers working in different theoretical frameworks to use the same schema to represent their annotations.

> A part-of-speech tag is stored as a string value (e.g., `"NOUN"`, `"V_TRANS"`, `"PART_SPEECH"`) with an optional `typeUri` pointing to an authority record. The schema does not privilege one tagset (Penn Treebank, Universal Dependencies, EAGLES) over another.

## 2. Abstract and Modular

Rather than defining dozens of specialized record types (OneRecord for POS tagging, AnotherRecord for NER, ThirdRecord for SRL), Layers defines a **single annotation type** discriminated by enumerated `kind` and `subkind` fields. All annotation logic flows through the same schema, reducing duplication and making composition transparent.

> A token-level POS tag, a span-level named entity, and a sentence-level sentiment annotation all use the same `pub.layers.annotation.annotation` record type, differing only in `kind` ("token", "span", "sentence"), `subkind` ("pos-tag", "named-entity", "sentiment"), and their anchors.

## 3. Stand-Off Architecture

Annotations never modify source text or assume a mutable document. Instead, annotations **reference source by offset, UUID, or temporal span**. This ensures source data remains immutable and annotations can accumulate, contradict, and coexist without conflicts.

> A token annotation references its source via an anchor specifying text offsets `{start: 45, end: 52}` in a source document. A revision to the source document gets a new UUID; annotations can track both the source UUID and the offsets for robustness.

## 4. Recursive Composition

Annotations can reference other annotations across layers and records. This allows **layered analysis**: part-of-speech tags reference tokens, syntactic constituents reference tokens and other constituents, semantic role annotations reference constituents, etc.

> A semantic role annotation can anchor to a syntactic constituent (itself an annotation) rather than directly to text. If the constituent boundaries change (e.g., due to a parse revision), the semantic role annotation remains linked to the constituent, not the text.

## 5. Multimodal Support

Annotations apply to text, audio, video, image, and paged documents through a **polymorphic anchor type**. The same annotation schema works across modalities by switching the anchor kind (textSpan, temporalSpan, spatioTemporalAnchor, pageAnchor, etc.). See the [Multimodal Annotation guide](../guides/multimodal-annotation.md) for practical examples.

> A speech transcription uses temporal anchors `{start: 12.5, end: 15.3}` in seconds, and a POS tag in that transcription anchors to the same time span. An image analysis uses spatial anchors `{x: 100, y: 50, width: 200, height: 150}`, and a caption annotation anchors the same way.

## 6. Knowledge-Grounded

Every major annotation type includes a `knowledgeRefs` field for linking to external knowledge bases. A named entity annotation can link to a Wikidata entry, a frame label can link to FrameNet, and a dependency type can link to a Universal Dependencies authority record. See the [Knowledge Grounding guide](../guides/knowledge-grounding.md) for the full entity grounding workflow.

> A named entity annotation with label "Obama" includes a knowledgeRef to Wikidata Q76 (Barack Hussein Obama). Tools can then resolve the entity to structured data, infer properties, or link to other corpora mentioning the same entity.

## 7. Eprint-Linked

Layers integrates with eprint platforms (including chive.pub, a decentralized eprint service built on ATProto). Annotation datasets and corpus releases are published as eprints; individual annotations can reference back to associated publications. Researchers can find annotation datasets by searching for papers, or browse all annotations on a paper.

> A named entity corpus release is published as an eprint with full metadata (authors, abstract, publication venue). Annotation records link back to the eprint via an `eprintUri`. Researchers can discover the corpus by searching the publication platform.

## 8. Interoperable

Layers uses **W3C Web Annotation selectors** (textQuoteSelector, textPositionSelector, fragmentSelector) for compatibility with at.margin and other Web Annotation clients. At the same time, it is **ATProto-native**, using DIDs, AT-URIs, and records to integrate with the broader ATProto ecosystem.

> An annotation uses both a `textPositionSelector` (for Web Annotation compatibility) and a `tokenRef` (for ATProto integration). Clients can consume it either way.

## 9. Decentralized

All annotation data lives in **user-controlled Personal Data Servers (PDSes)**. There is no central database or authoritative archive. Users publish annotation records to their PDSes; appviews index and search across records from multiple users. If an appview is shut down or deletes its database, no user data is lost.

> A researcher annotates a corpus and publishes annotation records to their PDS. An appview indexes those records and makes them searchable. The researcher retains full ownership and can revoke access, migrate to a different PDS, or delete records at any time.

## 10. Community-Expandable Enums

All enumerated fields use a **dual pattern**: a `fooUri` field pointing to an ATProto record (the canonical reference) and a `foo` string field containing a slug (for human readability and fallback). See [Flexible Enums](./flexible-enums.md) for a detailed explanation with examples. Consumers check the URI first; if not recognized, they fall back to the slug. Known values are documented but not enforced.

This allows the community to **mint new values without schema changes**: someone creates a new linguistic category as a knowledge graph node, uses its AT-URI in their annotations, and the schema accommodates it transparently.

> A `kind` field always has a corresponding `kindUri`. Standard values like "token" have known URIs, but anyone can create a new kind node and use its URI. Consumers recognize both standard and custom kinds through the same mechanism.
