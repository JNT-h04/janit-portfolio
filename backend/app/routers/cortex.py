"""CORTEX: upload a brain MRI slice, get a dementia-stage guess and a Grad-CAM heatmap."""

from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.images import decode, to_data_url
from app.core.ratelimit import RateLimit
from app.cortex import model

router = APIRouter(prefix="/cortex", tags=["cortex"])

MAX_BYTES = 10 * 1024 * 1024
SAMPLES = settings.data_dir / "cortex_samples"


class Status(BaseModel):
    state: str
    detail: str
    load_seconds: float | None
    classes: list[str] = []
    excluded: list[str] = []


class Analysis(BaseModel):
    prediction: str
    confidence: float
    probabilities: dict[str, float]
    excluded: list[str]
    input_image: str
    heatmap_image: str
    overlay_image: str
    focus: str  # where in the scan the heat is concentrated


@router.get("/status", response_model=Status)
def status() -> Status:
    s = model.slot
    loaded = s.state == "ready"
    return Status(
        state=s.state,
        detail=s.detail,
        load_seconds=s.load_seconds,
        classes=s.model.classes if loaded else [],
        excluded=s.model.dropped if loaded else [],
    )


@router.get("/samples")
def list_samples() -> list[str]:
    return sorted(p.name for p in SAMPLES.glob("*.jpg"))


@router.get("/samples/{name}")
def get_sample(name: str) -> FileResponse:
    path = SAMPLES / Path(name).name  # .name strips any "../"
    if not path.is_file():
        raise HTTPException(404, "no such sample")
    return FileResponse(path)


def _describe_focus(cam: np.ndarray) -> str:
    """Say roughly where the hot region sits, in plain words."""
    h, w = cam.shape
    ys, xs = np.mgrid[0:h, 0:w]
    total = cam.sum()
    if total <= 0:
        return "no clear focus"
    cy, cx = (cam * ys).sum() / total / h, (cam * xs).sum() / total / w
    vertical = "upper" if cy < 0.4 else "lower" if cy > 0.6 else "middle"
    horizontal = "left" if cx < 0.4 else "right" if cx > 0.6 else "central"
    return f"{vertical} {horizontal} region"


def _colourise(cam: np.ndarray, shape: tuple[int, int]) -> np.ndarray:
    big = cv2.resize(cam, (shape[1], shape[0]))
    heat = cv2.applyColorMap((big * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
    return cv2.cvtColor(heat, cv2.COLOR_BGR2RGB)


@router.post("/analyze", response_model=Analysis, dependencies=[Depends(RateLimit(limit=60, window=3600))])
def analyze(file: UploadFile) -> Analysis:
    if model.slot.state != "ready":
        message = {
            "loading": "model is warming up, try again in a few seconds",
            "missing": "the MRI model isn't deployed on this server",
        }.get(model.slot.state, f"model unavailable ({model.slot.detail or model.slot.state})")
        raise HTTPException(503, message)

    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "image too large (max 10 MB)")
    try:
        img = decode(data)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    probs, cam = model.predict_with_cam(img)
    prediction = max(probs, key=lambda k: probs[k])

    heat = _colourise(cam, img.shape[:2])
    overlay = cv2.addWeighted(img, 0.55, heat, 0.45, 0)
    return Analysis(
        prediction=prediction,
        confidence=probs[prediction],
        probabilities=probs,
        excluded=model.slot.model.dropped,
        input_image=to_data_url(img),
        heatmap_image=to_data_url(heat),
        overlay_image=to_data_url(overlay),
        focus=_describe_focus(cam),
    )
