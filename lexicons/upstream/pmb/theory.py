"""Theory of Parallel Meaning Bank (PMB) DRS annotations.

Source spec:
  Abzianidze, Lasha, Johannes Bjerva, Kilian Evang, Hessel Haagsma,
    Rik van Noord, Pierre Ludmann, Duc-Duy Nguyen & Johan Bos. 2017.
    The Parallel Meaning Bank: Towards a Multilingual Corpus of
    Translations Annotated with Compositional Meaning Representations.
    EACL 2017, pages 242-247.
  Bos, Johan. 2023. The Sequence Notation: Catching Complex Meanings
    in Simple Graphs. IWCS 2023.
  Distribution: https://pmb.let.rug.nl/data.php
  PMB releases: 1.0.0, 2.0.0, 3.0.0, 4.0.0, 5.0.0 (current).

PMB stores Discourse Representation Structures (DRS) in clausal
form: a flat list of clauses where each clause is a 4-tuple
`<box, op, arg1, arg2>` linking discourse boxes, referents, and
relations. Each PMB entry is one (language, document) pair drawn
from translated text:

* English (en) — the gold-standard reference.
* Dutch (nl), German (de), Italian (it) — also annotated.

Annotation tiers per release:
  * gold — fully manually verified.
  * silver — partially verified.
  * bronze — automatically generated.

This theory captures one PMB document (one DRS plus its surface
sentence + token-level alignments).
"""

from __future__ import annotations

from typing import Literal

import didactic.api as dx


PMBTier = Literal["gold", "silver", "bronze"]


class DRSClause(dx.Model, extra="ignore"):
    """One DRS clause in PMB clausal format.
    Clauses follow `<box> <op> <arg1> [<arg2>]` where `op` is a DRS
    operator (`REF`, `Concept`, `WordRel`, `Time`, `EQU`, `NOT`,
    `IMP`, `OR`, `POS`, `NEC`, …) and the args are box / referent /
    role labels per the operator's signature. PMB documents the
    canonical operator inventory at:
    https://pmb.let.rug.nl/clf-spec.php
    """

    box: str = dx.field(description="The DRS box (variable like `b1`, `b2`, …) the clause is in.")
    op: str = dx.field(description="DRS operator (REF / Concept / WordRel / EQU / IMP / NEG / …).")
    arg1: str
    arg2: str | None = None
    # PMB's CLF format records the alignment `[from-to]` token range
    # at the end of each clause for one-token alignments and `[]`
    # for non-aligned clauses.
    alignment: tuple[int, ...] = dx.field(default_factory=tuple)


class PMBToken(dx.Model, extra="ignore"):
    """One surface token in a PMB document."""
    text: str
    lemma: str | None = None
    pos: str | None = None
    sense: str | None = dx.field(default=None, description="WordNet sense key when present in the .tok file.")


class PMBDocument(dx.Model, extra="ignore"):
    """One PMB document (one (language, tier, doc-id) triple)."""
    id: str = dx.field(description="PMB document id (e.g. `00/0001/p00d0001`).")
    language: str = dx.field(description="ISO 639-3 language code (eng, nld, deu, ita).")
    tier: PMBTier
    raw_text: str = dx.field(description="Surface text reconstructed from the .raw file.")
    tokens: tuple[PMBToken, ...] = dx.field(default_factory=tuple)
    clauses: tuple[DRSClause, ...] = dx.field(default_factory=tuple)


class PMBBundle(dx.Model, extra="ignore"):
    """One PMB release bundle for one (language, tier) tuple.
    PMB ships gold/silver/bronze per language as separately-citable
    artefacts: each tier within each language gets its own leaf in
    the registry per the policy.
    """

    release: str = dx.field(description="PMB release tag, e.g. `4.0.0`, `5.0.0`.")
    language: str
    tier: PMBTier
    license: str = dx.field(
        default="CC BY-SA 4.0",
        description="PMB releases are CC BY-SA 4.0; 1.0.0 was CC BY-NC 4.0 — check release notes.",
    )
    citation: str = "Abzianidze et al. 2017 EACL."
    documents: tuple[PMBDocument, ...] = dx.field(default_factory=tuple)


__all__ = [
    "DRSClause",
    "PMBToken",
    "PMBDocument",
    "PMBBundle",
    "PMBTier",
]
