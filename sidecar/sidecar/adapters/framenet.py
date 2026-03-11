"""FrameNet adapter using NLTK's FrameNet corpus reader."""

import logging

from sidecar.adapters.base import BaseAdapter
from sidecar.models.query import QueryFilters, QueryResult, ResourceEntry

logger = logging.getLogger(__name__)


class FrameNetAdapter(BaseAdapter):
    """Queries FrameNet frames and lexical units via NLTK."""

    _initialized: bool = False
    _available: bool = False

    @property
    def source_name(self) -> str:
        return "framenet"

    async def initialize(self) -> None:
        """Check if NLTK FrameNet corpus is available."""
        try:
            import nltk

            nltk.data.find("corpora/framenet_v17")
            self._available = True
        except LookupError:
            logger.warning("FrameNet corpus not available; downloading")
            try:
                import nltk

                nltk.download("framenet_v17", quiet=True)
                self._available = True
            except Exception:
                logger.warning("Failed to download FrameNet; adapter returns empty results")
                self._available = False

        self._initialized = True

    async def query(self, filters: QueryFilters) -> QueryResult:
        """Search FrameNet frames by name or lexical unit."""
        if not self._initialized or not self._available:
            return QueryResult(entries=[], total=0, has_more=False)

        from nltk.corpus import framenet as fn

        search = (filters.search or "").strip()
        if not search:
            return QueryResult(entries=[], total=0, has_more=False)

        entries: list[ResourceEntry] = []

        try:
            search_lower = search.lower()

            # Search frames by name
            for frame in fn.frames():
                frame_name: str = frame.get("name", "")
                if search_lower not in frame_name.lower():
                    continue

                # Extract frame elements (roles)
                fe_names = [fe.get("name", "") for fe in frame.get("FE", {}).values()]
                definition = frame.get("definition", "")
                # Strip HTML-like tags from definition
                if "<" in definition:
                    import re

                    definition = re.sub(r"<[^>]+>", "", definition).strip()

                entries.append(
                    ResourceEntry(
                        form=frame_name,
                        lemma=frame_name,
                        pos=None,
                        features={
                            "frame_id": str(frame.get("ID", "")),
                            "definition": definition[:500] if definition else "",
                            "frame_elements": fe_names,
                        },
                        knowledge_ref=f"framenet:{frame.get('ID', '')}",
                        source="framenet",
                    )
                )

            # Also search lexical units
            for lu in fn.lus():
                lu_name: str = lu.get("name", "")
                if search_lower not in lu_name.lower():
                    continue

                frame_ref = lu.get("frame", {})
                frame_name_ref = frame_ref.get("name", "") if isinstance(frame_ref, dict) else str(frame_ref)

                # Extract POS from the LU name (format: "word.pos")
                pos = None
                if "." in lu_name:
                    pos = lu_name.rsplit(".", 1)[-1].upper()

                entries.append(
                    ResourceEntry(
                        form=lu_name.split(".")[0] if "." in lu_name else lu_name,
                        lemma=lu_name.split(".")[0] if "." in lu_name else lu_name,
                        pos=pos,
                        features={
                            "lu_id": str(lu.get("ID", "")),
                            "frame": frame_name_ref,
                            "lu_name": lu_name,
                        },
                        knowledge_ref=f"framenet:lu:{lu.get('ID', '')}",
                        source="framenet",
                    )
                )
        except Exception:
            logger.exception("Error querying FrameNet for '%s'", search)
            return QueryResult(entries=[], total=0, has_more=False)

        total = len(entries)
        page = entries[filters.offset : filters.offset + filters.limit]
        return QueryResult(
            entries=page,
            total=total,
            has_more=filters.offset + filters.limit < total,
        )
