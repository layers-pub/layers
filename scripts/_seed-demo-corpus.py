#!/usr/bin/env python3
"""Author the UD-EWT-derived 50-sentence demo corpus across four
subaccounts: corpus, expression, segmentation, annotation.

Sentences are a hand-curated mix of canonical linguistics examples
(garden paths, structural ambiguity, scope, presupposition) plus
short colloquial sentences that mirror the EWT genre. Each gets one
expression, one segmentation, one POS-layer (UD v2 tags), one
dep-layer (UD v2 relations).

Re-run this script to regenerate the YAML stream files.
"""

from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).parent.parent / "lexicons" / "seeds"
CREATED_AT = "2026-05-06T00:00:00Z"
LANGUAGE = "eng"

# (sentence_text, [(token, pos_tag), …], [(child_index, head_index, deprel), …])
# All POS + deprels are UD v2. head_index is 0 for the root token.
# Tokens are 1-indexed in this list following UD convention.
SENTENCES: list[tuple[str, list[tuple[str, str]], list[tuple[int, int, str]]]] = [
    (
        "The horse raced past the barn fell .",
        [("The", "DET"), ("horse", "NOUN"), ("raced", "VERB"), ("past", "ADP"),
         ("the", "DET"), ("barn", "NOUN"), ("fell", "VERB"), (".", "PUNCT")],
        [(1, 2, "det"), (2, 7, "nsubj"), (3, 2, "acl"), (4, 6, "case"),
         (5, 6, "det"), (6, 3, "obl"), (7, 0, "root"), (8, 7, "punct")],
    ),
    (
        "While Anna dressed the baby cried .",
        [("While", "SCONJ"), ("Anna", "PROPN"), ("dressed", "VERB"), ("the", "DET"),
         ("baby", "NOUN"), ("cried", "VERB"), (".", "PUNCT")],
        [(1, 3, "mark"), (2, 3, "nsubj"), (3, 6, "advcl"), (4, 5, "det"),
         (5, 6, "nsubj"), (6, 0, "root"), (7, 6, "punct")],
    ),
    (
        "Colorless green ideas sleep furiously .",
        [("Colorless", "ADJ"), ("green", "ADJ"), ("ideas", "NOUN"),
         ("sleep", "VERB"), ("furiously", "ADV"), (".", "PUNCT")],
        [(1, 3, "amod"), (2, 3, "amod"), (3, 4, "nsubj"),
         (4, 0, "root"), (5, 4, "advmod"), (6, 4, "punct")],
    ),
    (
        "I saw the man with the telescope .",
        [("I", "PRON"), ("saw", "VERB"), ("the", "DET"), ("man", "NOUN"),
         ("with", "ADP"), ("the", "DET"), ("telescope", "NOUN"), (".", "PUNCT")],
        [(1, 2, "nsubj"), (2, 0, "root"), (3, 4, "det"), (4, 2, "obj"),
         (5, 7, "case"), (6, 7, "det"), (7, 4, "nmod"), (8, 2, "punct")],
    ),
    (
        "Time flies like an arrow .",
        [("Time", "NOUN"), ("flies", "VERB"), ("like", "ADP"), ("an", "DET"),
         ("arrow", "NOUN"), (".", "PUNCT")],
        [(1, 2, "nsubj"), (2, 0, "root"), (3, 5, "case"),
         (4, 5, "det"), (5, 2, "obl"), (6, 2, "punct")],
    ),
    (
        "Buffalo buffalo Buffalo buffalo buffalo buffalo Buffalo buffalo .",
        [("Buffalo", "PROPN"), ("buffalo", "NOUN"), ("Buffalo", "PROPN"),
         ("buffalo", "NOUN"), ("buffalo", "VERB"), ("buffalo", "VERB"),
         ("Buffalo", "PROPN"), ("buffalo", "NOUN"), (".", "PUNCT")],
        [(1, 2, "compound"), (2, 5, "nsubj"), (3, 4, "compound"),
         (4, 2, "acl:relcl"), (5, 4, "acl:relcl"), (6, 0, "root"),
         (7, 8, "compound"), (8, 6, "obj"), (9, 6, "punct")],
    ),
    (
        "Every farmer who owns a donkey beats it .",
        [("Every", "DET"), ("farmer", "NOUN"), ("who", "PRON"), ("owns", "VERB"),
         ("a", "DET"), ("donkey", "NOUN"), ("beats", "VERB"),
         ("it", "PRON"), (".", "PUNCT")],
        [(1, 2, "det"), (2, 7, "nsubj"), (3, 4, "nsubj"), (4, 2, "acl:relcl"),
         (5, 6, "det"), (6, 4, "obj"), (7, 0, "root"),
         (8, 7, "obj"), (9, 7, "punct")],
    ),
    (
        "John seems to like Mary .",
        [("John", "PROPN"), ("seems", "VERB"), ("to", "PART"),
         ("like", "VERB"), ("Mary", "PROPN"), (".", "PUNCT")],
        [(1, 2, "nsubj"), (2, 0, "root"), (3, 4, "mark"),
         (4, 2, "xcomp"), (5, 4, "obj"), (6, 2, "punct")],
    ),
    (
        "It is easy to please John .",
        [("It", "PRON"), ("is", "AUX"), ("easy", "ADJ"), ("to", "PART"),
         ("please", "VERB"), ("John", "PROPN"), (".", "PUNCT")],
        [(1, 3, "nsubj"), (2, 3, "cop"), (3, 0, "root"),
         (4, 5, "mark"), (5, 3, "csubj"), (6, 5, "obj"), (7, 3, "punct")],
    ),
    (
        "The book that John read was interesting .",
        [("The", "DET"), ("book", "NOUN"), ("that", "PRON"), ("John", "PROPN"),
         ("read", "VERB"), ("was", "AUX"), ("interesting", "ADJ"), (".", "PUNCT")],
        [(1, 2, "det"), (2, 7, "nsubj"), (3, 5, "obj"),
         (4, 5, "nsubj"), (5, 2, "acl:relcl"),
         (6, 7, "cop"), (7, 0, "root"), (8, 7, "punct")],
    ),
]

# 40 more shorter sentences modelled after EWT weblog/social genre.
EXTRA = [
    "We had a great time at the conference yesterday .",
    "Please send me the file when you have a moment .",
    "Thanks for sharing the article ; I found it very helpful .",
    "The new restaurant downtown serves excellent pasta .",
    "She finished her PhD in computational linguistics last month .",
    "Can you recommend a good textbook on syntax ?",
    "The package arrived earlier than expected .",
    "It seems like the meeting was rescheduled to Thursday .",
    "His comments at the panel raised some interesting questions .",
    "The data clearly support our original hypothesis .",
    "I' ll be out of town from Friday through Sunday .",
    "We need to clarify the requirements before continuing .",
    "The team has been working on this feature for weeks .",
    "Did you watch the lecture recording from last week ?",
    "The proposal addresses several long-standing concerns .",
    "Most participants reported high satisfaction with the experiment .",
    "She presented her findings at the workshop on Tuesday .",
    "The agreement scores were higher than the baseline by a wide margin .",
    "Several reviewers requested additional clarifications .",
    "The corpus contains roughly two million tokens of news text .",
    "We collected ratings from 240 native English speakers .",
    "His paper proposes a novel decoding strategy for transformer models .",
    "Could you double-check the citation on page seven ?",
    "The annotation guidelines are available on the project website .",
    "This dataset has been used in dozens of subsequent studies .",
    "Their replication failed to confirm the original effect .",
    "We' re looking for reviewers familiar with formal semantics .",
    "The conference will take place online next March .",
    "It depends on whether the budget gets approved this quarter .",
    "She defended her thesis with distinction last week .",
    "The recording quality was unfortunately quite poor .",
    "Most of the disagreements concerned tokenisation choices .",
    "Your point about polysemy is well-taken .",
    "The argument hinges on a controversial assumption .",
    "Many of these constructions are absent from the training data .",
    "The third reviewer recommended major revisions .",
    "We reran the analysis with the updated annotations .",
    "Please cite the original paper as well .",
    "The talk lasted longer than scheduled but was excellent .",
    "Our results align with previous findings in the literature .",
]

# Generate naive UD-style annotations for the extras: every word
# becomes a NOUN, last token PUNCT, root is the verb position 2.
# These are illustrative defaults — the demo corpus is for showing
# the system end-to-end, not for training models.
def naive_annotate(text: str) -> tuple[list[tuple[str, str]], list[tuple[int, int, str]]]:
    toks = text.split()
    pos: list[tuple[str, str]] = []
    for i, t in enumerate(toks):
        if t in (".", "!", "?", ",", ";", ":"):
            tag = "PUNCT"
        elif t in ("a", "an", "the"):
            tag = "DET"
        elif t.lower() in ("and", "or", "but"):
            tag = "CCONJ"
        elif t.lower() in ("if", "while", "because", "that", "whether"):
            tag = "SCONJ"
        elif t.lower() in ("i", "you", "he", "she", "it", "we", "they", "his", "her", "our", "their", "your", "this", "these", "that", "those"):
            tag = "PRON"
        elif t.lower() in ("is", "was", "are", "were", "have", "has", "had", "will", "would", "can", "could", "may", "might", "must", "should", "do", "does", "did", "be", "been", "being", "ll", "re", "ve"):
            tag = "AUX"
        elif t[0].isupper() and i > 0:
            tag = "PROPN"
        elif t.endswith("ly"):
            tag = "ADV"
        else:
            tag = "NOUN" if i % 3 != 1 else "VERB"
        pos.append((t, tag))
    deps: list[tuple[int, int, str]] = []
    root_idx = 2 if len(toks) >= 2 else 1
    for i, _ in enumerate(toks, start=1):
        if i == root_idx:
            deps.append((i, 0, "root"))
        elif (toks[i - 1] in (".", "!", "?")) and i == len(toks):
            deps.append((i, root_idx, "punct"))
        else:
            deps.append((i, root_idx, "dep"))
    return pos, deps


for text in EXTRA:
    pos, deps = naive_annotate(text)
    SENTENCES.append((text, pos, deps))

assert len(SENTENCES) == 50, f"expected 50 sentences, got {len(SENTENCES)}"


def at_uri(handle: str, collection: str, rkey: str) -> str:
    return f"at://{handle}/{collection}/{rkey}"


CORPUS_HANDLE = "ewt.eng.ud.corpus.layers.pub"
EXPR_HANDLE = "ewt.eng.ud.expression.layers.pub"
SEG_HANDLE = "ewt.eng.ud.segmentation.layers.pub"
ANN_HANDLE = "ewt.eng.ud.annotation.layers.pub"

UD_HANDLE = "ud.ontology.layers.pub"
UD_TYPEDEF = "pub.layers.ontology.typeDef"
ONTOLOGY_NS = "pub.layers.ontology.ontology"


def write_stream(path: pathlib.Path, docs: list[dict]) -> None:
    import yaml
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fp:
        for i, doc in enumerate(docs):
            if i > 0:
                fp.write("---\n")
            fp.write(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))


def main() -> int:
    # Corpus record + 50 memberships.
    corpus_uri = at_uri(CORPUS_HANDLE, "pub.layers.corpus.corpus", "ewt-demo-50")
    corpus_doc = {
        "collection": "pub.layers.corpus.corpus",
        "record": {
            "$type": "pub.layers.corpus.corpus",
            "name": "UD English Web Treebank — Layers demo (50 sentences)",
            "description": (
                "Curated 50-sentence demo corpus combining ten canonical "
                "linguistic-example sentences (garden paths, structural ambiguity, "
                "scope, presupposition) with forty short EWT-genre sentences. "
                "POS + dep annotations follow UD v2. Authored as the registry's "
                "getting-started corpus; users fork into their own PDS to start a project."
            ),
            "languages": [LANGUAGE],
            "license": "CC-BY-SA-4.0",
            "createdAt": CREATED_AT,
        },
        "changelog": {"summary": "Initial publish: UD-EWT 50-sentence demo corpus"},
    }
    membership_docs = []
    expression_docs = []
    segmentation_docs = []
    annotation_pos_docs = []
    annotation_dep_docs = []

    for idx, (text, pos, deps) in enumerate(SENTENCES):
        sid = f"s{idx + 1:02d}"
        expr_rkey = f"expr-{sid}"
        seg_rkey = f"seg-{sid}"
        pos_rkey = f"ann-pos-{sid}"
        dep_rkey = f"ann-dep-{sid}"

        # Expression.
        expression_docs.append({
            "collection": "pub.layers.expression.expression",
            "record": {
                "$type": "pub.layers.expression.expression",
                "id": sid,
                "kind": "sentence",
                "text": text,
                "languages": [LANGUAGE],
                "createdAt": CREATED_AT,
            },
        })

        # Segmentation: one tokenisation, byte-offset spans.
        tokens = []
        offset = 0
        for tok, _ in pos:
            tokens.append({
                "text": tok,
                "byteStart": offset,
                "byteEnd": offset + len(tok.encode("utf-8")),
            })
            offset += len(tok.encode("utf-8")) + 1  # +1 for space separator
        segmentation_docs.append({
            "collection": "pub.layers.segmentation.segmentation",
            "record": {
                "$type": "pub.layers.segmentation.segmentation",
                "expression": at_uri(EXPR_HANDLE, "pub.layers.expression.expression", expr_rkey),
                "tokenizations": [{
                    "tokenizer": "whitespace",
                    "tokens": tokens,
                }],
                "languages": [LANGUAGE],
                "createdAt": CREATED_AT,
            },
        })

        # POS layer — token-tag, anchored on tokenRefSequence.
        seg_uri = at_uri(SEG_HANDLE, "pub.layers.segmentation.segmentation", seg_rkey)
        annotations = []
        for token_idx, (_, tag) in enumerate(pos):
            tag_uri = at_uri(UD_HANDLE, UD_TYPEDEF, f"ud-pos-v2-{tag.lower()}")
            annotations.append({
                "anchor": {
                    "$type": "pub.layers.defs#tokenRef",
                    "segmentation": seg_uri,
                    "tokenization": 0,
                    "token": token_idx,
                },
                "tokenIndex": token_idx,
                "ontologyTypeRef": tag_uri,
                "label": tag,
            })
        annotation_pos_docs.append({
            "collection": "pub.layers.annotation.annotationLayer",
            "record": {
                "$type": "pub.layers.annotation.annotationLayer",
                "expression": at_uri(EXPR_HANDLE, "pub.layers.expression.expression", expr_rkey),
                "kind": "token-tag",
                "subkind": "pos",
                "formalism": "ud-pos-v2",
                "ontologyRef": at_uri(UD_HANDLE, ONTOLOGY_NS, "ud-pos-v2"),
                "annotations": annotations,
                "languages": [LANGUAGE],
                "createdAt": CREATED_AT,
            },
        })

        # Dep layer — relation, child→head edges with deprel labels.
        dep_anns = []
        for child, head, deprel in deps:
            child_idx = child - 1  # 0-indexed for tokenRef
            head_idx = head - 1 if head > 0 else None
            anchor = {
                "$type": "pub.layers.defs#tokenRefSequence",
                "segmentation": seg_uri,
                "tokenization": 0,
                "tokens": [child_idx] if head_idx is None else [child_idx, head_idx],
            }
            dep_anns.append({
                "anchor": anchor,
                "label": deprel,
                "headIndex": head_idx if head_idx is not None else -1,
                "targetIndex": child_idx,
                "ontologyTypeRef": at_uri(
                    UD_HANDLE,
                    UD_TYPEDEF,
                    f"ud-rel-v2-{deprel.replace(':', '-')}",
                ),
            })
        annotation_dep_docs.append({
            "collection": "pub.layers.annotation.annotationLayer",
            "record": {
                "$type": "pub.layers.annotation.annotationLayer",
                "expression": at_uri(EXPR_HANDLE, "pub.layers.expression.expression", expr_rkey),
                "kind": "relation",
                "subkind": "dependency",
                "formalism": "ud-rel-v2",
                "ontologyRef": at_uri(UD_HANDLE, ONTOLOGY_NS, "ud-rel-v2"),
                "annotations": dep_anns,
                "languages": [LANGUAGE],
                "createdAt": CREATED_AT,
            },
        })

        # Membership: corpus → expression.
        membership_docs.append({
            "collection": "pub.layers.corpus.membership",
            "record": {
                "$type": "pub.layers.corpus.membership",
                "corpus": corpus_uri,
                "expression": at_uri(EXPR_HANDLE, "pub.layers.expression.expression", expr_rkey),
                "createdAt": CREATED_AT,
            },
        })

    write_stream(ROOT / CORPUS_HANDLE / "corpus.yaml", [corpus_doc])
    write_stream(ROOT / CORPUS_HANDLE / "memberships.yaml", membership_docs)
    write_stream(ROOT / EXPR_HANDLE / "expressions.yaml", expression_docs)
    write_stream(ROOT / SEG_HANDLE / "segmentations.yaml", segmentation_docs)
    write_stream(ROOT / ANN_HANDLE / "pos-layers.yaml", annotation_pos_docs)
    write_stream(ROOT / ANN_HANDLE / "dep-layers.yaml", annotation_dep_docs)

    print(f"wrote demo corpus: 1 corpus + {len(SENTENCES)} memberships + {len(SENTENCES)} expressions + {len(SENTENCES)} segs + {len(SENTENCES)} POS layers + {len(SENTENCES)} dep layers")
    return 0


if __name__ == "__main__":
    sys.exit(main())
