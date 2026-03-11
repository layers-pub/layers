"""VerbNet adapter using NLTK's VerbNet corpus reader."""

import logging

from sidecar.adapters.base import BaseAdapter
from sidecar.models.query import QueryFilters, QueryResult, ResourceEntry

logger = logging.getLogger(__name__)


class VerbNetAdapter(BaseAdapter):
    """Queries VerbNet verb classes via NLTK."""

    _initialized: bool = False
    _available: bool = False

    @property
    def source_name(self) -> str:
        return "verbnet"

    async def initialize(self) -> None:
        """Check if NLTK VerbNet corpus is available."""
        try:
            import nltk

            nltk.data.find("corpora/verbnet")
            self._available = True
        except LookupError:
            logger.warning("VerbNet corpus not available; downloading")
            try:
                import nltk

                nltk.download("verbnet", quiet=True)
                self._available = True
            except Exception:
                logger.warning("Failed to download VerbNet corpus; adapter will return empty results")
                self._available = False

        self._initialized = True

    async def query(self, filters: QueryFilters) -> QueryResult:
        """Search VerbNet classes by lemma or class ID."""
        if not self._initialized or not self._available:
            return QueryResult(entries=[], total=0, has_more=False)

        from nltk.corpus import verbnet as vn

        search = (filters.search or "").strip()
        class_filter = filters.class_

        entries: list[ResourceEntry] = []

        try:
            if class_filter:
                # Query a specific class
                class_ids = [cid for cid in vn.classids() if class_filter.lower() in cid.lower()]
            elif search:
                # Find classes containing the search lemma
                class_ids = vn.classids(lemma=search)
            else:
                # Return all classes (paginated)
                class_ids = list(vn.classids())

            for cid in class_ids:
                try:
                    lemmas = vn.lemmas(cid)
                except Exception:
                    lemmas = []

                try:
                    # Extract thematic roles from the class
                    roles = [
                        role.attrib.get("type", "")
                        for role in vn.vnclass(cid).findall("THEMROLES/THEMROLE")
                    ]
                except Exception:
                    roles = []

                for lemma in lemmas:
                    entries.append(
                        ResourceEntry(
                            form=lemma,
                            lemma=lemma,
                            pos="VERB",
                            features={
                                "class_id": cid,
                                "thematic_roles": roles,
                            },
                            knowledge_ref=f"verbnet:{cid}",
                            source="verbnet",
                        )
                    )
        except Exception:
            logger.exception("Error querying VerbNet")
            return QueryResult(entries=[], total=0, has_more=False)

        total = len(entries)
        page = entries[filters.offset : filters.offset + filters.limit]
        return QueryResult(
            entries=page,
            total=total,
            has_more=filters.offset + filters.limit < total,
        )
