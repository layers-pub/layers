"""Theory of UMR (Uniform Meaning Representation) annotations.

Source spec:
  Van Gysel, Jens E. L., Meagan Vigus, Jayeol Chun, Kenneth Lai,
    Sarah Moeller, Jiarui Yao, Tim O'Gorman, Andrew Cowell, William
    Croft, Chu-Ren Huang, Jan Hajič, James H. Martin, Stephan
    Oepen, Martha Palmer, James Pustejovsky, Rosa Vallejos & Nianwen
    Xue. 2021. Designing a Uniform Meaning Representation for
    Natural Language Processing. KI - Künstliche Intelligenz 35:343-360.
  UMR Annotation Guidelines: https://github.com/umr4nlp/umr-guidelines
  UMR Releases: https://umr4nlp.github.io/web/

UMR extends AMR in three ways:

  1. **Multilingual.** UMR is designed cross-linguistically.
     Releases ship per-language annotations (English, Chinese,
     Arabic, Sanapana, Arapaho, Kukama, Navajo, …). Per the registry
     subdomain policy, each language is a separately-citable artefact
     and gets its own leaf.
  2. **Document-level annotation.** Beyond per-sentence graphs, UMR
     adds a document-level layer encoding cross-sentence temporal
     relations (`:before`, `:after`, `:depends-on`), modal relations
     (`:full-affirmative`, `:partial-affirmative`, …), and coreference
     across sentences.
  3. **Richer aspect/modality.** Sentence graphs carry `:aspect`
     and `:modal-strength` predicates UMR-specific abstract concepts
     (e.g. `state`, `process`, `activity`, `endeavor`, `performance`).

UMR sentence-level graphs use PENMAN-like notation extending AMR's;
re-entrancies share the same variable convention. Document-level
graphs are also PENMAN-like, with sentence-level subgraph variables
as their leaves.
"""

from __future__ import annotations

from typing import Literal

import didactic.api as dx


# Same node + edge shape as AMR, with optional UMR-specific
# attributes (aspect, modal-strength).
class UMRNode(dx.Model, extra="ignore"):
    """One UMR concept node."""
    variable: str
    concept: str
    is_constant: bool = False
    is_frameset: bool = False
    aspect: str | None = dx.field(
        default=None,
        description="UMR aspect class: state, process, activity, endeavor, performance, habitual, generic, …",
    )
    modal_strength: str | None = dx.field(
        default=None,
        description="UMR modal strength: full-affirmative, partial-affirmative, neutral-affirmative, full-negative, partial-negative, neutral-negative.",
    )


class UMREdge(dx.Model, extra="ignore"):
    source_variable: str
    role: str
    target_variable: str | None = None
    target_constant: str | None = None


class UMRSentenceGraph(dx.Model, extra="ignore"):
    """Sentence-level UMR (extends AMR)."""
    id: str
    snt: str
    nodes: tuple[dx.Embed[UMRNode], ...] = dx.field(default_factory=tuple)
    edges: tuple[dx.Embed[UMREdge], ...] = dx.field(default_factory=tuple)
    root_variable: str
    metadata: dict[str, str] = dx.field(default_factory=dict)
    alignments: tuple[tuple[str, int, ...]] = dx.field(
        default_factory=tuple,
        description="UMR alignment of variable → token index in the surface sentence.",
    )


class UMRDocumentEdge(dx.Model, extra="ignore"):
    """Document-level relation between two sentence-graph variables.
    UMR's document layer carries three relation classes:

      :temporal       — :before, :after, :depends-on, :overlap
      :modal          — :full-affirmative, :partial-affirmative,
                        :neutral-affirmative, :full-negative,
                        :partial-negative, :neutral-negative,
                        :neutral, :affirmative-other
      :coref          — :same-entity, :same-event
    """

    source_sentence_id: str
    source_variable: str
    target_sentence_id: str
    target_variable: str
    relation_class: Literal["temporal", "modal", "coref"]
    relation: str = dx.field(description="Specific relation label, e.g. `:before`, `:full-affirmative`, `:same-entity`.")


class UMRDocument(dx.Model, extra="ignore"):
    """One UMR document: a contiguous span of sentences sharing a doc-level layer."""
    id: str
    sentences: tuple[dx.Embed[UMRSentenceGraph], ...] = dx.field(default_factory=tuple)
    document_edges: tuple[dx.Embed[UMRDocumentEdge], ...] = dx.field(default_factory=tuple)


class UMRBundle(dx.Model, extra="ignore"):
    """One UMR release for a specific language."""
    release: str = dx.field(description="UMR release tag, e.g. `0.9`, `1.0`.")
    language: str = dx.field(description="ISO 639-3 language code.")
    license: str = dx.field(default="CC BY-SA 4.0; per-language permissions vary.")
    citation: str = "Van Gysel et al. 2021 KI."
    documents: tuple[dx.Embed[UMRDocument], ...] = dx.field(default_factory=tuple)


__all__ = [
    "UMRNode",
    "UMREdge",
    "UMRSentenceGraph",
    "UMRDocumentEdge",
    "UMRDocument",
    "UMRBundle",
]
