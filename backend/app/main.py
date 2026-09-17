"""Entry point. Run from the backend folder with:

    uvicorn app.main:app --reload

then open http://127.0.0.1:8000/docs to see and try every endpoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health, profile

app = FastAPI(title=settings.app_name, version=settings.version)

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