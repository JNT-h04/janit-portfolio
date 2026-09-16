"""A worked example of a route. Copy this pattern for Mission 1."""

import time

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings

# A router is a group of related endpoints. main.py mounts it under /api.
router = APIRouter(tags=["system"])

STARTED_AT = time.time()


# A response model does two jobs: it documents the JSON shape at /docs and
# it validates what we send back. A typo in a field name fails loudly.
class Health(BaseModel):
    status: str
    version: str
    uptime_seconds: int


@router.get("/health", response_model=Health)
def health() -> Health:
    return Health(
        status="online",
        version=settings.version,
        uptime_seconds=int(time.time() - STARTED_AT),
    )
