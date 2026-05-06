"""Theory of CHILDES CHAT-format utterances.

Source spec:
  TalkBank CHAT manual: https://talkbank.org/manuals/CHAT.pdf
  Distribution: https://childes.talkbank.org/
  License: per-corpus; default TalkBank Ground Rules permit research-
    use redistribution with attribution. Many corpora ship CC BY-NC-SA
    3.0; some ship CC BY 4.0; some require explicit permission.
  Citation: MacWhinney, Brian. 2000. The CHILDES Project: Tools for
    Analyzing Talk. Mahwah, NJ: Lawrence Erlbaum Associates.

CHAT files are line-oriented transcripts. Each utterance occupies
one main `*<speaker>:` line plus optional dependent tiers `%mor`
(morphology), `%gra` (grammatical relations), `%xtokens`/`%tok`
(tokenization), `%sit` (situation), etc.

This theory captures the subset of CHAT shape the lens reads. The
parser of choice is `pylangacq`; this theory keeps a minimal
interface so future swaps to other CHAT parsers (`talkbank-pyclient`,
the original CLAN) plug in cleanly.
"""

from __future__ import annotations

from didactic.types._typing import JsonObject

import didactic.api as dx


class CHATToken(dx.Model, extra="ignore"):
    """One token in an utterance.
    pylangacq returns tokens with `word`, optional `pos` (from %mor),
    optional `mor` (full morphology string), optional `gra` head/rel
    (from %gra). We keep a permissive surface so corpora that omit
    dependent tiers still parse.
    """

    word: str
    pos: str | None = None
    mor: str | None = None
    gra_head: int | None = None
    gra_rel: str | None = None



class CHATUtterance(dx.Model, extra="ignore"):
    """One utterance line from a CHAT file."""
    participant: str = dx.field(description="Speaker code (CHI, MOT, FAT, INV, …).")
    text: str = dx.field(description="The full surface utterance, untokenised.")
    tokens: tuple[dx.Embed[CHATToken], ...] = dx.field(default_factory=tuple)
    # Metadata tiers we don't typecheck but want to preserve.
    tiers: dict[str, str] = dx.field(default_factory=dict)


class CHATSession(dx.Model, extra="ignore"):
    """One CHAT file (one recording session).
    Sessions live under `<corpus>/<file>.cha`. Carries header tiers
    (`@Languages`, `@Participants`, `@ID`, …) plus the body of
    utterances.
    """

    path: str
    languages: tuple[str, ...] = dx.field(default_factory=tuple)
    participants: dict[str, str] = dx.field(
        default_factory=dict,
        description="Speaker-code → full role label (e.g. `MOT` → `Mother`).",
    )
    utterances: tuple[dx.Embed[CHATUtterance], ...] = dx.field(default_factory=tuple)
    headers: dict[str, str] = dx.field(default_factory=dict)


class CHILDESCorpus(dx.Model, extra="ignore"):
    """One CHILDES corpus directory: a set of CHAT sessions sharing a
    contributor + language + collection identity."""

    name: str
    language: str = dx.field(description="ISO 639-3 language code (eng, deu, jpn, …).")
    license: str | None = None
    sessions: tuple[dx.Embed[CHATSession], ...] = dx.field(default_factory=tuple)
    metadata: JsonObject = dx.field(default_factory=dict)


__all__ = ["CHATToken", "CHATUtterance", "CHATSession", "CHILDESCorpus"]
