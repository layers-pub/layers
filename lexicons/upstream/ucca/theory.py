"""Theory of UCCA passages.

Source spec:
  Abend, Omri & Ari Rappoport. 2013. Universal Conceptual Cognitive
    Annotation (UCCA). ACL 2013, pages 228-238.
  UCCA Foundational Layer guidelines (current):
    https://github.com/UniversalConceptualCognitiveAnnotation/docs

Distribution:
  https://github.com/UniversalConceptualCognitiveAnnotation/UCCA_English-Wiki
  https://github.com/UniversalConceptualCognitiveAnnotation/UCCA_English-20K
  Multilingual UCCA: French (UCCA-French-20K), German (UCCA-German-20K).

UCCA stores passages as XML files (`.xml`) parseable by the `ucca`
Python toolkit (`pip install ucca`). A passage is a layered DAG:
the L0 (`Terminals`) layer is the surface tokens, the L1
(`Foundational`) layer carries the semantic units + categorial
edges between them. UCCA edge categories are the 14 foundational
labels (P/S/A/D/T/C/E/N/L/H/F/G/R/U).

This theory captures the subset of UCCA shape the lens reads. The
parser of choice is `ucca`; this theory keeps a minimal interface
so future swaps to `ucca-tools` or hand-rolled XML readers plug in
cleanly.
"""

from __future__ import annotations

from typing import Literal

import didactic.api as dx

# UCCA foundational-layer category set (Abend & Rappoport 2013, Table 1).
UCCACategory = Literal[
    "P",  # Process
    "S",  # State
    "A",  # Participant
    "D",  # Adverbial
    "T",  # Time
    "C",  # Center
    "E",  # Elaborator
    "N",  # Connector
    "L",  # Linker
    "H",  # Parallel scene
    "F",  # Function
    "G",  # Ground
    "R",  # Relator
    "U",  # Punctuation
]

UCCALayer = Literal["0", "1"]


class UCCATerminal(dx.Model, extra="ignore"):
    """One L0 terminal (surface token)."""
    id: str = dx.field(description="Stable terminal id within the passage (e.g. `1.1`).")
    text: str
    paragraph: int | None = None
    paragraph_position: int | None = None
    tag: str | None = dx.field(default=None, description="UD/PTB POS tag if the loader extracted one.")


class UCCAUnit(dx.Model, extra="ignore"):
    """One L1 foundational unit (non-terminal)."""
    id: str = dx.field(description="Stable unit id within the passage (e.g. `1.2`).")
    layer: UCCALayer = "1"
    children: tuple["UCCAEdge", ...] = dx.field(default_factory=tuple)
    is_remote: bool = False
    is_implicit: bool = False


class UCCAEdge(dx.Model, extra="ignore"):
    """One labelled categorial edge between two UCCA nodes."""
    parent_id: str
    child_id: str
    category: UCCACategory
    is_remote: bool = False
    is_implicit: bool = False


class UCCAPassage(dx.Model, extra="ignore"):
    """One UCCA passage (one annotated text)."""
    id: str = dx.field(description="Passage id from the upstream release (e.g. `wiki-100023`).")
    text: str = dx.field(description="Surface text reconstructed from terminals.")
    language: str = dx.field(description="ISO 639-3 code (eng, fra, deu).")
    terminals: tuple[UCCATerminal, ...] = dx.field(default_factory=tuple)
    units: tuple[UCCAUnit, ...] = dx.field(default_factory=tuple)
    edges: tuple[UCCAEdge, ...] = dx.field(default_factory=tuple)
    title: str | None = None
    source: str | None = dx.field(default=None, description="Upstream release identifier (English-Wiki, English-20K, French-20K, German-20K).")



class UCCABundle(dx.Model, extra="ignore"):
    """One UCCA release (a set of passages from one corpus distribution)."""
    name: str = dx.field(description="Distribution slug, e.g. `english-wiki`, `english-20k`, `french-20k`, `german-20k`.")
    language: str
    license: str = dx.field(default="GNU GPL v3.0 (UCCA toolkit) + CC BY 4.0 (UCCA corpora).")
    citation: str = "Abend & Rappoport 2013 ACL."
    passages: tuple[UCCAPassage, ...] = dx.field(default_factory=tuple)


__all__ = [
    "UCCACategory",
    "UCCATerminal",
    "UCCAUnit",
    "UCCAEdge",
    "UCCAPassage",
    "UCCABundle",
]
