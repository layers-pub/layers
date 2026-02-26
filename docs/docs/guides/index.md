---
sidebar_label: "Overview"
---

# Guides

These guides provide in-depth coverage of cross-cutting topics in Layers. Each guide explains how multiple lexicons and primitives work together to support a particular capability.

- **[Temporal Representation](./temporal-representation.md)**: Composable temporal primitives for dates, durations, intervals, recurrence, and temporal relations (Allen's Interval Algebra). Maps to TimeML, OWL-Time, and ISO 8601.

- **[Spatial Representation](./spatial-representation.md)**: Composable spatial primitives for geographic coordinates, regions, paths, and spatial relations (RCC-8). Maps to GeoJSON, WKT, ISO-Space, SpatialML, and computer vision formats.

- **[Multimodal Annotation](./multimodal-annotation.md)**: How the polymorphic anchor type supports annotation across text, audio, video, image, and paged documents. Covers media records, temporal and spatial anchoring, and practical examples.

- **[Knowledge Grounding](./knowledge-grounding.md)**: Linking annotations to external knowledge bases (Wikidata, FrameNet, WordNet), building typed property graphs, defining ontologies, and the entity grounding workflow.

- **[Psycholinguistic Data](./psycholinguistic-data.md)**: How self-paced reading, eye-tracking, EEG, MEG, and fMRI data map to Layers primitives. Covers stimulus generation, behavioral responses, neural signals, and experimental design.

- **[Judgment Data](./judgment-data.md)**: The full lifecycle of linguistic judgment data: experiment definition, stimulus generation, data collection, and agreement analysis. Covers categorical, scalar, ranking, span selection, free text, pairwise comparison, and best-worst scaling tasks.

- **[Annotation Design](./annotation-design.md)**: Annotation project design metadata: source method, annotator redundancy, adjudication, and quality criteria. Covers treebanks, sembanks, crowd-sourced corpora, silver annotation, and conversion projects.

## See Also

- [Primitives](../foundations/primitives.md) for the core building blocks used across all guides
- [Lexicon Overview](../foundations/lexicon-overview.md) for the full list of schemas
- [Flexible Enums](../foundations/flexible-enums.md) for the URI+slug pattern used throughout
