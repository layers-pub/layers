"""Base adapter interface for linguistic resource queries."""

from abc import ABC, abstractmethod

from sidecar.models.query import QueryFilters, QueryResult


class BaseAdapter(ABC):
    """Abstract base class for all linguistic resource adapters.

    Each adapter wraps an external data source (NLTK corpus, downloaded
    TSV files, etc.) and provides a uniform query interface returning
    paginated ResourceEntry results.
    """

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Unique identifier for this resource source (e.g., 'wordnet', 'verbnet')."""

    async def initialize(self) -> None:
        """Initialize the adapter (download data, build indexes, etc.).

        Override in subclasses that need setup. Default is a no-op.
        """

    @abstractmethod
    async def query(self, filters: QueryFilters) -> QueryResult:
        """Query the resource with the given filters and return paginated results."""
