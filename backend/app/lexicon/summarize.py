"""Ask Gemini to summarise one chapter, streaming the answer as it's written."""

import logging
from collections.abc import AsyncIterator

from google import genai
from google.genai import errors, types

from app.core.config import settings

log = logging.getLogger(__name__)

MAX_CHARS = 60_000  # ~15k tokens: plenty for a chapter, and keeps each call fast and cheap

# Summaries don't need deep reasoning; low thinking answers several times faster.
CONFIG = types.GenerateContentConfig(thinking_config=types.ThinkingConfig(thinking_level="low"))

# Worth trying the next model for these: retired/unknown model, quota hit, overloaded.
FALLBACK_CODES = {404, 429, 500, 503}

PROMPT = """You are summarising one chapter of the book "{book}".
Chapter: "{chapter}"

Write in this exact markdown layout and nothing else:

## Summary
Two short paragraphs in simple words, as if explaining to a first-year college student.

## Key insights
- 3 to 5 bullet points, each one sentence.

## Flashcards
Q: a question testing an important idea
A: its short answer
(write exactly 8 Q/A pairs, like likely exam questions, each Q and A on its own line)

Chapter text{note}:
\"\"\"
{text}
\"\"\"
"""


class SummaryError(RuntimeError):
    """Every model failed. The message is shown to the visitor."""


_client: genai.Client | None = None


def ready() -> bool:
    return bool(settings.gemini_api_key)


def _get_client() -> genai.Client:
    # Created on first use, then reused. Opening a new client per request is wasteful.
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def summarize(book: str, chapter: str, text: str) -> AsyncIterator[str]:
    note = " (truncated to fit)" if len(text) > MAX_CHARS else ""
    prompt = PROMPT.format(book=book, chapter=chapter, note=note, text=text[:MAX_CHARS])

    last_error = ""
    # Google retires model names and some are overloaded at busy times, so try
    # each configured model in turn until one starts answering.
    for model in settings.gemini_models:
        started = False
        try:
            stream = await _get_client().aio.models.generate_content_stream(
                model=model, contents=prompt, config=CONFIG
            )
            async for chunk in stream:
                if chunk.text:
                    started = True
                    yield chunk.text
            return
        except errors.APIError as exc:
            # Once text has reached the visitor we can't switch models mid-answer.
            if started or exc.code not in FALLBACK_CODES:
                raise SummaryError(f"{exc.code} {exc.status}") from exc
            log.warning("model %s failed with %s, trying the next one", model, exc.code)
            last_error = f"{exc.code} {exc.status}"
    raise SummaryError(f"all models are busy right now ({last_error}). try again in a minute")
