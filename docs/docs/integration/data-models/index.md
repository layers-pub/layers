---
sidebar_label: Overview
sidebar_position: 1
---

# Data Model Integration

Each page in this section maps a specific annotation framework's data model to Layers lexicons, identifying which `pub.layers.*` types, fields, and patterns correspond to the framework's constructs.

The goal is not to replicate each framework's API or file format, but to show that Layers' abstract primitives can faithfully represent the data each framework produces. If you can export data from one of these frameworks, you can represent it in Layers without information loss.

## Frameworks

| Framework | Origin | Primary Focus |
|-----------|--------|---------------|
| [Concrete](./concrete) | HLTCOE, Johns Hopkins | Multi-layer NLP pipeline output |
| [bead](./bead) | FACTS.lab, Johns Hopkins | Template-based judgment experiments |
| [FOVEA](./fovea) | parafovea project | Persona-driven annotation with ontologies |
| [LAF/GrAF](./laf-graf) | ISO 24612 | Stand-off graph annotation |
| [UIMA/CAS](./uima-cas) | Apache/OASIS | Type system-driven analysis |
| [CoNLL](./conll) | CoNLL shared tasks | Column-based token annotation |
| [TEI](./tei) | Text Encoding Initiative | XML document encoding |
| [ELAN/Praat](./elan-praat) | MPI / University of Amsterdam | Time-aligned multimedia annotation |
| [FoLiA](./folia) | Radboud University | XML linguistic annotation |
| [NAF](./naf) | NewsReader project | NLP pipeline interchange |
| [brat](./brat) | Tsujii Laboratory, University of Tokyo | Web-based text annotation |
| [AMR / UCCA / DRS / EDS](./amr) | Various | Semantic graph formalisms |
| [PAULA/Salt/ANNIS](./paula-salt) | Humboldt University / corpus-tools.org | Multi-layer corpus architecture |
| [NIF](./nif) | AKSW, University of Leipzig | Linked Data NLP interchange |
| [W3C Web Annotation](./w3c-web-annotation) | W3C Recommendation | Web-based annotation |
| [Decomp / UDS](./decomp) | Decompositional Semantics Initiative | Real-valued semantic property graphs |

## Methodology

Each integration page follows a consistent structure. It identifies the framework's core concepts, then maps each concept to the corresponding Layers type or pattern.

Where a framework's concept has no direct Layers equivalent, the document explains how to represent it using Layers' composable primitives (typically `featureMap` for framework-specific metadata, or `knowledgeRefs` for external grounding).
