"""
UniMorph adapter that downloads and queries TSV paradigm files.
"""

import logging
from pathlib import Path

from sidecar.adapters.base import BaseAdapter
from sidecar.config import settings
from sidecar.models.query import QueryFilters, QueryResult, ResourceEntry

logger = logging.getLogger(__name__)

# A curated set of commonly-used UniMorph languages with their ISO 639 codes.
# The full UniMorph collection covers 100+ languages; only these are pre-indexed.
_SUPPORTED_LANGUAGES = {
    "eng": "English",
    "deu": "German",
    "fra": "French",
    "spa": "Spanish",
    "ita": "Italian",
    "por": "Portuguese",
    "tur": "Turkish",
    "fin": "Finnish",
    "hun": "Hungarian",
    "rus": "Russian",
    "ara": "Arabic",
    "heb": "Hebrew",
    "hin": "Hindi",
    "jpn": "Japanese",
    "kor": "Korean",
    "zho": "Chinese",
}

# Base URL for UniMorph GitHub releases
_UNIMORPH_BASE_URL = "https://raw.githubusercontent.com/unimorph"


class UniMorphAdapter(BaseAdapter):
    """
    Queries UniMorph morphological paradigms from downloaded TSV files.

    UniMorph files are three-column TSV: lemma, form, features.
    Features use UniMorph schema tags separated by semicolons.

    Attributes
    ----------
    _initialized : bool
        Whether the adapter has completed initialization.
    _cache_dir : Path
        Directory for caching downloaded TSV files.
    _data : dict[str, list[tuple[str, str, str]]]
        In-memory index mapping language code to parsed rows
        (lemma, form, features_str).
    """

    _initialized: bool = False
    _cache_dir: Path = Path(settings.unimorph_cache_dir)
    # In-memory index: language -> list of (lemma, form, features_str)
    _data: dict[str, list[tuple[str, str, str]]]

    def __init__(self) -> None:
        self._data = {}

    @property
    def source_name(self) -> str:
        """
        Return the source name for this adapter.

        Returns
        -------
        str
            Always ``"unimorph"``.
        """
        return "unimorph"

    async def initialize(self) -> None:
        """
        Create the cache directory.

        Data is loaded lazily per language on first query.
        """
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._initialized = True

    def _load_language(self, lang: str) -> list[tuple[str, str, str]]:
        """
        Load a language's TSV file from the cache.

        Downloads on demand from UniMorph GitHub if not cached.

        Parameters
        ----------
        lang : str
            ISO 639-3 language code (e.g., ``"eng"``).

        Returns
        -------
        list[tuple[str, str, str]]
            Parsed rows as (lemma, form, features_str) tuples.
            Returns an empty list if the data is unavailable.
        """
        if lang in self._data:
            return self._data[lang]

        tsv_path = self._cache_dir / f"{lang}.tsv"

        if not tsv_path.exists():
            # Attempt to download
            try:
                import urllib.request

                url = f"{_UNIMORPH_BASE_URL}/{lang}/master/{lang}"
                logger.info("Downloading UniMorph data for %s from %s", lang, url)
                urllib.request.urlretrieve(url, tsv_path)
            except Exception:
                logger.warning("Could not download UniMorph data for %s", lang)
                self._data[lang] = []
                return []

        # Parse TSV
        rows: list[tuple[str, str, str]] = []
        try:
            with open(tsv_path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split("\t")
                    if len(parts) >= 3:
                        rows.append((parts[0], parts[1], parts[2]))
                    elif len(parts) == 2:
                        rows.append((parts[0], parts[1], ""))
        except Exception:
            logger.exception("Error parsing UniMorph TSV for %s", lang)
            rows = []

        self._data[lang] = rows
        return rows

    async def query(self, filters: QueryFilters) -> QueryResult:
        """
        Search UniMorph paradigms by lemma, form, or features.

        Parameters
        ----------
        filters : QueryFilters
            Query parameters including ``search`` (matches lemma or form),
            ``language`` (ISO 639-3 code, defaults to ``"eng"``),
            ``pos`` (UniMorph POS tag filter), ``limit``, and ``offset``.

        Returns
        -------
        QueryResult
            Paginated morphological paradigm entries.
        """
        if not self._initialized:
            return QueryResult(entries=[], total=0, has_more=False)

        lang = filters.language or "eng"
        search = (filters.search or "").strip().lower()
        pos_filter = (filters.pos or "").upper()

        rows = self._load_language(lang)
        if not rows:
            return QueryResult(entries=[], total=0, has_more=False)

        entries: list[ResourceEntry] = []
        for lemma, form, features_str in rows:
            # Filter by search term (matches lemma or form)
            if search and search not in lemma.lower() and search not in form.lower():
                continue

            # Parse features
            tags = [t.strip() for t in features_str.split(";") if t.strip()]

            # Filter by POS if specified (UniMorph tags include V, N, ADJ, etc.)
            if pos_filter and not any(t.upper() == pos_filter for t in tags):
                continue

            # Determine POS from tags
            pos = None
            for tag in tags:
                if tag.upper() in {"V", "N", "ADJ", "ADV", "PROPN"}:
                    pos = tag.upper()
                    break

            entries.append(
                ResourceEntry(
                    form=form,
                    lemma=lemma,
                    pos=pos,
                    features={"unimorph_tags": tags},
                    knowledge_ref=None,
                    source="unimorph",
                )
            )

        total = len(entries)
        page = entries[filters.offset : filters.offset + filters.limit]
        return QueryResult(
            entries=page,
            total=total,
            has_more=filters.offset + filters.limit < total,
        )
