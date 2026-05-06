"""Lens: CHILDES corpus → Layers seed records.

Inputs: one CHILDESCorpus (one (language, corpus) tuple).

Outputs:

* `pub.layers.corpus.corpus`         on `<corpus>.<lang>.childes.corpus.layers.pub`
* `pub.layers.corpus.membership`     on `<corpus>.<lang>.childes.corpus.layers.pub`
* `pub.layers.expression.expression` on `<corpus>.<lang>.childes.expression.layers.pub`
* `pub.layers.segmentation.segmentation` on `<corpus>.<lang>.childes.segmentation.layers.pub`
* `pub.layers.annotation.annotationLayer` (POS layer when `%mor` present,
  dep layer when `%gra` present) on `<corpus>.<lang>.childes.annotation.layers.pub`
* `pub.layers.persona.persona`       on `<corpus>.<lang>.childes.persona.layers.pub`
"""

from __future__ import annotations

from collections.abc import Iterator

from .. import SeedRecord, dx
from .theory import CHATSession, CHILDESCorpus


def _slugify(name: str) -> str:
    out: list[str] = []
    for ch in name.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in "-_ ":
            out.append("-")
    slug = "".join(out).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "corpus"


def _at_uri(handle: str, collection: str, rkey: str) -> str:
    return f"at://{handle}/{collection}/{rkey}"


class CHILDESToLayers(dx.Mapping[CHILDESCorpus, list]):
    """didactic Mapping: CHILDES corpus → list[SeedRecord]."""

    def forward(self, corpus: CHILDESCorpus) -> list:
        return list(_project_corpus(corpus))


def _project_corpus(corpus: CHILDESCorpus) -> Iterator[SeedRecord]:
    slug = _slugify(corpus.name)
    lang = corpus.language
    h_corpus = f"{slug}.{lang}.childes.corpus.layers.pub"
    h_expr = f"{slug}.{lang}.childes.expression.layers.pub"
    h_seg = f"{slug}.{lang}.childes.segmentation.layers.pub"
    h_ann = f"{slug}.{lang}.childes.annotation.layers.pub"
    h_persona = f"{slug}.{lang}.childes.persona.layers.pub"

    corpus_rkey = slug
    corpus_uri = _at_uri(h_corpus, "pub.layers.corpus.corpus", corpus_rkey)
    yield SeedRecord(
        handle=h_corpus,
        kind="corpus",
        collection="pub.layers.corpus.corpus",
        body={
            "name": f"CHILDES — {corpus.name} ({lang})",
            "description": (
                f"CHILDES {corpus.name} corpus ({lang}). License: "
                f"{corpus.license or 'TalkBank Ground Rules'}. Citation: "
                f"see corpus 0met.cdc; root reference MacWhinney 2000, "
                f"The CHILDES Project (Lawrence Erlbaum)."
            ),
            "languages": [lang],
            "license": corpus.license or "TalkBank-Ground-Rules",
        },
        summary=f"Initial publish: CHILDES {corpus.name} ({lang})",
    )

    seen_speakers: set[str] = set()
    for session in corpus.sessions:
        yield from _project_session(session, corpus, slug, lang,
                                    h_expr, h_seg, h_ann, h_persona,
                                    h_corpus, corpus_uri, seen_speakers)


def _project_session(
    session: CHATSession,
    corpus: CHILDESCorpus,
    slug: str,
    lang: str,
    h_expr: str,
    h_seg: str,
    h_ann: str,
    h_persona: str,
    h_corpus: str,
    corpus_uri: str,
    seen_speakers: set[str],
) -> Iterator[SeedRecord]:
    session_stem = session.path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    for utt_idx, utt in enumerate(session.utterances):
        if utt.participant not in seen_speakers:
            seen_speakers.add(utt.participant)
            yield SeedRecord(
                handle=h_persona,
                kind="personas",
                collection="pub.layers.persona.persona",
                body={
                    "name": session.participants.get(utt.participant, utt.participant),
                    "languages": [lang],
                    "description": (
                        f"CHILDES participant role `{utt.participant}` "
                        f"from {corpus.name}."
                    ),
                },
            )

        expr_rkey = f"{slug}-{session_stem}-{utt_idx}"
        expr_uri = _at_uri(h_expr, "pub.layers.expression.expression", expr_rkey)
        yield SeedRecord(
            handle=h_expr,
            kind="expressions",
            collection="pub.layers.expression.expression",
            body={
                "id": expr_rkey,
                "kind": "utterance",
                "text": utt.text,
                "languages": [lang],
            },
        )

        if utt.tokens:
            tokens: list[dict[str, int | str]] = []
            offset = 0
            for t in utt.tokens:
                size = len(t.word.encode("utf-8"))
                tokens.append({
                    "text": t.word,
                    "byteStart": offset,
                    "byteEnd": offset + size,
                })
                offset += size + 1
            seg_rkey = f"{slug}-{session_stem}-{utt_idx}"
            seg_uri = _at_uri(h_seg, "pub.layers.segmentation.segmentation", seg_rkey)
            yield SeedRecord(
                handle=h_seg,
                kind="segmentations",
                collection="pub.layers.segmentation.segmentation",
                body={
                    "expression": expr_uri,
                    "tokenizations": [{"tokenizer": "chat-%tok", "tokens": tokens}],
                    "languages": [lang],
                },
            )

            # POS layer when at least one token carries a %mor tag.
            if any(t.pos for t in utt.tokens):
                pos_anns = []
                for tok_idx, t in enumerate(utt.tokens):
                    if not t.pos:
                        continue
                    pos_anns.append({
                        "anchor": {
                            "$type": "pub.layers.defs#tokenRef",
                            "segmentation": seg_uri,
                            "tokenization": 0,
                            "token": tok_idx,
                        },
                        "predicate": t.pos,
                        "value": t.mor or t.pos,
                    })
                if pos_anns:
                    yield SeedRecord(
                        handle=h_ann,
                        kind="pos-layers",
                        collection="pub.layers.annotation.annotationLayer",
                        body={
                            "expression": expr_uri,
                            "kind": "token-tag",
                            "subkind": "pos",
                            "formalism": "chat-%mor",
                            "annotations": pos_anns,
                            "languages": [lang],
                        },
                    )

            # Dep layer when at least one token carries a %gra arc.
            if any(t.gra_head is not None for t in utt.tokens):
                dep_anns = []
                for tok_idx, t in enumerate(utt.tokens):
                    if t.gra_head is None:
                        continue
                    dep_anns.append({
                        "anchor": {
                            "$type": "pub.layers.defs#tokenRefSequence",
                            "segmentation": seg_uri,
                            "tokenization": 0,
                            "tokens": [tok_idx, max(0, t.gra_head - 1)] if t.gra_head > 0 else [tok_idx],
                        },
                        "predicate": t.gra_rel or "dep",
                    })
                if dep_anns:
                    yield SeedRecord(
                        handle=h_ann,
                        kind="dep-layers",
                        collection="pub.layers.annotation.annotationLayer",
                        body={
                            "expression": expr_uri,
                            "kind": "relation",
                            "subkind": "dependency",
                            "formalism": "chat-%gra",
                            "annotations": dep_anns,
                            "languages": [lang],
                        },
                    )

        yield SeedRecord(
            handle=h_corpus,
            kind="memberships",
            collection="pub.layers.corpus.membership",
            body={"corpus": corpus_uri, "expression": expr_uri},
        )


__all__ = ["CHILDESToLayers"]

project = CHILDESToLayers()
