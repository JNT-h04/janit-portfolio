"""ECHO: send a meeting recording to Gemini and get back a structured minutes document.

Why Gemini and not Whisper: Gemini listens to the audio *and* understands it in
one call, so one request gives the transcript, the summary and the action items.
Running Whisper locally would mean a 1.5 GB download that free hosting can't run.

Nothing is written to disk here. The file is uploaded to Google, used once, and
deleted again in the `finally` block.
"""

import asyncio
import io
import logging
from collections.abc import Callable

from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field

from app.core.config import settings

log = logging.getLogger(__name__)

# Gemini needs a moment to process an uploaded recording before it can be used.
FILE_POLL_SECONDS = 1.0
FILE_TIMEOUT_SECONDS = 180

# Worth trying the next model for these: retired/unknown model, quota hit, overloaded.
FALLBACK_CODES = {404, 429, 500, 503}

PROMPT = """You are listening to a recording of a meeting.

Write the minutes. Rules:
- Identify each distinct voice and label them "Speaker 1", "Speaker 2", ... in the
  order they first talk. If someone says their own name, use that name instead.
- The transcript is a list of turns. Each turn is one speaker talking, with the
  time it starts as mm:ss.
- Clean up filler words ("um", "uh", false starts) but never change the meaning.
- The summary is 3 to 5 short sentences in plain English.
- Decisions are things the group actually settled. If none were made, return an empty list.
- Action items are tasks someone agreed to do. Put the person in "owner" ("unassigned"
  if nobody was named) and the deadline in "due" ("not stated" if nobody gave one).
- If the audio is silent or not speech, say so in the summary and return empty lists.
"""


class Turn(BaseModel):
    """One speaker talking, once."""

    speaker: str = Field(description='Who is talking, e.g. "Speaker 1" or "Priya"')
    start: str = Field(description="When this turn starts, as mm:ss")
    text: str = Field(description="What they said")


class ActionItem(BaseModel):
    task: str = Field(description="What needs doing")
    owner: str = Field(description='Who agreed to do it, or "unassigned"')
    due: str = Field(description='The deadline they gave, or "not stated"')


class Minutes(BaseModel):
    """The whole result. Gemini is told to fill in exactly this shape."""

    title: str = Field(description="A short title for this meeting, max 8 words")
    summary: str = Field(description="3 to 5 sentences of plain English")
    topics: list[str] = Field(description="The subjects discussed, 3 to 6 short phrases")
    decisions: list[str] = Field(description="What the group decided")
    actions: list[ActionItem] = Field(description="Tasks people agreed to do")
    transcript: list[Turn] = Field(description="The full conversation, in order")


CONFIG = types.GenerateContentConfig(
    # Asking for JSON in this exact shape means we never have to parse loose prose.
    response_mime_type="application/json",
    response_schema=Minutes,
)


class TranscribeError(RuntimeError):
    """Every model failed, or the upload did. The message is shown to the visitor."""


_client: genai.Client | None = None


def ready() -> bool:
    return bool(settings.gemini_api_key)


def _get_client() -> genai.Client:
    # Created on first use, then reused. Opening a new client per request is wasteful.
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def _upload(data: bytes, mime: str) -> types.File:
    """Hand the recording to Google and wait until it has finished processing it."""
    client = _get_client()
    uploaded = await client.aio.files.upload(
        file=io.BytesIO(data), config=types.UploadFileConfig(mime_type=mime)
    )
    waited = 0.0
    # A freshly uploaded recording is PROCESSING for a few seconds. Using it in that
    # state fails, so wait for ACTIVE before asking any model about it.
    while uploaded.state and uploaded.state.name == "PROCESSING":
        if waited >= FILE_TIMEOUT_SECONDS:
            raise TranscribeError("Google is taking too long to process this recording")
        await asyncio.sleep(FILE_POLL_SECONDS)
        waited += FILE_POLL_SECONDS
        uploaded = await client.aio.files.get(name=uploaded.name or "")
    if not uploaded.state or uploaded.state.name != "ACTIVE":
        raise TranscribeError("Google could not read this recording. Is it really audio?")
    return uploaded


async def transcribe(data: bytes, mime: str, on_step: Callable[[str], None] | None = None) -> Minutes:
    """Upload the recording, then ask each model in turn until one answers."""
    note = on_step or (lambda _step: None)

    note("uploading")
    uploaded = await _upload(data, mime)

    try:
        note("listening")
        last_error = ""
        # Google retires model names and some are overloaded at busy times, so try
        # each configured model in turn until one answers.
        for model in settings.gemini_models:
            try:
                res = await _get_client().aio.models.generate_content(
                    model=model, contents=[uploaded, PROMPT], config=CONFIG
                )
                minutes = res.parsed
                if not isinstance(minutes, Minutes):
                    raise TranscribeError("the model replied in a shape we can't read")
                return minutes
            except errors.APIError as exc:
                if exc.code not in FALLBACK_CODES:
                    raise TranscribeError(f"{exc.code} {exc.status}") from exc
                log.warning("model %s failed with %s, trying the next one", model, exc.code)
                last_error = f"{exc.code} {exc.status}"
        raise TranscribeError(f"all models are busy right now ({last_error}). try again in a minute")
    finally:
        # The visitor's recording does not stay on Google's servers after we're done.
        try:
            await _get_client().aio.files.delete(name=uploaded.name or "")
        except Exception:  # deleting is best-effort; the file expires in 48h anyway
            log.warning("could not delete uploaded file %s", uploaded.name)
