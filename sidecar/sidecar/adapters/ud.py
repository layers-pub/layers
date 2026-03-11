"""Universal Dependencies adapter (stub with sample data).

A full implementation would use stanza or conllu parsers to query
UD treebanks. This stub returns sample entries to support frontend
development and testing.
"""

import logging

from sidecar.adapters.base import BaseAdapter
from sidecar.models.query import QueryFilters, QueryResult, ResourceEntry

logger = logging.getLogger(__name__)

# Sample UD entries for common grammatical relations
_SAMPLE_ENTRIES: list[ResourceEntry] = [
    ResourceEntry(
        form="nsubj",
        lemma="nsubj",
        pos=None,
        features={"description": "Nominal subject", "ud_version": "2"},
        knowledge_ref="ud:nsubj",
        source="ud",
    ),
    ResourceEntry(
        form="obj",
        lemma="obj",
        pos=None,
        features={"description": "Object", "ud_version": "2"},
        knowledge_ref="ud:obj",
        source="ud",
    ),
    ResourceEntry(
        form="iobj",
        lemma="iobj",
        pos=None,
        features={"description": "Indirect object", "ud_version": "2"},
        knowledge_ref="ud:iobj",
        source="ud",
    ),
    ResourceEntry(
        form="csubj",
        lemma="csubj",
        pos=None,
        features={"description": "Clausal subject", "ud_version": "2"},
        knowledge_ref="ud:csubj",
        source="ud",
    ),
    ResourceEntry(
        form="ccomp",
        lemma="ccomp",
        pos=None,
        features={"description": "Clausal complement", "ud_version": "2"},
        knowledge_ref="ud:ccomp",
        source="ud",
    ),
    ResourceEntry(
        form="xcomp",
        lemma="xcomp",
        pos=None,
        features={"description": "Open clausal complement", "ud_version": "2"},
        knowledge_ref="ud:xcomp",
        source="ud",
    ),
    ResourceEntry(
        form="obl",
        lemma="obl",
        pos=None,
        features={"description": "Oblique nominal", "ud_version": "2"},
        knowledge_ref="ud:obl",
        source="ud",
    ),
    ResourceEntry(
        form="vocative",
        lemma="vocative",
        pos=None,
        features={"description": "Vocative", "ud_version": "2"},
        knowledge_ref="ud:vocative",
        source="ud",
    ),
    ResourceEntry(
        form="expl",
        lemma="expl",
        pos=None,
        features={"description": "Expletive", "ud_version": "2"},
        knowledge_ref="ud:expl",
        source="ud",
    ),
    ResourceEntry(
        form="dislocated",
        lemma="dislocated",
        pos=None,
        features={"description": "Dislocated elements", "ud_version": "2"},
        knowledge_ref="ud:dislocated",
        source="ud",
    ),
    ResourceEntry(
        form="advcl",
        lemma="advcl",
        pos=None,
        features={"description": "Adverbial clause modifier", "ud_version": "2"},
        knowledge_ref="ud:advcl",
        source="ud",
    ),
    ResourceEntry(
        form="advmod",
        lemma="advmod",
        pos=None,
        features={"description": "Adverbial modifier", "ud_version": "2"},
        knowledge_ref="ud:advmod",
        source="ud",
    ),
    ResourceEntry(
        form="discourse",
        lemma="discourse",
        pos=None,
        features={"description": "Discourse element", "ud_version": "2"},
        knowledge_ref="ud:discourse",
        source="ud",
    ),
    ResourceEntry(
        form="aux",
        lemma="aux",
        pos=None,
        features={"description": "Auxiliary", "ud_version": "2"},
        knowledge_ref="ud:aux",
        source="ud",
    ),
    ResourceEntry(
        form="cop",
        lemma="cop",
        pos=None,
        features={"description": "Copula", "ud_version": "2"},
        knowledge_ref="ud:cop",
        source="ud",
    ),
    ResourceEntry(
        form="mark",
        lemma="mark",
        pos=None,
        features={"description": "Marker", "ud_version": "2"},
        knowledge_ref="ud:mark",
        source="ud",
    ),
    ResourceEntry(
        form="det",
        lemma="det",
        pos=None,
        features={"description": "Determiner", "ud_version": "2"},
        knowledge_ref="ud:det",
        source="ud",
    ),
    ResourceEntry(
        form="clf",
        lemma="clf",
        pos=None,
        features={"description": "Classifier", "ud_version": "2"},
        knowledge_ref="ud:clf",
        source="ud",
    ),
    ResourceEntry(
        form="case",
        lemma="case",
        pos=None,
        features={"description": "Case marking", "ud_version": "2"},
        knowledge_ref="ud:case",
        source="ud",
    ),
    ResourceEntry(
        form="nmod",
        lemma="nmod",
        pos=None,
        features={"description": "Nominal modifier", "ud_version": "2"},
        knowledge_ref="ud:nmod",
        source="ud",
    ),
    ResourceEntry(
        form="appos",
        lemma="appos",
        pos=None,
        features={"description": "Appositional modifier", "ud_version": "2"},
        knowledge_ref="ud:appos",
        source="ud",
    ),
    ResourceEntry(
        form="nummod",
        lemma="nummod",
        pos=None,
        features={"description": "Numeric modifier", "ud_version": "2"},
        knowledge_ref="ud:nummod",
        source="ud",
    ),
    ResourceEntry(
        form="acl",
        lemma="acl",
        pos=None,
        features={"description": "Adnominal clause", "ud_version": "2"},
        knowledge_ref="ud:acl",
        source="ud",
    ),
    ResourceEntry(
        form="amod",
        lemma="amod",
        pos=None,
        features={"description": "Adjectival modifier", "ud_version": "2"},
        knowledge_ref="ud:amod",
        source="ud",
    ),
    ResourceEntry(
        form="conj",
        lemma="conj",
        pos=None,
        features={"description": "Conjunct", "ud_version": "2"},
        knowledge_ref="ud:conj",
        source="ud",
    ),
    ResourceEntry(
        form="cc",
        lemma="cc",
        pos=None,
        features={"description": "Coordinating conjunction", "ud_version": "2"},
        knowledge_ref="ud:cc",
        source="ud",
    ),
    ResourceEntry(
        form="fixed",
        lemma="fixed",
        pos=None,
        features={"description": "Fixed multiword expression", "ud_version": "2"},
        knowledge_ref="ud:fixed",
        source="ud",
    ),
    ResourceEntry(
        form="flat",
        lemma="flat",
        pos=None,
        features={"description": "Flat multiword expression", "ud_version": "2"},
        knowledge_ref="ud:flat",
        source="ud",
    ),
    ResourceEntry(
        form="compound",
        lemma="compound",
        pos=None,
        features={"description": "Compound", "ud_version": "2"},
        knowledge_ref="ud:compound",
        source="ud",
    ),
    ResourceEntry(
        form="list",
        lemma="list",
        pos=None,
        features={"description": "List", "ud_version": "2"},
        knowledge_ref="ud:list",
        source="ud",
    ),
    ResourceEntry(
        form="parataxis",
        lemma="parataxis",
        pos=None,
        features={"description": "Parataxis", "ud_version": "2"},
        knowledge_ref="ud:parataxis",
        source="ud",
    ),
    ResourceEntry(
        form="orphan",
        lemma="orphan",
        pos=None,
        features={"description": "Orphan", "ud_version": "2"},
        knowledge_ref="ud:orphan",
        source="ud",
    ),
    ResourceEntry(
        form="goeswith",
        lemma="goeswith",
        pos=None,
        features={"description": "Goes with", "ud_version": "2"},
        knowledge_ref="ud:goeswith",
        source="ud",
    ),
    ResourceEntry(
        form="reparandum",
        lemma="reparandum",
        pos=None,
        features={"description": "Overridden disfluency", "ud_version": "2"},
        knowledge_ref="ud:reparandum",
        source="ud",
    ),
    ResourceEntry(
        form="punct",
        lemma="punct",
        pos=None,
        features={"description": "Punctuation", "ud_version": "2"},
        knowledge_ref="ud:punct",
        source="ud",
    ),
    ResourceEntry(
        form="root",
        lemma="root",
        pos=None,
        features={"description": "Root", "ud_version": "2"},
        knowledge_ref="ud:root",
        source="ud",
    ),
    ResourceEntry(
        form="dep",
        lemma="dep",
        pos=None,
        features={"description": "Unspecified dependency", "ud_version": "2"},
        knowledge_ref="ud:dep",
        source="ud",
    ),
]


class UDAdapter(BaseAdapter):
    """Stub adapter for Universal Dependencies relation types.

    Returns the standard UD v2 dependency relation inventory. A full
    implementation would parse CoNLL-U treebanks via stanza or the
    conllu library.
    """

    @property
    def source_name(self) -> str:
        return "ud"

    async def query(self, filters: QueryFilters) -> QueryResult:
        """Filter UD relation types by search term."""
        search = (filters.search or "").strip().lower()

        if search:
            matched = [
                e
                for e in _SAMPLE_ENTRIES
                if search in e.form.lower()
                or search in e.features.get("description", "").lower()  # type: ignore[union-attr]
            ]
        else:
            matched = list(_SAMPLE_ENTRIES)

        total = len(matched)
        page = matched[filters.offset : filters.offset + filters.limit]
        return QueryResult(
            entries=page,
            total=total,
            has_more=filters.offset + filters.limit < total,
        )
