"""A worked example of a route. Copy this pattern for Mission 1."""

import time
from pathlib import Path

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
    # Resident memory now and at its highest since start, in MB. Read from
    # /proc, so only on Linux (the host); None elsewhere. The free host stops
    # the process at 512 MB, and this is the only way to see how close it is.
    memory_mb: int | None = None
    peak_memory_mb: int | None = None


def _memory() -> tuple[int | None, int | None]:
    try:
        lines = Path("/proc/self/status").read_text().splitlines()
    except OSError:
        return None, None
    kb = {k: int(v.split()[0]) for k, _, v in (line.partition(":") for line in lines) if k in ("VmRSS", "VmHWM")}
    return kb.get("VmRSS", 0) // 1024, kb.get("VmHWM", 0) // 1024


@router.get("/health", response_model=Health)
def health() -> Health:
    memory_mb, peak_memory_mb = _memory()
    return Health(
        status="online",
        version=settings.version,
        uptime_seconds=int(time.time() - STARTED_AT),
        memory_mb=memory_mb,
        peak_memory_mb=peak_memory_mb,
    )
