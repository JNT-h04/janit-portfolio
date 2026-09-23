"""Entry point. Run from the backend folder with:

    uvicorn app.main:app --reload

then open http://127.0.0.1:8000/docs to see and try every endpoint.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.cortex import model as cortex_model
from app.fracture import model as fracture_model
from app.routers import cortex, echo, fracture, health, lexicon, profile, terminal


# "lifespan" runs code when the server starts (before `yield`) and when it
# stops (after). We use it to start loading the ML models in the background.
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    if settings.load_models:
        fracture_model.slot.start()
        if settings.cortex_enabled:
            cortex_model.slot.start()
    yield


app = FastAPI(title=settings.app_name, version=settings.version, lifespan=lifespan)

# CORS: browsers block a page on one origin from reading responses from
# another origin unless the server allows it. This allows our frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Every router is mounted under /api, so /health becomes /api/health.
app.include_router(health.router, prefix="/api")
app.include_router(profile.router,prefix="/api")
app.include_router(terminal.router, prefix="/api")
app.include_router(lexicon.router, prefix="/api")
app.include_router(fracture.router, prefix="/api")
app.include_router(cortex.router, prefix="/api")
app.include_router(echo.router, prefix="/api")
