"""PropBank adapter using NLTK's PropBank corpus reader."""

import logging

from sidecar.adapters.base import BaseAdapter
from sidecar.models.query import QueryFilters, QueryResult, ResourceEntry

logger = logging.getLogger(__name__)


class PropBankAdapter(BaseAdapter):
    """Queries PropBank predicates and rolesets via NLTK."""

    _initialized: bool = False
    _available: bool = False

    @property
    def source_name(self) -> str:
        return "propbank"

    async def initialize(self) -> None:
        """Check if NLTK PropBank corpus is available."""
        try:
            import nltk

            nltk.data.find("corpora/propbank")
            self._available = True
        except LookupError:
            logger.warning("PropBank corpus not available; downloading")
            try:
                import nltk

                nltk.download("propbank", quiet=True)
                self._available = True
            except Exception:
                logger.warning("Failed to download PropBank; adapter returns empty results")
                self._available = False

        self._initialized = True

    async def query(self, filters: QueryFilters) -> QueryResult:
        """Search PropBank rolesets by lemma."""
        if not self._initialized or not self._available:
            return QueryResult(entries=[], total=0, has_more=False)

        from nltk.corpus import propbank as pb

        search = (filters.search or "").strip()
        if not search:
            return QueryResult(entries=[], total=0, has_more=False)

        entries: list[ResourceEntry] = []

        try:
            # PropBank rolesets are accessed via verb frames
            for roleset in pb.rolesets(baseform=search):
                roleset_id = roleset.attrib.get("id", "")
                name = roleset.attrib.get("name", "")

                # Extract argument roles
                roles: list[str] = []
                for role in roleset.findall("roles/role"):
                    arg_n = role.attrib.get("n", "")
                    arg_desc = role.attrib.get("descr", "")
                    roles.append(f"ARG{arg_n}: {arg_desc}")

                entries.append(
                    ResourceEntry(
                        form=search,
                        lemma=search,
                        pos="VERB",
                        features={
                            "roleset_id": roleset_id,
                            "description": name,
                            "roles": roles,
                        },
                        knowledge_ref=f"propbank:{roleset_id}",
                        source="propbank",
                    )
                )
        except Exception:
            logger.exception("Error querying PropBank for '%s'", search)
            return QueryResult(entries=[], total=0, has_more=False)

        total = len(entries)
        page = entries[filters.offset : filters.offset + filters.limit]
        return QueryResult(
            entries=page,
            total=total,
            has_more=filters.offset + filters.limit < total,
        )
