"""FRACTURE: upload a photo of concrete, get crack severity plus a visual analysis."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.ratelimit import RateLimit
from app.fracture import analysis, model

router = APIRouter(prefix="/fracture", tags=["fracture"])

MAX_BYTES = 10 * 1024 * 1024
SAMPLES = settings.data_dir / "fracture_samples"


class Status(BaseModel):
    state: str  # idle | loading | ready | missing | error
    detail: str
    load_seconds: float | None


class Analysis(BaseModel):
    severity: str
    confidence: float
    probabilities: dict[str, float]
    intensity: float
    age: str
    cause: str
    angle: float | None
    advice: str
    edges_image: str  # data URLs, ready for <img src>
    lines_image: str


@router.get("/status", response_model=Status)
def status() -> Status:
    s = model.slot
    return Status(state=s.state, detail=s.detail, load_seconds=s.load_seconds)


@router.get("/samples")
def list_samples() -> list[str]:
    return sorted(p.name for p in SAMPLES.glob("*.jpg"))


@router.get("/samples/{name}")
def get_sample(name: str) -> FileResponse:
    # Path(name).name drops any "../" so nobody can read files outside the folder.
    path = SAMPLES / Path(name).name
    if not path.is_file():
        raise HTTPException(404, "no such sample")
    return FileResponse(path)


# A plain `def` (not `async def`): FastAPI runs it in a worker thread, so the
# slow model call doesn't freeze the server for everyone else meanwhile.
@router.post("/analyze", response_model=Analysis, dependencies=[Depends(RateLimit(limit=60, window=3600))])
def analyze(file: UploadFile) -> Analysis:
    if model.slot.state != "ready":
        message = {
            "loading": "model is warming up, try again in a few seconds",
            "missing": "the crack model isn't deployed on this server",
        }.get(model.slot.state, f"model unavailable ({model.slot.detail or model.slot.state})")
        raise HTTPException(503, message)

    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "image too large (max 10 MB)")
    try:
        img = analysis.decode(data)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    probs = model.predict(img)
    severity = max(probs, key=lambda k: probs[k])
    edge_map = analysis.edges(img)
    cause, overlay, angle = analysis.cause_and_overlay(img, edge_map)
    return Analysis(
        severity=severity,
        confidence=probs[severity],
        probabilities=probs,
        intensity=analysis.intensity(edge_map),
        age=analysis.age(edge_map),
        cause=cause,
        angle=round(angle, 1) if angle is not None else None,
        advice=analysis.ADVICE[severity],
        edges_image=analysis.to_data_url(analysis.edges_as_neon(edge_map)),
        lines_image=analysis.to_data_url(overlay),
    )
