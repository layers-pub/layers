---
sidebar_label: "Overview"
sidebar_position: 1
slug: /foundations
---

# Foundations

Layers is built on a small set of foundational concepts that ensure the schema remains modular, interoperable, and extensible across linguistic theories, annotation formalisms, and data modalities.

This section covers:

- **[Design Principles](./design-principles.md)**: Ten principles guiding all Layers design decisions: theory-neutrality, stand-off architecture, recursive composition, multimodal support, decentralization, and more.

- **[Primitives](./primitives.md)**: The core building blocks shared by all Layers lexicons: `objectRef`, `anchor`, `constraint`, `agentRef`, `annotationMetadata`, `temporalExpression`, `spatialExpression`, `knowledgeRef`, `featureMap`, `alignmentLink`, and W3C selectors.

- **[Flexible Enums](./flexible-enums.md)**: The URI+slug pattern that allows the community to mint new annotation kinds, tag sets, and categories without schema changes.

- **[Lexicon Overview](./lexicon-overview.md)**: The 13 lexicons organized into core pipeline layers, parallel tracks, and integration layers, with a dependency graph showing how they compose.
