"""Theory of AMR (Abstract Meaning Representation) graphs.

Source spec:
  Banarescu, Laura et al. 2013. Abstract Meaning Representation for
    Sembanking. Proceedings of the 7th Linguistic Annotation Workshop
    and Interoperability with Discourse, pages 178-186.
  AMR Annotation Guidelines: https://github.com/amrisi/amr-guidelines
  PENMAN Notation: https://amr.isi.edu/language.html

LDC AMR releases:
  LDC2014T12 (AMR 1.0)
  LDC2017T10 (AMR 2.0)
  LDC2020T02 (AMR 3.0)

AMR graphs are rooted, directed, acyclic, edge-labelled graphs where
nodes are concepts (PropBank framesets like `give-01` or non-frame
concepts like `boy` or constants like dates) and edges are
PropBank-style numbered roles (`:ARG0`, `:ARG1`, …) plus general
roles (`:location`, `:time`, `:manner`, `:mod`, `:polarity`, …).

The PENMAN notation serialises a graph as a parenthesised tree where
re-entrancies (a concept node appearing as the value of more than
one role) use variable references:

    (g / give-01
       :ARG0 (b / boy)
       :ARG1 (b2 / book)
       :ARG2 (g2 / girl))

This theory captures one AMR pair (sentence + graph) plus the LDC
release metadata. The lens reads this; AMR-specific constants and
their projections live in `lens.py`.
"""

from __future__ import annotations

from typing import Literal

import didactic.api as dx


class AMRNode(dx.Model, extra="ignore"):
    """One AMR concept node.
    `variable` is the PENMAN variable (`g`, `b`, `b2` in the example
    above) used to encode re-entrancies. `concept` is the AMR concept
    the variable instantiates: a PropBank frameset, a non-frame
    concept, or a constant (string, number, date-entity).
    """

    variable: str
    concept: str = dx.field(
        description="PropBank frameset (`give-01`), non-frame concept (`boy`), "
        "or constant (`'2026-05-06'`, `42`, `-`)."
    )
    is_constant: bool = False
    is_frameset: bool = dx.field(
        default=False,
        description="True iff `concept` matches the PropBank-frameset pattern (lemma.NN).",
    )


class AMREdge(dx.Model, extra="ignore"):
    """One AMR labelled edge."""
    source_variable: str
    role: str = dx.field(description="AMR role label including the leading colon, e.g. `:ARG0`, `:location`.")
    target_variable: str | None = dx.field(
        default=None,
        description="Target variable for re-entrant + nested concepts; `None` for constant-valued roles.",
    )
    target_constant: str | None = dx.field(
        default=None,
        description="Inline literal target for constant-valued roles (e.g. `:polarity -`, `:wiki \"Barack_Obama\"`).",
    )


class AMRGraph(dx.Model, extra="ignore"):
    """One AMR-annotated sentence."""
    id: str = dx.field(description="Sentence-level identifier from the LDC release (e.g. `nw.eng_dz_0001.0`).")
    snt: str = dx.field(description="The surface sentence the graph annotates.")
    nodes: tuple[AMRNode, ...] = dx.field(default_factory=tuple)
    edges: tuple[AMREdge, ...] = dx.field(default_factory=tuple)
    root_variable: str = dx.field(description="Variable name of the graph's root concept.")
    metadata: dict[str, str] = dx.field(
        default_factory=dict,
        description="Free-form `# ::key value` comments above the PENMAN graph (`tok`, `alignments`, `lemmas`, `pos`, `ner`, `save-date`, …).",
    )


AMRRelease = Literal["amr-1.0", "amr-2.0", "amr-3.0"]


class AMRBundle(dx.Model, extra="ignore"):
    """One AMR release bundle (LDC corpus tarball)."""
    release: AMRRelease
    license: str = dx.field(default="LDC User Agreement; redistribution restricted.")
    citation: str
    graphs: tuple[AMRGraph, ...] = dx.field(default_factory=tuple)


__all__ = ["AMRNode", "AMREdge", "AMRGraph", "AMRBundle", "AMRRelease"]
