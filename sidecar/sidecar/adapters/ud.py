"""
Universal Dependencies adapter using the conllu library.

Parses CoNLL-U treebank files to provide real token-level entries with
form, lemma, UPOS, morphological features, and dependency relation data.
Downloads UD treebanks from GitHub releases on first use and caches
parsed data in memory.
"""

from __future__ import annotations

import io
import logging
import zipfile
from pathlib import Path
from typing import TYPE_CHECKING

from sidecar.adapters.base import BaseAdapter
from sidecar.models.query import QueryFilters, QueryResult, ResourceEntry

if TYPE_CHECKING:
    from conllu import TokenList

logger = logging.getLogger(__name__)

# Default treebanks per language code, mapping to GitHub release asset names.
# Each value is (repo_name, zip_directory_name).
_DEFAULT_TREEBANKS: dict[str, tuple[str, str]] = {
    "en": ("UD_English-EWT", "UD_English-EWT"),
    "de": ("UD_German-GSD", "UD_German-GSD"),
    "fr": ("UD_French-GSD", "UD_French-GSD"),
    "es": ("UD_Spanish-GSD", "UD_Spanish-GSD"),
    "zh": ("UD_Chinese-GSD", "UD_Chinese-GSD"),
    "ja": ("UD_Japanese-GUD", "UD_Japanese-GUD"),
    "ru": ("UD_Russian-GSD", "UD_Russian-GSD"),
    "ar": ("UD_Arabic-PADT", "UD_Arabic-PADT"),
    "hi": ("UD_Hindi-HDTB", "UD_Hindi-HDTB"),
    "ko": ("UD_Korean-GSD", "UD_Korean-GSD"),
}

_UD_RELEASE_VERSION = "2.14"
_UD_RELEASE_TAG = f"v{_UD_RELEASE_VERSION}"

_CACHE_DIR = Path.home() / ".cache" / "layers-sidecar" / "ud"


def _download_url(repo_name: str) -> str:
    """
    Build the GitHub release download URL for a UD treebank.

    Parameters
    ----------
    repo_name : str
        Repository name (e.g., ``"UD_English-EWT"``).

    Returns
    -------
    str
        Full URL to the zip archive for the configured release tag.
    """
    return (
        f"https://github.com/UniversalDependencies/{repo_name}"
        f"/archive/refs/tags/{_UD_RELEASE_TAG}.zip"
    )


def _find_conllu_files(directory: Path) -> list[Path]:
    """
    Find all ``.conllu`` files under a directory.

    Parameters
    ----------
    directory : Path
        Root directory to search recursively.

    Returns
    -------
    list[Path]
        Sorted list of paths to ``.conllu`` files.
    """
    return sorted(directory.rglob("*.conllu"))


def _parse_feats(feats: str | dict | None) -> dict[str, str]:
    """
    Parse a UD feats string or dict into a flat dict.

    Parameters
    ----------
    feats : str, dict, or None
        Morphological features in UD pipe-delimited format
        (e.g., ``"Number=Sing|Person=3"``) or already parsed dict.

    Returns
    -------
    dict[str, str]
        Parsed feature key-value pairs. Empty dict if feats is None.
    """
    if feats is None:
        return {}
    if isinstance(feats, dict):
        return {k: str(v) for k, v in feats.items()}
    result: dict[str, str] = {}
    for pair in str(feats).split("|"):
        if "=" in pair:
            key, val = pair.split("=", 1)
            result[key] = val
    return result


class UDAdapter(BaseAdapter):
    """
    Queries Universal Dependencies treebanks parsed from CoNLL-U files.

    On initialization, downloads a default treebank (UD_English-EWT) if
    not already cached. Treebanks for other languages are loaded lazily
    on first query with that language filter. Parsed token data is kept
    in memory for fast querying.

    Attributes
    ----------
    _initialized : bool
        Whether the adapter has completed initialization.
    _available : bool
        Whether the conllu library is importable.
    _token_cache : dict[str, list[ResourceEntry]]
        In-memory cache mapping language code to parsed token entries.
    """

    _initialized: bool = False
    _available: bool = False
    # language code -> list of parsed token entries
    _token_cache: dict[str, list[ResourceEntry]]

    def __init__(self) -> None:
        self._token_cache = {}

    @property
    def source_name(self) -> str:
        """
        Return the source name for this adapter.

        Returns
        -------
        str
            Always ``"ud"``.
        """
        return "ud"

    async def initialize(self) -> None:
        """
        Download the default English treebank if not cached.

        Checks whether the ``conllu`` library is installed. If not,
        the adapter marks itself as unavailable and returns empty results
        for all queries.
        """
        try:
            import conllu  # noqa: F401

            self._available = True
        except ImportError:
            logger.warning(
                "conllu library not installed; UD adapter will return empty results"
            )
            self._available = False
            self._initialized = True
            return

        # Pre-load the default English treebank
        try:
            self._ensure_treebank("en")
        except Exception:
            logger.warning(
                "Failed to load default UD treebank (English-EWT); "
                "adapter will attempt lazy loading on queries"
            )

        self._initialized = True

    def _ensure_treebank(self, lang: str) -> None:
        """
        Ensure a treebank for the given language is downloaded and parsed.

        Parameters
        ----------
        lang : str
            Two-letter language code (e.g., ``"en"``, ``"de"``).

        Raises
        ------
        Exception
            If the treebank download or extraction fails.
        """
        if lang in self._token_cache:
            return

        if lang not in _DEFAULT_TREEBANKS:
            logger.debug("No default treebank configured for language: %s", lang)
            self._token_cache[lang] = []
            return

        repo_name, dir_name = _DEFAULT_TREEBANKS[lang]
        treebank_dir = _CACHE_DIR / dir_name

        if not _find_conllu_files(treebank_dir):
            self._download_treebank(repo_name, dir_name)

        conllu_files = _find_conllu_files(treebank_dir)
        if not conllu_files:
            # Also check one level deeper (zip extracts to repo-tag/ subdirectory)
            for subdir in _CACHE_DIR.iterdir():
                if subdir.is_dir() and dir_name in subdir.name:
                    conllu_files = _find_conllu_files(subdir)
                    if conllu_files:
                        break

        if not conllu_files:
            logger.warning("No .conllu files found for %s after download", lang)
            self._token_cache[lang] = []
            return

        entries = self._parse_conllu_files(conllu_files, lang)
        self._token_cache[lang] = entries
        logger.info(
            "Loaded %d UD entries for language %s from %d files",
            len(entries),
            lang,
            len(conllu_files),
        )

    def _download_treebank(self, repo_name: str, dir_name: str) -> None:
        """
        Download and extract a UD treebank zip from GitHub.

        Parameters
        ----------
        repo_name : str
            GitHub repository name (e.g., ``"UD_English-EWT"``).
        dir_name : str
            Target directory name within the cache.

        Raises
        ------
        Exception
            If the download or extraction fails.
        """
        import urllib.request

        url = _download_url(repo_name)
        logger.info("Downloading UD treebank from %s", url)

        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        target_dir = _CACHE_DIR / dir_name

        try:
            with urllib.request.urlopen(url, timeout=120) as response:  # noqa: S310
                data = response.read()

            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                # Extract all files, flattening the top-level directory
                for member in zf.namelist():
                    # Typical structure: repo_name-v2.14/file.conllu
                    parts = member.split("/", 1)
                    if len(parts) < 2 or not parts[1]:
                        continue
                    relative = parts[1]
                    dest = target_dir / relative
                    if member.endswith("/"):
                        dest.mkdir(parents=True, exist_ok=True)
                    else:
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(zf.read(member))

            logger.info("Extracted UD treebank to %s", target_dir)
        except Exception:
            logger.exception("Failed to download UD treebank: %s", repo_name)
            raise

    def _parse_conllu_files(
        self, files: list[Path], lang: str
    ) -> list[ResourceEntry]:
        """
        Parse CoNLL-U files into ResourceEntry objects.

        Deduplicates entries by (form, lemma, upos, deprel) tuple.

        Parameters
        ----------
        files : list[Path]
            Paths to ``.conllu`` files to parse.
        lang : str
            Language code used in knowledge_ref construction.

        Returns
        -------
        list[ResourceEntry]
            Deduplicated token entries with morphological features.
        """
        import conllu

        entries: list[ResourceEntry] = []
        seen: set[tuple[str, str, str | None, str | None]] = set()

        for filepath in files:
            try:
                text = filepath.read_text(encoding="utf-8")
                sentences: list[TokenList] = conllu.parse(text)
            except Exception:
                logger.warning("Failed to parse CoNLL-U file: %s", filepath)
                continue

            for sentence in sentences:
                for token in sentence:
                    # Skip multiword tokens and empty nodes
                    token_id = token.get("id")
                    if isinstance(token_id, tuple):
                        continue

                    form = token.get("form", "")
                    lemma = token.get("lemma", "")
                    upos = token.get("upos")
                    deprel = token.get("deprel")
                    feats = token.get("feats")

                    if not form or not lemma:
                        continue

                    # Deduplicate by (form, lemma, upos, deprel)
                    dedup_key = (form.lower(), lemma.lower(), upos, deprel)
                    if dedup_key in seen:
                        continue
                    seen.add(dedup_key)

                    features: dict[str, str | list[str]] = {}
                    parsed_feats = _parse_feats(feats)
                    if parsed_feats:
                        features.update(parsed_feats)
                    if deprel:
                        features["deprel"] = deprel

                    knowledge_ref = f"ud:{lang}"
                    if upos:
                        knowledge_ref += f":{upos}"
                    if lemma:
                        knowledge_ref += f":{lemma}"

                    entries.append(
                        ResourceEntry(
                            form=form,
                            lemma=lemma,
                            pos=upos,
                            features=features,
                            knowledge_ref=knowledge_ref,
                            source="ud",
                        )
                    )

        return entries

    async def query(self, filters: QueryFilters) -> QueryResult:
        """
        Query UD treebank data by lemma, POS, language, or deprel.

        Parameters
        ----------
        filters : QueryFilters
            Query parameters including ``search`` (matches lemma or form),
            ``language`` (two-letter code, defaults to ``"en"``),
            ``pos`` (UPOS tag filter), ``class_`` (dependency relation
            filter), ``limit``, and ``offset``.

        Returns
        -------
        QueryResult
            Paginated token entries from the requested treebank.
        """
        if not self._initialized or not self._available:
            return QueryResult(entries=[], total=0, has_more=False)

        lang = (filters.language or "en").strip().lower()

        # Lazy-load treebank for the requested language
        try:
            self._ensure_treebank(lang)
        except Exception:
            logger.exception("Failed to load UD treebank for language: %s", lang)
            return QueryResult(entries=[], total=0, has_more=False)

        all_entries = self._token_cache.get(lang, [])
        if not all_entries:
            return QueryResult(entries=[], total=0, has_more=False)

        # Apply filters
        matched = all_entries
        search = (filters.search or "").strip().lower()
        pos_filter = (filters.pos or "").strip().upper()
        class_filter = (filters.class_ or "").strip().lower()  # used for deprel

        if search:
            matched = [
                e
                for e in matched
                if search in e.lemma.lower() or search in e.form.lower()
            ]

        if pos_filter:
            matched = [e for e in matched if (e.pos or "").upper() == pos_filter]

        if class_filter:
            matched = [
                e
                for e in matched
                if e.features.get("deprel", "") == class_filter
                or class_filter in str(e.features.get("deprel", "")).lower()
            ]

        total = len(matched)
        page = matched[filters.offset : filters.offset + filters.limit]
        return QueryResult(
            entries=page,
            total=total,
            has_more=filters.offset + filters.limit < total,
        )
