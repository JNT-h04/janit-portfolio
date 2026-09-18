"""CORTEX: upload a brain MRI slice, get a dementia-stage guess and a Grad-CAM heatmap."""

from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.images import decode, to_data_url
from app.core.ratelimit import RateLimit
from app.cortex import model

router = APIRouter(prefix="/cortex", tags=["cortex"])

MAX_BYTES = 10 * 1024 * 1024
SAMPLES = settings.data_dir / "cortex_samples"
SERIES = settings.data_dir / "cortex_series"  # folders of slices, one folder per patient


class Status(BaseModel):
    state: str
    detail: str
    load_seconds: float | None
    classes: list[str] = []
    excluded: list[str] = []


class SliceResult(BaseModel):
    name: str
    prediction: str
    confidence: float


class SeriesAnalysis(BaseModel):
    """What several slices of the same patient say together."""

    prediction: str
    confidence: float
    probabilities: dict[str, float]
    agreement: float  # share of slices that voted for the consensus
    slices: list[SliceResult]
    best_slice: str  # the slice that supported the consensus most strongly
    input_image: str
    overlay_image: str
    focus: str


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


class Series(BaseModel):
    """A patient folder: several slices of the same person."""

    id: str
    label: str  # the true diagnosis, so visitors can check the model
    slices: list[str]


@router.get("/series", response_model=list[Series])
def list_series() -> list[Series]:
    LABELS = {"mild": "Mild Dementia", "non-demented": "Non Demented", "very-mild": "Very mild Dementia"}
    out = []
    for folder in sorted(p for p in SERIES.glob("*") if p.is_dir()):
        label, _, _ = folder.name.partition("__")
        out.append(
            Series(
                id=folder.name,
                label=LABELS.get(label, label),
                slices=sorted(f"/api/cortex/series/{folder.name}/{f.name}" for f in folder.glob("*.jpg")),
            )
        )
    return out


@router.get("/series/{folder}/{name}")
def get_series_slice(folder: str, name: str) -> FileResponse:
    path = SERIES / Path(folder).name / Path(name).name
    if not path.is_file():
        raise HTTPException(404, "no such slice")
    return FileResponse(path)


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


MAX_SLICES = 12


@router.post("/analyze-series", response_model=SeriesAnalysis, dependencies=[Depends(RateLimit(limit=20, window=3600))])
def analyze_series(files: list[UploadFile] = File(...)) -> SeriesAnalysis:
    """Average the per-slice probabilities, the way a reader looks at a whole scan.

    On the held-out test set this lifts accuracy from 58% (single slice) to
    ~82% (all slices of a patient), so it is worth the extra upload.
    """
    if model.slot.state != "ready":
        raise HTTPException(503, "model is warming up, try again in a few seconds")
    if not files:
        raise HTTPException(422, "no files uploaded")
    if len(files) > MAX_SLICES:
        raise HTTPException(413, f"too many slices (max {MAX_SLICES})")

    per_slice: list[SliceResult] = []
    totals: dict[str, float] = {}
    best = None  # (score for the consensus class, name, image, cam)
    images: list[tuple[str, np.ndarray, dict[str, float], np.ndarray]] = []

    for upload in files:
        data = upload.file.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise HTTPException(413, "one of the images is too large (max 10 MB)")
        try:
            img = decode(data)
        except ValueError as exc:
            raise HTTPException(422, f"{upload.filename}: {exc}") from exc
        probs, cam = model.predict_with_cam(img)
        name = Path(upload.filename or "slice").name
        images.append((name, img, probs, cam))
        for key, value in probs.items():
            totals[key] = totals.get(key, 0.0) + value
        top = max(probs, key=lambda k: probs[k])
        per_slice.append(SliceResult(name=name, prediction=top, confidence=probs[top]))

    count = len(images)
    averaged = {k: round(v / count, 4) for k, v in totals.items()}
    consensus = max(averaged, key=lambda k: averaged[k])
    agreement = sum(1 for s in per_slice if s.prediction == consensus) / count

    for name, img, probs, cam in images:  # the slice most sure about the consensus
        score = probs[consensus]
        if best is None or score > best[0]:
            best = (score, name, img, cam)
    _, best_name, best_img, best_cam = best  # type: ignore[misc]

    heat = _colourise(best_cam, best_img.shape[:2])
    overlay = cv2.addWeighted(best_img, 0.55, heat, 0.45, 0)
    return SeriesAnalysis(
        prediction=consensus,
        confidence=averaged[consensus],
        probabilities=averaged,
        agreement=round(agreement, 3),
        slices=per_slice,
        best_slice=best_name,
        input_image=to_data_url(best_img),
        overlay_image=to_data_url(overlay),
        focus=_describe_focus(best_cam),
    )
