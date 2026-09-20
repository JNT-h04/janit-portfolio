"""ECHO: upload a meeting recording, then poll a job until the minutes are ready.

Why a job instead of one request: transcribing a 40-minute meeting takes far
longer than a browser will wait before giving up. So the upload returns a job id
straight away and a background task does the slow part. The page then asks
"is job X done yet?" every couple of seconds. That pattern has a name:
**job submission + status polling**, and it is how every long AI task is served.
"""

import asyncio
import time
import uuid
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.ratelimit import RateLimit
from app.echo import transcribe
from app.echo.transcribe import Minutes

router = APIRouter(prefix="/echo", tags=["echo"])

MAX_BYTES = 100 * 1024 * 1024
JOB_TTL = 60 * 60  # finished jobs are forgotten after an hour
MAX_JOBS = 50

# What Gemini can actually listen to. A meeting recording is usually m4a or mp4.
ALLOWED_MIME = {
    "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a",
    "audio/x-m4a", "audio/aac", "audio/ogg", "audio/flac", "audio/webm",
    "video/mp4", "video/webm", "video/quicktime",
}
# Browsers sometimes send no mime type, so fall back to the file extension.
EXT_MIME = {
    "wav": "audio/wav", "mp3": "audio/mpeg", "m4a": "audio/mp4", "mp4": "audio/mp4",
    "aac": "audio/aac", "ogg": "audio/ogg", "flac": "audio/flac", "webm": "audio/webm",
    "mov": "video/quicktime",
}

Stage = Literal["queued", "uploading", "listening", "done", "error"]

# Jobs live in memory only. Nothing a visitor uploads is written to disk.
_jobs: dict[str, "Job"] = {}

# Each transcription costs real money, so a visitor gets 5 an hour. Named rather
# than written inline so the tests can reset it between cases.
upload_limit = RateLimit(limit=5, window=3600)


class Job(BaseModel):
    id: str
    filename: str
    stage: Stage = "queued"
    # Rough progress for the bar on the page. The real work has no percentage,
    # so these are honest milestones, not a guess at how much is left.
    percent: int = 5
    seconds: float = 0.0
    error: str = ""
    minutes: Minutes | None = None
    created: float = 0.0


class Status(BaseModel):
    ready: bool


class Accepted(BaseModel):
    id: str


def _forget_old() -> None:
    now = time.time()
    for key in [k for k, j in _jobs.items() if now - j.created > JOB_TTL]:
        del _jobs[key]
    while len(_jobs) >= MAX_JOBS:  # dicts keep insertion order: drop the oldest
        del _jobs[next(iter(_jobs))]


def _guess_mime(file: UploadFile) -> str:
    if file.content_type in ALLOWED_MIME:
        return file.content_type
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    mime = EXT_MIME.get(ext, "")
    if not mime:
        raise HTTPException(415, f"can't read '{file.filename}'. use wav, mp3, m4a, mp4, ogg or flac")
    return mime


async def _run(job: Job, data: bytes, mime: str) -> None:
    """The slow part. Runs after the upload response has already been sent."""
    started = time.time()
    percent = {"uploading": 20, "listening": 55}

    def step(stage: str) -> None:
        job.stage = stage  # type: ignore[assignment]
        job.percent = percent.get(stage, job.percent)

    try:
        job.minutes = await transcribe.transcribe(data, mime, on_step=step)
        job.stage = "done"
        job.percent = 100
    except transcribe.TranscribeError as exc:
        job.stage, job.error = "error", str(exc)
    except asyncio.CancelledError:
        job.stage, job.error = "error", "the server stopped this job"
        raise
    except Exception as exc:  # never leak a stack trace to a visitor
        job.stage, job.error = "error", f"unexpected failure ({exc.__class__.__name__})"
    finally:
        job.seconds = round(time.time() - started, 1)


@router.get("/status", response_model=Status)
def status() -> Status:
    return Status(ready=transcribe.ready())


@router.post("/jobs", response_model=Accepted, status_code=202, dependencies=[Depends(upload_limit)])
async def submit(file: UploadFile, background: BackgroundTasks) -> Accepted:
    """Take the recording and answer immediately with a job id. 202 means 'accepted, not finished'."""
    if not transcribe.ready():
        raise HTTPException(503, "ECHO is offline: GEMINI_API_KEY is not set on the server")
    mime = _guess_mime(file)
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "recording too large (max 100 MB)")
    if not data:
        raise HTTPException(422, "that file is empty")

    _forget_old()
    job = Job(id=uuid.uuid4().hex, filename=file.filename or "recording", created=time.time())
    _jobs[job.id] = job
    # FastAPI runs this *after* the 202 response has gone back to the browser.
    background.add_task(_run, job, data, mime)
    return Accepted(id=job.id)


@router.get("/jobs/{job_id}", response_model=Job)
def job_status(job_id: str) -> Job:
    """The page calls this every couple of seconds until stage is done or error."""
    job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(404, "job not found or expired. upload the recording again")
    return job
