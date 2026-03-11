"""WordNet adapter using NLTK's WordNet interface."""

import logging

from sidecar.adapters.base import BaseAdapter
from sidecar.models.query import QueryFilters, QueryResult, ResourceEntry

logger = logging.getLogger(__name__)

# Mapping from Universal POS tags to WordNet POS constants
_POS_MAP: dict[str, str] = {
    "NOUN": "n",
    "VERB": "v",
    "ADJ": "a",
    "ADV": "r",
    "n": "n",
    "v": "v",
    "a": "a",
    "r": "r",
    "s": "s",
}


class WordNetAdapter(BaseAdapter):
    """Queries WordNet synsets via NLTK, with Open Multilingual Wordnet support."""

    _initialized: bool = False

    @property
    def source_name(self) -> str:
        return "wordnet"

    async def initialize(self) -> None:
        """Download wordnet and omw-1.4 corpora if not already present."""
        import nltk

        for corpus in ("wordnet", "omw-1.4"):
            try:
                nltk.data.find(f"corpora/{corpus}")
            except LookupError:
                logger.info("Downloading NLTK corpus: %s", corpus)
                nltk.download(corpus, quiet=True)

        self._initialized = True

    async def query(self, filters: QueryFilters) -> QueryResult:
        """Search WordNet synsets by lemma, optionally filtered by POS and language."""
        if not self._initialized:
            return QueryResult(entries=[], total=0, has_more=False)

        from nltk.corpus import wordnet as wn

        search = (filters.search or "").strip()
        if not search:
            return QueryResult(entries=[], total=0, has_more=False)

        wn_pos = _POS_MAP.get(filters.pos.upper() if filters.pos else "", None)
        lang = filters.language or "eng"

        # Query synsets matching the search term
        synsets = wn.synsets(search, pos=wn_pos, lang=lang)

        entries: list[ResourceEntry] = []
        for ss in synsets:
            lemma_names = ss.lemma_names(lang)
            definition = ss.definition()
            for lemma_name in lemma_names:
                form = lemma_name.replace("_", " ")
                entries.append(
                    ResourceEntry(
                        form=form,
                        lemma=form,
                        pos=ss.pos(),
                        features={
                            "definition": definition or "",
                            "synset_id": ss.name(),
                            "lexname": ss.lexname() if hasattr(ss, "lexname") else "",
                        },
                        knowledge_ref=f"wn:{ss.name()}",
                        source="wordnet",
                    )
                )

        # Deduplicate by (form, synset_id)
        seen: set[tuple[str, str]] = set()
        unique: list[ResourceEntry] = []
        for entry in entries:
            key = (entry.form, entry.features.get("synset_id", ""))
            if key not in seen:
                seen.add(key)
                unique.append(entry)

        total = len(unique)
        page = unique[filters.offset : filters.offset + filters.limit]
        return QueryResult(
            entries=page,
            total=total,
            has_more=filters.offset + filters.limit < total,
        )
