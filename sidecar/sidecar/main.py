"""FastAPI application for the Layers design sidecar."""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sidecar.config import settings
from sidecar.routers import filling, preview, resources


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize adapters on startup and clean up on shutdown."""
    from sidecar.adapters.wordnet import WordNetAdapter
    from sidecar.adapters.verbnet import VerbNetAdapter
    from sidecar.adapters.propbank import PropBankAdapter
    from sidecar.adapters.framenet import FrameNetAdapter
    from sidecar.adapters.unimorph import UniMorphAdapter
    from sidecar.adapters.ud import UDAdapter

    adapters = [
        WordNetAdapter(),
        VerbNetAdapter(),
        PropBankAdapter(),
        FrameNetAdapter(),
        UniMorphAdapter(),
        UDAdapter(),
    ]
    for adapter in adapters:
        await adapter.initialize()

    # Store adapters in app state for router access
    app.state.adapters = {a.source_name: a for a in adapters}

    yield


app = FastAPI(
    title="Layers Design Sidecar",
    description="Resource queries, constraint satisfaction, MLM filling, and jsPsych preview",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resources.router)
app.include_router(filling.router)
app.include_router(preview.router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
