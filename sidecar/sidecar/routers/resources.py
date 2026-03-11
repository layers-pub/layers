"""
Router for external linguistic resource queries.
"""

from fastapi import APIRouter, HTTPException, Query, Request

from sidecar.models.query import QueryFilters, QueryResult

router = APIRouter(prefix="/resources", tags=["resources"])

VALID_SOURCES = {"verbnet", "unimorph", "propbank", "framenet", "wordnet", "ud"}


@router.get("/{source}", response_model=QueryResult)
async def query_resources(
    request: Request,
    source: str,
    pos: str | None = Query(default=None, description="Part-of-speech filter"),
    class_: str | None = Query(default=None, alias="class", description="Resource class filter"),
    language: str | None = Query(default=None, description="ISO 639 language code"),
    search: str | None = Query(default=None, description="Free-text search"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> QueryResult:
    """
    Query an external linguistic resource by source name.

    Supported sources: verbnet, unimorph, propbank, framenet, wordnet, ud.

    Parameters
    ----------
    request : Request
        The incoming FastAPI request (provides access to app state).
    source : str
        Resource source name (case-insensitive).
    pos : str or None, optional
        Part-of-speech filter, by default None.
    class_ : str or None, optional
        Resource class filter (e.g., VerbNet class ID), by default None.
    language : str or None, optional
        ISO 639 language code, by default None.
    search : str or None, optional
        Free-text search query, by default None.
    limit : int, optional
        Maximum entries to return, by default 50.
    offset : int, optional
        Pagination offset, by default 0.

    Returns
    -------
    QueryResult
        Paginated resource entries matching the query.

    Raises
    ------
    HTTPException
        400 if the source is unknown, 503 if the adapter is unavailable.
    """
    source_lower = source.lower()
    if source_lower not in VALID_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown resource source: {source}. Valid sources: {', '.join(sorted(VALID_SOURCES))}",
        )

    adapters: dict = request.app.state.adapters
    adapter = adapters.get(source_lower)
    if adapter is None:
        raise HTTPException(
            status_code=503,
            detail=f"Adapter for {source} is not available",
        )

    filters = QueryFilters(
        pos=pos,
        class_=class_,
        language=language,
        search=search,
        limit=limit,
        offset=offset,
    )

    return await adapter.query(filters)
