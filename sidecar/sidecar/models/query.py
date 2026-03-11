"""
Request/response models for resource queries.
"""

from pydantic import BaseModel, Field


class QueryFilters(BaseModel):
    """
    Filters for querying a linguistic resource adapter.

    Attributes
    ----------
    pos : str or None
        Part-of-speech filter (e.g., ``"NOUN"``, ``"VERB"``).
    class_ : str or None
        Resource class filter (e.g., VerbNet class ID).
    language : str or None
        ISO 639 language code.
    search : str or None
        Free-text search query.
    limit : int
        Maximum entries to return, by default 50.
    offset : int
        Pagination offset, by default 0.
    """

    pos: str | None = Field(default=None, description="Part-of-speech filter (e.g., 'NOUN', 'VERB')")
    class_: str | None = Field(
        default=None,
        alias="class",
        description="Resource class filter (e.g., VerbNet class ID)",
    )
    language: str | None = Field(default=None, description="ISO 639 language code")
    search: str | None = Field(default=None, description="Free-text search query")
    limit: int = Field(default=50, ge=1, le=500, description="Maximum entries to return")
    offset: int = Field(default=0, ge=0, description="Pagination offset")

    model_config = {"populate_by_name": True}


class ResourceEntry(BaseModel):
    """
    A single entry returned from a linguistic resource query.

    Attributes
    ----------
    form : str
        Surface form of the entry.
    lemma : str
        Lemma (base form).
    pos : str or None
        Part of speech.
    features : dict[str, str | list[str]]
        Resource-specific features (definition, roles, frame, etc.).
    knowledge_ref : str or None
        External knowledge base reference (e.g., WordNet synset ID).
    source : str
        Resource source identifier.
    """

    form: str = Field(description="Surface form of the entry")
    lemma: str = Field(description="Lemma (base form)")
    pos: str | None = Field(default=None, description="Part of speech")
    features: dict[str, str | list[str]] = Field(
        default_factory=dict,
        description="Resource-specific features (definition, roles, frame, etc.)",
    )
    knowledge_ref: str | None = Field(
        default=None,
        description="External knowledge base reference (e.g., WordNet synset ID)",
    )
    source: str = Field(description="Resource source identifier")


class QueryResult(BaseModel):
    """
    Paginated response from a resource query.

    Attributes
    ----------
    entries : list[ResourceEntry]
        Resource entries for the current page.
    total : int
        Total entries matching the query.
    has_more : bool
        Whether more entries exist beyond this page.
    """

    entries: list[ResourceEntry] = Field(default_factory=list)
    total: int = Field(default=0, description="Total entries matching the query")
    has_more: bool = Field(default=False, description="Whether more entries exist beyond this page")
